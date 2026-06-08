-- Business registration documents deferred: four mandatory gates for auto-publish.

BEGIN;

ALTER TABLE public.listing_verification_gates
  ALTER COLUMN registration_status SET DEFAULT 'not_required';

ALTER TABLE public.listing_verification_gates
  DROP CONSTRAINT IF EXISTS listing_verification_gates_registration_status_check;

ALTER TABLE public.listing_verification_gates
  ADD CONSTRAINT listing_verification_gates_registration_status_check CHECK (
    registration_status IN (
      'pending',
      'verified',
      'failed',
      'review_required',
      'not_required'
    )
  );

UPDATE public.listing_verification_gates
SET registration_status = 'not_required', updated_at = now()
WHERE registration_status IN ('pending', 'review_required', 'failed')
  OR registration_status IS NULL;

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
      AND g.business_email_status = 'verified'
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
BEGIN
  PERFORM public.ensure_listing_gates_row(p_startup_id);
  SELECT * INTO g FROM public.listing_verification_gates WHERE startup_id = p_startup_id;

  IF (SELECT listing_lifecycle FROM public.startups WHERE id = p_startup_id) = 'suspended' THEN
    RETURN 'suspended';
  END IF;

  IF (SELECT listing_lifecycle FROM public.startups WHERE id = p_startup_id) = 'published' THEN
    RETURN 'published';
  END IF;

  v_failed := g.identity_status = 'failed'
    OR g.domain_status = 'failed'
    OR g.business_email_status = 'failed'
    OR g.revenue_status = 'failed';

  IF v_failed THEN
    v_lifecycle := 'verification_failed';
  ELSIF public.listing_mandatory_gates_pass(p_startup_id) THEN
    v_lifecycle := 'verified';
  ELSIF g.submitted_for_review_at IS NOT NULL
    OR g.identity_status = 'pending'
    OR g.domain_status = 'pending'
    OR g.business_email_status = 'pending'
    OR g.revenue_status IN ('pending', 'partial') THEN
    v_lifecycle := 'verification_in_progress';
  ELSE
    v_lifecycle := COALESCE(
      NULLIF((SELECT listing_lifecycle FROM public.startups WHERE id = p_startup_id), 'published'),
      'draft'
    );
  END IF;

  UPDATE public.startups SET listing_lifecycle = v_lifecycle, updated_at = now()
  WHERE id = p_startup_id;

  RETURN v_lifecycle;
END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_listing_trust_v2(p_startup_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g public.listing_verification_gates%ROWTYPE;
  v_score numeric := 0;
  v_level text;
  v_breakdown jsonb := '{}'::jsonb;
  v_history numeric := 0;
  v_fraud numeric := 0;
BEGIN
  SELECT * INTO g FROM public.listing_verification_gates WHERE startup_id = p_startup_id;
  IF NOT FOUND THEN
    PERFORM public.ensure_listing_gates_row(p_startup_id);
    SELECT * INTO g FROM public.listing_verification_gates WHERE startup_id = p_startup_id;
  END IF;

  IF g.identity_status = 'verified' THEN
    v_score := v_score + 20;
    v_breakdown := v_breakdown || jsonb_build_object('identity', 20);
  END IF;
  IF g.domain_status = 'verified' THEN
    v_score := v_score + 20;
    v_breakdown := v_breakdown || jsonb_build_object('domain', 20);
  END IF;
  IF g.business_email_status = 'verified' THEN
    v_score := v_score + 15;
    v_breakdown := v_breakdown || jsonb_build_object('business_email', 15);
  END IF;
  IF g.revenue_status = 'verified' AND COALESCE(g.verified_mrr, 0) > 0 THEN
    v_score := v_score + 30;
    v_breakdown := v_breakdown || jsonb_build_object('revenue', 30);
  END IF;
  IF g.registration_status = 'verified' THEN
    v_score := v_score + 15;
    v_breakdown := v_breakdown || jsonb_build_object('registration', 15);
  END IF;

  SELECT LEAST(10, GREATEST(0,
    EXTRACT(EPOCH FROM (now() - u.created_at)) / (86400.0 * 365) * 5
  )) INTO v_history
  FROM public.startups s
  JOIN auth.users u ON u.id = s.founder_user_id
  WHERE s.id = p_startup_id;

  SELECT COUNT(*) * 2 INTO v_fraud
  FROM public.listing_fraud_signals
  WHERE startup_id = p_startup_id AND severity IN ('medium', 'high');

  v_history := GREATEST(0, COALESCE(v_history, 0) - v_fraud);
  v_score := v_score + v_history;
  v_breakdown := v_breakdown || jsonb_build_object('platform_history', v_history);

  v_level := CASE
    WHEN v_score >= 85 THEN 'elite'
    WHEN v_score >= 65 THEN 'trusted'
    WHEN v_score >= 45 THEN 'verified'
    WHEN v_score >= 25 THEN 'basic'
    ELSE 'unverified'
  END;

  INSERT INTO public.trust_scores (startup_id, score, level, breakdown, computed_at)
  VALUES (p_startup_id, v_score, v_level, v_breakdown, now())
  ON CONFLICT (startup_id) DO UPDATE SET
    score = EXCLUDED.score,
    level = EXCLUDED.level,
    breakdown = EXCLUDED.breakdown,
    computed_at = now();

  INSERT INTO public.trust_score_history (startup_id, score, level, breakdown, trigger)
  VALUES (p_startup_id, v_score, v_level, v_breakdown, 'listing_trust_v2');

  UPDATE public.startups SET verified = public.listing_mandatory_gates_pass(p_startup_id)
  WHERE id = p_startup_id;

  RETURN jsonb_build_object('score', v_score, 'level', v_level, 'breakdown', v_breakdown);
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
  v_rev_pass boolean := false;
  v_mrr numeric := 0;
  v_arr numeric := 0;
  v_domain text;
  v_identity public.identity_verification_sessions%ROWTYPE;
  v_email public.business_email_verifications%ROWTYPE;
  v_reg_approved boolean := false;
BEGIN
  PERFORM public.ensure_listing_gates_row(p_startup_id);

  SELECT EXISTS (
    SELECT 1 FROM public.verification_results r
    WHERE r.startup_id = p_startup_id AND r.dimension = 'domain'
      AND r.status = 'pass'
      AND (r.valid_until IS NULL OR r.valid_until > now())
  ) INTO v_domain_pass;

  SELECT EXISTS (
    SELECT 1 FROM public.verification_results r
    WHERE r.startup_id = p_startup_id AND r.dimension = 'revenue'
      AND r.status = 'pass'
      AND (r.valid_until IS NULL OR r.valid_until > now())
  ) INTO v_rev_pass;

  SELECT COALESCE(SUM(mrr), 0), COALESCE(SUM(arr), 0)
  INTO v_mrr, v_arr
  FROM public.financial_metrics
  WHERE startup_id = p_startup_id;

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

  SELECT * INTO v_email
  FROM public.business_email_verifications
  WHERE startup_id = p_startup_id
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT EXISTS (
    SELECT 1 FROM public.business_registration_documents d
    WHERE d.startup_id = p_startup_id AND d.status = 'approved'
  ) INTO v_reg_approved;

  UPDATE public.listing_verification_gates g SET
    domain_status = CASE
      WHEN v_domain_pass THEN 'verified'
      WHEN EXISTS (
        SELECT 1 FROM public.verification_results r
        WHERE r.startup_id = p_startup_id AND r.dimension = 'domain' AND r.status = 'fail'
      ) THEN 'failed'
      ELSE g.domain_status
    END,
    domain_verified_at = CASE WHEN v_domain_pass THEN COALESCE(g.domain_verified_at, now()) ELSE g.domain_verified_at END,
    verified_domain = COALESCE(v_domain, g.verified_domain),
    revenue_status = CASE
      WHEN v_rev_pass AND v_mrr > 0 THEN 'verified'
      WHEN v_rev_pass THEN 'partial'
      WHEN EXISTS (
        SELECT 1 FROM public.verification_results r
        WHERE r.startup_id = p_startup_id AND r.dimension = 'revenue' AND r.status = 'fail'
      ) THEN 'failed'
      ELSE g.revenue_status
    END,
    revenue_verified_at = CASE
      WHEN v_rev_pass AND v_mrr > 0 THEN COALESCE(g.revenue_verified_at, now()) ELSE g.revenue_verified_at
    END,
    verified_mrr = CASE WHEN v_rev_pass THEN v_mrr ELSE g.verified_mrr END,
    verified_arr = CASE WHEN v_rev_pass THEN v_arr ELSE g.verified_arr END,
    identity_status = CASE
      WHEN v_identity.id IS NULL THEN g.identity_status
      WHEN v_identity.status = 'verified' THEN 'verified'
      WHEN v_identity.status = 'failed' THEN 'failed'
      ELSE 'pending'
    END,
    identity_verified_at = CASE
      WHEN v_identity.status = 'verified' THEN COALESCE(v_identity.verified_at, now())
      ELSE g.identity_verified_at
    END,
    business_email_status = CASE
      WHEN v_email.id IS NULL THEN g.business_email_status
      WHEN v_email.status = 'verified' THEN 'verified'
      WHEN v_email.status = 'failed' THEN 'failed'
      ELSE 'pending'
    END,
    business_email = COALESCE(v_email.email, g.business_email),
    business_email_verified_at = CASE
      WHEN v_email.status = 'verified' THEN COALESCE(v_email.verified_at, now())
      ELSE g.business_email_verified_at
    END,
    registration_status = CASE
      WHEN v_reg_approved THEN 'verified'
      ELSE 'not_required'
    END,
    registration_verified_at = CASE WHEN v_reg_approved THEN COALESCE(g.registration_verified_at, now()) ELSE g.registration_verified_at END,
    updated_at = now()
  WHERE g.startup_id = p_startup_id;

  PERFORM public.run_listing_fraud_engine(p_startup_id);
  PERFORM public.sync_listing_lifecycle(p_startup_id);
  PERFORM public.recompute_listing_trust_v2(p_startup_id);
  PERFORM public.try_auto_publish_listing(p_startup_id);
END;
$$;

-- Re-sync lifecycle for listings blocked only on registration
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT startup_id FROM public.listing_verification_gates LOOP
    PERFORM public.refresh_listing_gates_from_evidence(r.startup_id);
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
