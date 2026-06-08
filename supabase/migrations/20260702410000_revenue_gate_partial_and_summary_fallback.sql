-- Revenue gate UX: partial when provider connected; summary fallback before legacy financial_metrics.

BEGIN;

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
  v_revenue_sync_fresh boolean := false;
  v_identity_verified boolean := false;
  v_email_verified boolean := false;
  v_founder_user_id uuid;
  v_founder_person boolean := false;
  v_rev_amount numeric := 0;
  v_rev_currency text := 'USD';
  v_rev_provider text;
  v_rev_evidence_at timestamptz;
  v_freshness interval;
BEGIN
  PERFORM public.ensure_listing_gates_row(p_startup_id);
  v_freshness := public.revenue_sync_freshness_interval();

  SELECT founder_user_id INTO v_founder_user_id FROM public.startups WHERE id = p_startup_id;
  IF v_founder_user_id IS NOT NULL THEN
    v_founder_person := public.founder_person_verified_for_auth(v_founder_user_id);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.verification_results r
    WHERE r.startup_id = p_startup_id AND r.dimension = 'revenue'
      AND r.status = 'pass'
      AND (r.valid_until IS NULL OR r.valid_until > now())
  ) INTO v_rev_pass;

  SELECT EXISTS (
    SELECT 1 FROM public.integration_connections ic
    JOIN public.verification_providers vp ON vp.id = ic.provider_id
    WHERE ic.startup_id = p_startup_id
      AND ic.status IN ('connected', 'pending', 'degraded')
      AND public.is_revenue_evidence_provider(vp.slug, vp.category, vp.config_schema)
  ) INTO v_revenue_connection_active;

  SELECT EXISTS (
    SELECT 1 FROM public.integration_connections ic
    JOIN public.verification_providers vp ON vp.id = ic.provider_id
    LEFT JOIN public.verified_revenue_metrics vrm ON vrm.connection_id = ic.id
    WHERE ic.startup_id = p_startup_id
      AND ic.status IN ('connected', 'pending', 'degraded')
      AND public.is_revenue_evidence_provider(vp.slug, vp.category, vp.config_schema)
      AND ic.last_sync_at IS NOT NULL
      AND ic.last_sync_at > now() - v_freshness
      AND (
        (vrm.verification_status = 'pass' AND vrm.verified_revenue_amount > 0)
        OR EXISTS (
          SELECT 1 FROM public.verification_results r
          WHERE r.connection_id = ic.id
            AND r.dimension = 'revenue'
            AND r.status = 'pass'
            AND (r.valid_until IS NULL OR r.valid_until > now())
        )
      )
  ) INTO v_revenue_sync_fresh;

  SELECT
    vrm.verified_revenue_amount,
    vrm.currency,
    vrm.source_provider,
    vrm.evidence_timestamp,
    vrm.annualized_revenue
  INTO v_rev_amount, v_rev_currency, v_rev_provider, v_rev_evidence_at, v_arr
  FROM public.verified_revenue_metrics vrm
  JOIN public.integration_connections ic ON ic.id = vrm.connection_id
  WHERE vrm.startup_id = p_startup_id
    AND vrm.verification_status = 'pass'
    AND vrm.verified_revenue_amount > 0
  ORDER BY vrm.evidence_timestamp DESC
  LIMIT 1;

  IF v_rev_amount IS NULL OR v_rev_amount <= 0 THEN
    SELECT
      NULLIF((r.summary->'verified_revenue'->>'verified_revenue_amount')::numeric, 0),
      COALESCE(NULLIF(r.summary->'verified_revenue'->>'currency', ''), 'USD'),
      NULLIF(r.summary->'verified_revenue'->>'source_provider', ''),
      (r.summary->'verified_revenue'->>'evidence_timestamp')::timestamptz,
      NULLIF((r.summary->'verified_revenue'->>'annualized_revenue')::numeric, 0)
    INTO v_rev_amount, v_rev_currency, v_rev_provider, v_rev_evidence_at, v_arr
    FROM public.verification_results r
    WHERE r.startup_id = p_startup_id
      AND r.dimension = 'revenue'
      AND r.summary ? 'verified_revenue'
      AND COALESCE((r.summary->'verified_revenue'->>'verified_revenue_amount')::numeric, 0) > 0
    ORDER BY r.computed_at DESC
    LIMIT 1;
  END IF;

  IF v_rev_amount IS NULL OR v_rev_amount <= 0 THEN
    SELECT COALESCE(SUM(m.net_revenue), SUM(m.mrr), 0), COALESCE(SUM(m.arr), 0)
    INTO v_rev_amount, v_arr
    FROM public.financial_metrics m
    WHERE m.startup_id = p_startup_id;
    IF v_rev_amount > 0 AND v_rev_provider IS NULL THEN
      v_rev_provider := 'stripe';
    END IF;
  END IF;

  v_mrr := CASE
    WHEN COALESCE((SELECT (vp.config_schema->>'supports_mrr')::boolean FROM public.verification_providers vp WHERE vp.slug = v_rev_provider), false)
      THEN v_rev_amount
    ELSE COALESCE((SELECT MAX(m.mrr) FROM public.financial_metrics m WHERE m.startup_id = p_startup_id), 0)
  END;

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

  v_identity_verified := v_founder_person
    OR (
      v_identity.id IS NOT NULL
      AND v_identity.status = 'verified'
      AND v_identity.verified_at IS NOT NULL
      AND v_identity.verified_at > now() - interval '365 days'
    );

  SELECT * INTO v_email
  FROM public.business_email_verifications
  WHERE startup_id = p_startup_id AND status = 'verified'
  ORDER BY verified_at DESC NULLS LAST
  LIMIT 1;

  IF v_email.id IS NULL THEN
    SELECT * INTO v_email
    FROM public.business_email_verifications
    WHERE startup_id = p_startup_id
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  v_email_verified := v_email.id IS NOT NULL
    AND v_email.status = 'verified'
    AND v_email.verified_at IS NOT NULL
    AND v_email.verified_at > now() - interval '90 days';

  IF v_email.id IS NOT NULL AND v_email.status = 'verified'
     AND v_email.verified_at IS NOT NULL
     AND v_email.verified_at <= now() - interval '90 days' THEN
    UPDATE public.business_email_verifications SET status = 'expired', updated_at = now()
    WHERE id = v_email.id;
    v_email_verified := false;
  END IF;

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
      WHEN v_rev_pass AND v_revenue_sync_fresh AND COALESCE(v_rev_amount, 0) > 0 THEN 'verified'
      WHEN EXISTS (
        SELECT 1 FROM public.verification_results r
        WHERE r.startup_id = p_startup_id AND r.dimension = 'revenue' AND r.status = 'fail'
          AND r.computed_at > now() - interval '30 days'
      ) THEN 'failed'
      WHEN v_revenue_connection_active AND (
        COALESCE(v_rev_amount, 0) > 0
        OR EXISTS (
          SELECT 1 FROM public.verification_results r
          WHERE r.startup_id = p_startup_id AND r.dimension = 'revenue'
            AND r.status IN ('partial', 'pass')
            AND r.computed_at > now() - interval '30 days'
        )
      ) THEN 'partial'
      WHEN NOT v_revenue_connection_active AND g.revenue_status = 'verified' THEN 'pending'
      ELSE COALESCE(g.revenue_status, 'pending')
    END,
    revenue_verified_at = CASE
      WHEN v_rev_pass AND v_revenue_sync_fresh AND COALESCE(v_rev_amount, 0) > 0
        THEN COALESCE(g.revenue_verified_at, now())
      ELSE NULL
    END,
    verified_revenue_amount = CASE
      WHEN COALESCE(v_rev_amount, 0) > 0 THEN v_rev_amount ELSE 0 END,
    revenue_source_provider = CASE
      WHEN COALESCE(v_rev_amount, 0) > 0 THEN v_rev_provider ELSE NULL END,
    revenue_currency = CASE
      WHEN COALESCE(v_rev_amount, 0) > 0 THEN COALESCE(v_rev_currency, 'USD') ELSE NULL END,
    revenue_evidence_at = CASE
      WHEN COALESCE(v_rev_amount, 0) > 0 THEN v_rev_evidence_at ELSE NULL END,
    verified_mrr = CASE WHEN v_mrr > 0 THEN v_mrr ELSE 0 END,
    verified_arr = CASE WHEN COALESCE(v_arr, 0) > 0 THEN v_arr ELSE 0 END,
    identity_status = CASE
      WHEN v_founder_person THEN 'verified'
      WHEN v_identity.id IS NULL AND NOT v_founder_person THEN COALESCE(g.identity_status, 'pending')
      WHEN v_identity_verified THEN 'verified'
      WHEN v_identity.status = 'failed' THEN 'failed'
      ELSE 'pending'
    END,
    identity_verified_at = CASE
      WHEN v_identity_verified THEN COALESCE(g.identity_verified_at, now())
      ELSE NULL
    END,
    business_email_status = CASE
      WHEN v_email_verified THEN 'verified'
      WHEN v_email.id IS NOT NULL AND v_email.status = 'failed' THEN 'failed'
      WHEN v_email.id IS NOT NULL THEN 'pending'
      ELSE 'pending'
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
