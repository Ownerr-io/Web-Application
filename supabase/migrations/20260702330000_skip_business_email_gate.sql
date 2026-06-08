-- Business email verification deferred (three mandatory gates: revenue, domain, identity).

BEGIN;

ALTER TABLE public.listing_verification_gates
  ALTER COLUMN business_email_status SET DEFAULT 'not_required';

ALTER TABLE public.listing_verification_gates
  DROP CONSTRAINT IF EXISTS listing_verification_gates_business_email_status_check;

ALTER TABLE public.listing_verification_gates
  ADD CONSTRAINT listing_verification_gates_business_email_status_check CHECK (
    business_email_status IN (
      'pending',
      'verified',
      'failed',
      'manual_review',
      'not_required'
    )
  );

UPDATE public.listing_verification_gates
SET business_email_status = 'not_required', updated_at = now()
WHERE business_email_status IN ('pending', 'failed', 'manual_review')
   OR business_email_status IS NULL;

CREATE OR REPLACE FUNCTION public.listing_mandatory_gates_pass(p_startup_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.listing_verification_gates g
    WHERE g.startup_id = p_startup_id
      AND g.identity_status = 'verified'
      AND g.domain_status = 'verified'
      AND g.revenue_status = 'verified'
      AND COALESCE(g.verified_mrr, 0) > 0
  );
$$;

CREATE OR REPLACE FUNCTION public.sync_listing_lifecycle(p_startup_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g public.listing_verification_gates%ROWTYPE;
  v_lifecycle text;
  v_failed boolean;
  v_current text;
BEGIN
  PERFORM public.ensure_listing_gates_row(p_startup_id);
  SELECT * INTO g FROM public.listing_verification_gates WHERE startup_id = p_startup_id;
  SELECT listing_lifecycle INTO v_current FROM public.startups WHERE id = p_startup_id;

  IF v_current = 'suspended' THEN
    RETURN 'suspended';
  END IF;

  IF v_current = 'published' THEN
    IF public.listing_fraud_blocks_publish(g.fraud_risk)
       OR NOT public.listing_mandatory_gates_pass(p_startup_id) THEN
      PERFORM public.unpublish_listing_internal(p_startup_id, 'mandatory_gates_lapsed');
      v_current := 'verification_required';
    ELSE
      RETURN 'published';
    END IF;
  END IF;

  v_failed := g.identity_status = 'failed'
    OR g.domain_status = 'failed'
    OR g.revenue_status = 'failed';

  IF v_failed THEN
    v_lifecycle := 'verification_failed';
  ELSIF public.listing_mandatory_gates_pass(p_startup_id) THEN
    v_lifecycle := 'verified';
  ELSIF g.submitted_for_review_at IS NOT NULL
    OR g.identity_status = 'pending'
    OR g.domain_status = 'pending'
    OR g.revenue_status IN ('pending', 'partial') THEN
    v_lifecycle := 'verification_in_progress';
  ELSE
    v_lifecycle := COALESCE(NULLIF(v_current, 'published'), 'draft');
  END IF;

  PERFORM public.ownerr_bypass_startup_guard();
  UPDATE public.startups SET listing_lifecycle = v_lifecycle, updated_at = now()
  WHERE id = p_startup_id;

  RETURN v_lifecycle;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_listing_gates_from_evidence(p_startup_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain_pass boolean := false;
  v_domain_pending boolean := false;
  v_latest_domain_status text;
  v_rev_pass boolean := false;
  v_mrr numeric := 0;
  v_arr numeric := 0;
  v_domain text;
  v_identity public.identity_verification_sessions%ROWTYPE;
  v_email public.business_email_verifications%ROWTYPE;
  v_reg_approved boolean := false;
  v_revenue_connection_active boolean := false;
  v_identity_verified boolean := false;
  v_email_verified boolean := false;
BEGIN
  PERFORM public.ensure_listing_gates_row(p_startup_id);

  SELECT EXISTS (
    SELECT 1 FROM public.verification_results r
    WHERE r.startup_id = p_startup_id AND r.dimension = 'domain'
      AND r.status = 'pass'
      AND (r.valid_until IS NULL OR r.valid_until > now())
  ) AND NOT EXISTS (
    SELECT 1 FROM public.domain_verification_challenges c
    WHERE c.startup_id = p_startup_id
      AND c.status = 'pending'
      AND c.expires_at <= now()
  ) INTO v_domain_pass;

  SELECT EXISTS (
    SELECT 1 FROM public.domain_verification_challenges c
    WHERE c.startup_id = p_startup_id
      AND c.status = 'pending'
      AND c.expires_at > now()
  ) INTO v_domain_pending;

  SELECT r.status INTO v_latest_domain_status
  FROM public.verification_results r
  WHERE r.startup_id = p_startup_id AND r.dimension = 'domain'
  ORDER BY r.computed_at DESC
  LIMIT 1;

  SELECT EXISTS (
    SELECT 1 FROM public.integration_connections ic
    JOIN public.verification_providers vp ON vp.id = ic.provider_id
    WHERE ic.startup_id = p_startup_id
      AND ic.status IN ('connected', 'pending')
      AND vp.category = 'revenue'
  ) INTO v_revenue_connection_active;

  SELECT EXISTS (
    SELECT 1 FROM public.verification_results r
    WHERE r.startup_id = p_startup_id AND r.dimension = 'revenue'
      AND r.status = 'pass'
      AND (r.valid_until IS NULL OR r.valid_until > now())
  ) AND v_revenue_connection_active INTO v_rev_pass;

  IF v_rev_pass THEN
    SELECT COALESCE(SUM(mrr), 0), COALESCE(SUM(arr), 0)
    INTO v_mrr, v_arr
    FROM public.financial_metrics
    WHERE startup_id = p_startup_id;
  ELSE
    v_mrr := 0;
    v_arr := 0;
  END IF;

  SELECT domain INTO v_domain
  FROM public.domain_verification_challenges
  WHERE startup_id = p_startup_id AND status = 'verified'
  ORDER BY verified_at DESC NULLS LAST
  LIMIT 1;

  SELECT * INTO v_identity
  FROM public.identity_verification_sessions
  WHERE startup_id = p_startup_id
  ORDER BY created_at DESC
  LIMIT 1;

  v_identity_verified := v_identity.id IS NOT NULL
    AND v_identity.status = 'verified'
    AND v_identity.verified_at IS NOT NULL
    AND v_identity.verified_at > now() - interval '365 days';

  SELECT * INTO v_email
  FROM public.business_email_verifications
  WHERE startup_id = p_startup_id AND status = 'verified'
  ORDER BY verified_at DESC NULLS LAST
  LIMIT 1;

  v_email_verified := v_email.id IS NOT NULL
    AND v_email.status = 'verified'
    AND v_email.verified_at IS NOT NULL
    AND v_email.verified_at > now() - interval '90 days';

  SELECT EXISTS (
    SELECT 1 FROM public.business_registration_documents d
    WHERE d.startup_id = p_startup_id AND d.status = 'approved'
  ) INTO v_reg_approved;

  UPDATE public.listing_verification_gates g SET
    domain_status = CASE
      WHEN v_domain_pass THEN 'verified'
      WHEN v_domain_pending THEN 'pending'
      WHEN v_latest_domain_status = 'fail' THEN 'failed'
      ELSE 'pending'
    END,
    domain_verified_at = CASE WHEN v_domain_pass THEN COALESCE(g.domain_verified_at, now()) ELSE NULL END,
    verified_domain = CASE WHEN v_domain_pass THEN COALESCE(v_domain, g.verified_domain) ELSE NULL END,
    revenue_status = CASE
      WHEN v_rev_pass AND v_mrr > 0 THEN 'verified'
      WHEN v_rev_pass THEN 'partial'
      WHEN NOT v_revenue_connection_active AND g.revenue_status = 'verified' THEN 'pending'
      WHEN EXISTS (
        SELECT 1 FROM public.verification_results r
        WHERE r.startup_id = p_startup_id AND r.dimension = 'revenue' AND r.status = 'fail'
      ) THEN 'failed'
      ELSE COALESCE(g.revenue_status, 'pending')
    END,
    revenue_verified_at = CASE
      WHEN v_rev_pass AND v_mrr > 0 THEN COALESCE(g.revenue_verified_at, now()) ELSE NULL END,
    verified_mrr = CASE WHEN v_rev_pass AND v_mrr > 0 THEN v_mrr ELSE 0 END,
    verified_arr = CASE WHEN v_rev_pass AND v_mrr > 0 THEN v_arr ELSE 0 END,
    identity_status = CASE
      WHEN v_identity.id IS NULL THEN COALESCE(g.identity_status, 'pending')
      WHEN v_identity_verified THEN 'verified'
      WHEN v_identity.status = 'failed' THEN 'failed'
      WHEN v_identity.status = 'verified' AND NOT v_identity_verified THEN 'pending'
      ELSE 'pending'
    END,
    identity_verified_at = CASE
      WHEN v_identity_verified THEN COALESCE(v_identity.verified_at, now())
      ELSE NULL
    END,
    business_email_status = CASE
      WHEN v_email_verified THEN 'verified'
      ELSE 'not_required'
    END,
    business_email = CASE WHEN v_email_verified THEN COALESCE(v_email.email, g.business_email) ELSE g.business_email END,
    business_email_verified_at = CASE
      WHEN v_email_verified THEN COALESCE(v_email.verified_at, now())
      ELSE NULL
    END,
    registration_status = CASE
      WHEN v_reg_approved THEN 'verified'
      ELSE 'not_required'
    END,
    registration_verified_at = CASE WHEN v_reg_approved THEN COALESCE(g.registration_verified_at, now()) ELSE NULL END,
    updated_at = now()
  WHERE g.startup_id = p_startup_id;

  PERFORM public.run_listing_fraud_engine(p_startup_id);
  PERFORM public.sync_listing_lifecycle(p_startup_id);
  PERFORM public.recompute_listing_trust_v2(p_startup_id);
  PERFORM public.try_auto_publish_listing(p_startup_id);
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
