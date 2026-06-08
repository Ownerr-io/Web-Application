-- Provider-agnostic verified revenue framework: normalized metrics, gates, trust, catalog.

BEGIN;

INSERT INTO public.platform_internal_config (key, value)
VALUES ('revenue_sync_freshness_days', '30')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.verified_revenue_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startups (id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.integration_connections (id) ON DELETE CASCADE,
  source_provider text NOT NULL,
  verified_revenue_amount numeric NOT NULL DEFAULT 0,
  annualized_revenue numeric,
  customer_count integer,
  transaction_count integer,
  currency text NOT NULL DEFAULT 'USD',
  verification_status text NOT NULL CHECK (
    verification_status IN ('pass', 'partial', 'fail', 'pending')
  ),
  evidence_timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id, connection_id)
);

CREATE INDEX IF NOT EXISTS verified_revenue_metrics_startup_evidence_idx
  ON public.verified_revenue_metrics (startup_id, evidence_timestamp DESC);

ALTER TABLE public.verified_revenue_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS verified_revenue_metrics_founder ON public.verified_revenue_metrics;
CREATE POLICY verified_revenue_metrics_founder ON public.verified_revenue_metrics
  FOR SELECT TO authenticated
  USING (public.startup_owned_by_auth(startup_id) OR public.is_platform_admin());

DROP POLICY IF EXISTS verified_revenue_metrics_admin ON public.verified_revenue_metrics;
CREATE POLICY verified_revenue_metrics_admin ON public.verified_revenue_metrics
  FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

ALTER TABLE public.listing_verification_gates
  ADD COLUMN IF NOT EXISTS verified_revenue_amount numeric,
  ADD COLUMN IF NOT EXISTS revenue_source_provider text,
  ADD COLUMN IF NOT EXISTS revenue_currency text,
  ADD COLUMN IF NOT EXISTS revenue_evidence_at timestamptz;

-- Seed revenue-capable providers + capability metadata (UI + gates).
INSERT INTO public.verification_providers (slug, category, display_name, auth_type, sort_order, config_schema)
VALUES
  ('chargebee', 'revenue', 'Chargebee', 'api_key', 45, '{"revenue_class":"subscription","supports_mrr":true,"supports_arr":true,"supports_transactions":true,"supports_customers":true,"requires_external_account":true,"external_account_label":"Site name (subdomain)"}'::jsonb),
  ('recurly', 'revenue', 'Recurly', 'api_key', 46, '{"revenue_class":"subscription","supports_mrr":true,"supports_arr":true,"supports_transactions":true,"supports_customers":true,"requires_external_account":true,"external_account_label":"Subdomain"}'::jsonb),
  ('paypal', 'revenue', 'PayPal', 'oauth2', 55, '{"revenue_class":"transaction","supports_mrr":false,"supports_arr":false,"supports_transactions":true,"supports_customers":false}'::jsonb),
  ('square', 'revenue', 'Square', 'oauth2', 56, '{"revenue_class":"transaction","supports_mrr":false,"supports_arr":false,"supports_transactions":true,"supports_customers":false}'::jsonb),
  ('payu', 'revenue', 'PayU', 'api_key', 57, '{"revenue_class":"transaction","supports_mrr":false,"supports_arr":false,"supports_transactions":true,"supports_customers":false}'::jsonb),
  ('woocommerce', 'revenue', 'WooCommerce', 'api_key', 61, '{"revenue_class":"commerce","supports_mrr":false,"supports_arr":false,"supports_transactions":true,"supports_customers":false,"requires_external_account":true,"external_account_label":"Store URL (https://…)","api_key_hint":"consumer_key:consumer_secret"}'::jsonb),
  ('bigcommerce', 'revenue', 'BigCommerce', 'api_key', 62, '{"revenue_class":"commerce","supports_mrr":false,"supports_arr":false,"supports_transactions":true,"supports_customers":false,"requires_external_account":true,"external_account_label":"Store hash"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

UPDATE public.verification_providers SET config_schema = config_schema || jsonb_build_object(
  'revenue_class', 'subscription',
  'supports_mrr', true,
  'supports_arr', true,
  'supports_transactions', true,
  'supports_customers', true,
  'connect_description', 'We aggregate provider sync data into verified revenue (not manual entry).'
) WHERE slug = 'stripe';

UPDATE public.verification_providers SET config_schema = config_schema || '{"revenue_class":"subscription","supports_mrr":true,"supports_arr":true,"supports_transactions":true,"supports_customers":false}'::jsonb
WHERE slug = 'paddle';

UPDATE public.verification_providers SET config_schema = config_schema || '{"revenue_class":"subscription","supports_mrr":true,"supports_arr":true,"supports_transactions":false,"supports_customers":true,"requires_external_account":true,"external_account_label":"Project ID"}'::jsonb
WHERE slug = 'revenuecat';

UPDATE public.verification_providers SET config_schema = config_schema || '{"revenue_class":"subscription","supports_mrr":false,"supports_arr":false,"supports_transactions":true,"supports_customers":false}'::jsonb
WHERE slug IN ('lemonsqueezy', 'razorpay');

UPDATE public.verification_providers SET config_schema = config_schema || '{"revenue_class":"commerce","supports_mrr":false,"supports_arr":false,"supports_transactions":true,"supports_customers":true,"requires_external_account":true,"external_account_label":"Shop domain (myshop.myshopify.com)"}'::jsonb
WHERE slug = 'shopify';

UPDATE public.verification_providers SET config_schema = config_schema || '{"revenue_class":"accounting","supports_mrr":false,"supports_arr":true,"supports_transactions":false,"supports_customers":false,"satisfies_revenue_gate":true}'::jsonb
WHERE slug IN ('quickbooks', 'xero', 'zoho_books');

UPDATE public.verification_providers SET config_schema = config_schema || '{"revenue_class":"banking","supports_mrr":false,"supports_arr":false,"supports_transactions":true,"supports_customers":false,"satisfies_revenue_gate":true}'::jsonb
WHERE slug IN ('plaid', 'tink');

CREATE OR REPLACE FUNCTION public.revenue_sync_freshness_interval()
RETURNS interval
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT make_interval(days => GREATEST(1, COALESCE(
    (SELECT NULLIF(trim(value), '')::integer FROM public.platform_internal_config WHERE key = 'revenue_sync_freshness_days'),
    30
  )));
$$;

CREATE OR REPLACE FUNCTION public.is_revenue_evidence_provider(p_slug text, p_category text, p_config jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    p_category = 'revenue'
    OR COALESCE((p_config->>'satisfies_revenue_gate')::boolean, false);
$$;

CREATE OR REPLACE FUNCTION public.listing_mandatory_gates_pass(p_startup_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.listing_verification_gates g
    JOIN public.startups s ON s.id = g.startup_id
    WHERE g.startup_id = p_startup_id
      AND g.identity_status = 'verified'
      AND g.domain_status = 'verified'
      AND g.business_email_status = 'verified'
      AND g.revenue_status = 'verified'
      AND COALESCE(g.verified_revenue_amount, 0) > 0
      AND public.founder_person_verified_for_auth(s.founder_user_id)
  );
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
    JOIN public.verified_revenue_metrics vrm ON vrm.connection_id = ic.id
    WHERE ic.startup_id = p_startup_id
      AND ic.status IN ('connected', 'pending', 'degraded')
      AND public.is_revenue_evidence_provider(vp.slug, vp.category, vp.config_schema)
      AND ic.last_sync_at IS NOT NULL
      AND ic.last_sync_at > now() - v_freshness
      AND vrm.verification_status = 'pass'
      AND vrm.verified_revenue_amount > 0
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

  IF NOT v_rev_pass THEN
    v_rev_amount := COALESCE(v_rev_amount, 0);
  END IF;

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
      WHEN v_revenue_connection_active AND COALESCE(v_rev_amount, 0) > 0 THEN 'partial'
      WHEN v_rev_pass AND COALESCE(v_rev_amount, 0) > 0 AND NOT v_revenue_sync_fresh THEN 'partial'
      WHEN NOT v_revenue_connection_active AND g.revenue_status = 'verified' THEN 'pending'
      WHEN EXISTS (
        SELECT 1 FROM public.verification_results r
        WHERE r.startup_id = p_startup_id AND r.dimension = 'revenue' AND r.status = 'fail'
      ) THEN 'failed'
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
  v_fraud_pts numeric := 10;
  v_signal_count integer := 0;
BEGIN
  SELECT * INTO g FROM public.listing_verification_gates WHERE startup_id = p_startup_id;
  IF NOT FOUND THEN
    PERFORM public.ensure_listing_gates_row(p_startup_id);
    SELECT * INTO g FROM public.listing_verification_gates WHERE startup_id = p_startup_id;
  END IF;

  IF g.identity_status = 'verified' THEN
    v_score := v_score + 20;
    v_breakdown := v_breakdown || jsonb_build_object('founder_verification', 20);
  END IF;
  IF g.domain_status = 'verified' THEN
    v_score := v_score + 20;
    v_breakdown := v_breakdown || jsonb_build_object('domain', 20);
  END IF;
  IF g.business_email_status = 'verified' THEN
    v_score := v_score + 20;
    v_breakdown := v_breakdown || jsonb_build_object('business_email', 20);
  END IF;
  IF g.revenue_status = 'verified' AND COALESCE(g.verified_revenue_amount, 0) > 0 THEN
    v_score := v_score + 30;
    v_breakdown := v_breakdown || jsonb_build_object('revenue', 30);
  END IF;

  SELECT COUNT(*)::integer INTO v_signal_count
  FROM public.listing_fraud_signals fs
  WHERE fs.startup_id = p_startup_id
    AND fs.severity IN ('high', 'medium', 'high_risk')
    AND fs.created_at > now() - interval '90 days';

  v_fraud_pts := GREATEST(0, 10 - (v_signal_count * 3));
  v_score := v_score + v_fraud_pts;
  v_breakdown := v_breakdown || jsonb_build_object('fraud', v_fraud_pts);

  v_score := GREATEST(0, LEAST(100, v_score));

  v_level := CASE
    WHEN v_score >= 85 THEN 'elite'
    WHEN v_score >= 70 THEN 'trusted'
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

  PERFORM public.ownerr_bypass_startup_guard();
  UPDATE public.startups SET verified = public.listing_mandatory_gates_pass(p_startup_id)
  WHERE id = p_startup_id;

  RETURN jsonb_build_object('score', v_score, 'level', v_level, 'breakdown', v_breakdown);
END;
$$;

CREATE OR REPLACE FUNCTION public.listing_verification_timeline_public(p_startup_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'slug', s.slug,
    'listing_lifecycle', s.listing_lifecycle,
    'is_public', s.listing_lifecycle = 'published' AND s.visibility = 'public',
    'trust', (
      SELECT jsonb_build_object('score', ts.score, 'level', ts.level, 'computed_at', ts.computed_at)
      FROM public.trust_scores ts WHERE ts.startup_id = s.id
    ),
    'verified_revenue_amount', g.verified_revenue_amount,
    'revenue_source_provider', g.revenue_source_provider,
    'revenue_currency', g.revenue_currency,
    'verified_mrr', g.verified_mrr,
    'verified_arr', g.verified_arr,
    'verified_domain', g.verified_domain,
    'revenue_verified_at', g.revenue_verified_at,
    'domain_verified_at', g.domain_verified_at,
    'identity_verified_at', g.identity_verified_at,
    'business_email_verified_at', g.business_email_verified_at,
    'registration_verified_at', g.registration_verified_at,
    'published_at', g.published_at,
    'badges', jsonb_build_object(
      'founder_verified', g.identity_status = 'verified',
      'domain_verified', g.domain_status = 'verified',
      'business_email_verified', g.business_email_status = 'verified',
      'revenue_verified', g.revenue_status = 'verified' AND COALESCE(g.verified_revenue_amount, 0) > 0,
      'business_verified', g.registration_status = 'verified',
      'marketplace_published', s.listing_lifecycle = 'published'
    )
  )
  FROM public.startups s
  LEFT JOIN public.listing_verification_gates g ON g.startup_id = s.id
  WHERE s.slug = p_startup_slug
    AND s.listing_lifecycle = 'published'
    AND s.visibility = 'public';
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
