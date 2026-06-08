-- Automated verification platform — auto-publish, fraud engine, identity sessions, email token, OCR completion
-- See docs/architecture/automated-verification-platform.md

BEGIN;

-- ---------------------------------------------------------------------------
-- Schema extensions
-- ---------------------------------------------------------------------------
ALTER TABLE public.listing_verification_gates
  ADD COLUMN IF NOT EXISTS fraud_risk text NOT NULL DEFAULT 'clear';

ALTER TABLE public.listing_verification_gates DROP CONSTRAINT IF EXISTS listing_verification_gates_fraud_risk_check;
ALTER TABLE public.listing_verification_gates ADD CONSTRAINT listing_verification_gates_fraud_risk_check CHECK (
  fraud_risk IN ('clear', 'warning', 'high_risk')
);

ALTER TABLE public.listing_verification_gates DROP CONSTRAINT IF EXISTS listing_verification_gates_identity_status_check;
UPDATE public.listing_verification_gates SET identity_status = 'failed' WHERE identity_status = 'rejected';
ALTER TABLE public.listing_verification_gates ADD CONSTRAINT listing_verification_gates_identity_status_check CHECK (
  identity_status IN ('pending', 'verified', 'failed')
);

ALTER TABLE public.listing_verification_gates DROP CONSTRAINT IF EXISTS listing_verification_gates_business_email_status_check;
UPDATE public.listing_verification_gates SET business_email_status = 'failed'
  WHERE business_email_status = 'manual_review';
ALTER TABLE public.listing_verification_gates ADD CONSTRAINT listing_verification_gates_business_email_status_check CHECK (
  business_email_status IN ('pending', 'verified', 'failed')
);

ALTER TABLE public.listing_verification_gates DROP CONSTRAINT IF EXISTS listing_verification_gates_registration_status_check;
UPDATE public.listing_verification_gates SET registration_status = 'failed' WHERE registration_status = 'rejected';
ALTER TABLE public.listing_verification_gates ADD CONSTRAINT listing_verification_gates_registration_status_check CHECK (
  registration_status IN ('pending', 'verified', 'failed', 'review_required')
);

CREATE TABLE IF NOT EXISTS public.platform_disposable_email_domains (
  domain text PRIMARY KEY
);

INSERT INTO public.platform_disposable_email_domains (domain) VALUES
  ('gmail.com'), ('googlemail.com'), ('outlook.com'), ('hotmail.com'), ('live.com'),
  ('yahoo.com'), ('icloud.com'), ('proton.me'), ('protonmail.com'), ('aol.com'),
  ('mail.com'), ('gmx.com'), ('yandex.com'), ('zoho.com')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.identity_verification_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startups (id) ON DELETE CASCADE,
  auth_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('stripe_identity', 'persona', 'sumsub', 'veriff')),
  external_session_id text,
  client_secret text,
  redirect_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed')),
  provider_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS identity_verification_sessions_startup_idx
  ON public.identity_verification_sessions (startup_id, created_at DESC);

ALTER TABLE public.business_registration_documents
  ADD COLUMN IF NOT EXISTS ocr_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ocr_confidence numeric,
  ADD COLUMN IF NOT EXISTS extracted_company_name text,
  ADD COLUMN IF NOT EXISTS extracted_registration_number text,
  ADD COLUMN IF NOT EXISTS extracted_country text,
  ADD COLUMN IF NOT EXISTS extracted_incorporation_date date;

ALTER TABLE public.business_email_verifications
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;

CREATE TABLE IF NOT EXISTS public.verification_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  external_event_id text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_event_id)
);

ALTER TABLE public.identity_verification_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_disposable_email_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS identity_sessions_founder ON public.identity_verification_sessions;
CREATE POLICY identity_sessions_founder ON public.identity_verification_sessions
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() OR public.startup_owned_by_auth(startup_id) OR public.is_platform_admin());

DROP POLICY IF EXISTS disposable_domains_read ON public.platform_disposable_email_domains;
CREATE POLICY disposable_domains_read ON public.platform_disposable_email_domains
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS webhook_events_admin ON public.verification_webhook_events;
CREATE POLICY webhook_events_admin ON public.verification_webhook_events
  FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Internal publish + auto-publish
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_listing_internal(p_startup_id uuid, p_actor text DEFAULT 'system')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT listing_lifecycle FROM public.startups WHERE id = p_startup_id) = 'suspended' THEN
    RETURN;
  END IF;

  UPDATE public.startups SET
    listing_lifecycle = 'published',
    status = 'published',
    visibility = 'public',
    updated_at = now()
  WHERE id = p_startup_id;

  UPDATE public.listing_verification_gates SET
    published_at = COALESCE(published_at, now()),
    updated_at = now()
  WHERE startup_id = p_startup_id;

  PERFORM public.append_audit_log('startup', p_startup_id, 'auto_publish', NULL,
    jsonb_build_object('actor', p_actor));
END;
$$;

CREATE OR REPLACE FUNCTION public.try_auto_publish_listing(p_startup_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g public.listing_verification_gates%ROWTYPE;
BEGIN
  SELECT * INTO g FROM public.listing_verification_gates WHERE startup_id = p_startup_id;
  IF NOT FOUND THEN RETURN false; END IF;

  IF g.fraud_risk = 'high_risk' THEN
    RETURN false;
  END IF;

  IF NOT public.listing_mandatory_gates_pass(p_startup_id) THEN
    RETURN false;
  END IF;

  IF (SELECT listing_lifecycle FROM public.startups WHERE id = p_startup_id) = 'published' THEN
    RETURN true;
  END IF;

  PERFORM public.publish_listing_internal(p_startup_id, 'auto_publish');
  RETURN true;
END;
$$;

-- ---------------------------------------------------------------------------
-- Fraud engine
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.run_listing_fraud_engine(p_startup_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g public.listing_verification_gates%ROWTYPE;
  s public.startups%ROWTYPE;
  v_risk text := 'clear';
  v_domain text;
  v_email_domain text;
BEGIN
  SELECT * INTO g FROM public.listing_verification_gates WHERE startup_id = p_startup_id;
  SELECT * INTO s FROM public.startups WHERE id = p_startup_id;
  IF NOT FOUND THEN RETURN 'clear'; END IF;

  v_domain := lower(COALESCE(g.verified_domain, ''));
  v_email_domain := lower(split_part(COALESCE(g.business_email, ''), '@', 2));

  IF v_domain <> '' AND v_email_domain <> '' AND v_email_domain <> v_domain THEN
    INSERT INTO public.listing_fraud_signals (startup_id, signal_type, severity, payload)
    VALUES (p_startup_id, 'business_email_domain_mismatch', 'high',
      jsonb_build_object('verified_domain', v_domain, 'email_domain', v_email_domain));
    v_risk := 'high_risk';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.startups s2
    JOIN public.listing_verification_gates g2 ON g2.startup_id = s2.id
    WHERE s2.id <> p_startup_id
      AND g2.verified_domain IS NOT NULL
      AND lower(g2.verified_domain) = v_domain
      AND v_domain <> ''
      AND s2.listing_lifecycle = 'published'
  ) THEN
    INSERT INTO public.listing_fraud_signals (startup_id, signal_type, severity, payload)
    VALUES (p_startup_id, 'duplicate_verified_domain', 'medium', jsonb_build_object('domain', v_domain));
    v_risk := CASE WHEN v_risk = 'high_risk' THEN v_risk ELSE 'warning' END;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.business_registration_documents d
    JOIN public.business_registration_documents d2 ON d2.extracted_registration_number = d.extracted_registration_number
    WHERE d.startup_id = p_startup_id
      AND d.extracted_registration_number IS NOT NULL
      AND d2.startup_id <> p_startup_id
  ) THEN
    INSERT INTO public.listing_fraud_signals (startup_id, signal_type, severity, payload)
    VALUES (p_startup_id, 'duplicate_registration_number', 'high', '{}'::jsonb);
    v_risk := 'high_risk';
  END IF;

  IF g.verified_mrr IS NOT NULL AND s.annual_revenue IS NOT NULL AND g.verified_mrr > 0 THEN
    IF abs(g.verified_mrr - (s.annual_revenue / 12.0)) / g.verified_mrr > 0.5 THEN
      INSERT INTO public.listing_fraud_signals (startup_id, signal_type, severity, payload)
      VALUES (p_startup_id, 'revenue_form_mismatch', 'medium',
        jsonb_build_object('verified_mrr', g.verified_mrr, 'form_implied_mrr', s.annual_revenue / 12.0));
      v_risk := CASE WHEN v_risk = 'high_risk' THEN v_risk ELSE 'warning' END;
    END IF;
  END IF;

  UPDATE public.listing_verification_gates SET fraud_risk = v_risk, updated_at = now()
  WHERE startup_id = p_startup_id;

  IF v_risk IN ('warning', 'high_risk') THEN
    INSERT INTO public.admin_listing_reviews (startup_id, review_type, status, notes)
    SELECT p_startup_id, 'fraud', 'open', 'Automated fraud engine: ' || v_risk
    WHERE NOT EXISTS (
      SELECT 1 FROM public.admin_listing_reviews
      WHERE startup_id = p_startup_id AND review_type = 'fraud' AND status IN ('open', 'in_progress')
    );
  END IF;

  RETURN v_risk;
END;
$$;

-- ---------------------------------------------------------------------------
-- Refresh gates (automated identity + auto-publish hook)
-- ---------------------------------------------------------------------------
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
  v_reg_review boolean := false;
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

  SELECT EXISTS (
    SELECT 1 FROM public.business_registration_documents d
    WHERE d.startup_id = p_startup_id AND d.status = 'pending'
      AND d.ocr_confidence IS NOT NULL AND d.ocr_confidence < 0.85
  ) INTO v_reg_review;

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
      WHEN v_reg_review THEN 'review_required'
      WHEN EXISTS (
        SELECT 1 FROM public.business_registration_documents d
        WHERE d.startup_id = p_startup_id AND d.status = 'rejected'
      ) THEN 'failed'
      ELSE g.registration_status
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
    OR g.revenue_status = 'failed'
    OR g.registration_status = 'failed';

  IF v_failed THEN
    v_lifecycle := 'verification_failed';
  ELSIF public.listing_mandatory_gates_pass(p_startup_id) THEN
    v_lifecycle := 'verified';
  ELSIF g.submitted_for_review_at IS NOT NULL OR g.identity_status = 'pending'
    OR g.domain_status = 'pending' OR g.business_email_status = 'pending'
    OR g.revenue_status IN ('pending', 'partial')
    OR g.registration_status IN ('pending', 'review_required') THEN
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
      AND g.registration_status = 'verified'
  );
$$;

-- ---------------------------------------------------------------------------
-- Business email (automated token)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.try_invoke_business_email_send(
  p_verification_id uuid,
  p_plain_token text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_secret text;
BEGIN
  SELECT value INTO v_url FROM public.platform_internal_config WHERE key = 'sync_worker_invoke_url';
  SELECT value INTO v_secret FROM public.platform_internal_config WHERE key = 'sync_worker_invoke_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RETURN;
  END IF;
  PERFORM net.http_post(
    url := regexp_replace(v_url, '/v1/process-jobs$', '/v1/verification/send-business-email'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := jsonb_build_object(
      'verification_id', p_verification_id,
      'token', p_plain_token
    )::text
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

DROP FUNCTION IF EXISTS public.founder_submit_business_email(uuid, text);

CREATE OR REPLACE FUNCTION public.founder_submit_business_email(
  p_startup_id uuid,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
  v_domain text;
  v_verified_domain text;
  v_token text;
  v_hash text;
BEGIN
  IF NOT public.startup_owned_by_auth(p_startup_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  v_domain := lower(trim(split_part(trim(p_email), '@', 2)));
  IF v_domain = '' THEN RAISE EXCEPTION 'Invalid email'; END IF;

  IF EXISTS (SELECT 1 FROM public.platform_disposable_email_domains WHERE domain = v_domain) THEN
    RAISE EXCEPTION 'Use a work email on your company domain, not a personal email provider';
  END IF;

  SELECT verified_domain INTO v_verified_domain
  FROM public.listing_verification_gates WHERE startup_id = p_startup_id;

  IF v_verified_domain IS NULL OR v_verified_domain = '' THEN
    RAISE EXCEPTION 'Verify company domain (DNS) before business email';
  END IF;

  IF v_domain <> lower(v_verified_domain) THEN
    RAISE EXCEPTION 'Email domain must match verified domain %', v_verified_domain;
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_token, 'sha256'), 'hex');

  INSERT INTO public.business_email_verifications (
    id, startup_id, email, email_domain, status, requires_manual_review,
    verification_token_hash, token_expires_at
  ) VALUES (
    v_id, p_startup_id, lower(trim(p_email)), v_domain, 'pending', false,
    v_hash, now() + interval '48 hours'
  );

  PERFORM public.try_invoke_business_email_send(v_id, v_token);
  PERFORM public.refresh_listing_gates_from_evidence(p_startup_id);

  RETURN jsonb_build_object(
    'verification_id', v_id,
    'email', lower(trim(p_email)),
    'expires_at', now() + interval '48 hours'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_business_email_verification(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
  v_row public.business_email_verifications%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
    RAISE EXCEPTION 'Invalid token';
  END IF;
  v_hash := encode(digest(trim(p_token), 'sha256'), 'hex');

  SELECT * INTO v_row FROM public.business_email_verifications
  WHERE verification_token_hash = v_hash
    AND status = 'pending'
    AND (token_expires_at IS NULL OR token_expires_at > now())
  LIMIT 1;

  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid or expired verification link'; END IF;

  UPDATE public.business_email_verifications SET
    status = 'verified',
    verified_at = now(),
    verification_token_hash = NULL
  WHERE id = v_row.id;

  PERFORM public.refresh_listing_gates_from_evidence(v_row.startup_id);

  RETURN jsonb_build_object('startup_id', v_row.startup_id, 'verified', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Identity provider sessions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.founder_begin_identity_verification(
  p_startup_id uuid,
  p_provider text DEFAULT 'stripe_identity'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.startup_owned_by_auth(p_startup_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_provider NOT IN ('stripe_identity', 'persona', 'sumsub', 'veriff') THEN
    RAISE EXCEPTION 'Unsupported provider';
  END IF;

  INSERT INTO public.identity_verification_sessions (
    id, startup_id, auth_user_id, provider, status
  ) VALUES (v_id, p_startup_id, auth.uid(), p_provider, 'pending');

  PERFORM public.append_audit_log('startup', p_startup_id, 'identity_session_created', NULL,
    jsonb_build_object('session_id', v_id, 'provider', p_provider));

  RETURN jsonb_build_object('session_id', v_id, 'provider', p_provider, 'status', 'pending');
END;
$$;

CREATE OR REPLACE FUNCTION public.webhook_apply_identity_verification(
  p_provider text,
  p_external_event_id text,
  p_session_id uuid,
  p_verified boolean,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.identity_verification_sessions%ROWTYPE;
  v_inserted uuid;
BEGIN
  INSERT INTO public.verification_webhook_events (provider, external_event_id, payload)
  VALUES (p_provider, p_external_event_id, p_payload)
  ON CONFLICT (provider, external_event_id) DO NOTHING
  RETURNING id INTO v_inserted;
  IF v_inserted IS NULL THEN RETURN; END IF;

  SELECT * INTO v_session FROM public.identity_verification_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;

  UPDATE public.identity_verification_sessions SET
    status = CASE WHEN p_verified THEN 'verified' ELSE 'failed' END,
    verified_at = CASE WHEN p_verified THEN now() ELSE NULL END,
    provider_payload = provider_payload || p_payload,
    updated_at = now()
  WHERE id = p_session_id;

  PERFORM public.refresh_listing_gates_from_evidence(v_session.startup_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_registration_verification(
  p_document_id uuid,
  p_extracted jsonb,
  p_confidence numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc public.business_registration_documents%ROWTYPE;
  s public.startups%ROWTYPE;
  g public.listing_verification_gates%ROWTYPE;
  v_name text;
  v_threshold numeric := 0.85;
  v_match boolean := false;
BEGIN
  SELECT * INTO v_doc FROM public.business_registration_documents WHERE id = p_document_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Document not found'; END IF;
  SELECT * INTO s FROM public.startups WHERE id = v_doc.startup_id;
  SELECT * INTO g FROM public.listing_verification_gates WHERE startup_id = v_doc.startup_id;

  v_name := lower(trim(COALESCE(p_extracted->>'company_name', '')));

  UPDATE public.business_registration_documents SET
    ocr_payload = p_extracted,
    ocr_confidence = p_confidence,
    extracted_company_name = p_extracted->>'company_name',
    extracted_registration_number = p_extracted->>'registration_number',
    extracted_country = p_extracted->>'country',
    extracted_incorporation_date = (p_extracted->>'incorporation_date')::date
  WHERE id = p_document_id;

  IF p_confidence >= v_threshold AND v_name <> '' THEN
    v_match := v_name LIKE '%' || lower(trim(s.title)) || '%'
      OR lower(trim(s.title)) LIKE '%' || v_name || '%';
    IF g.verified_domain IS NOT NULL AND p_extracted ? 'company_name' THEN
      v_match := v_match OR v_name LIKE '%' || split_part(g.verified_domain, '.', 1) || '%';
    END IF;
  END IF;

  IF p_confidence >= v_threshold AND v_match THEN
    UPDATE public.business_registration_documents SET status = 'approved', reviewed_at = now()
    WHERE id = p_document_id;
  ELSE
    UPDATE public.business_registration_documents SET status = 'pending'
    WHERE id = p_document_id;
    INSERT INTO public.listing_fraud_signals (startup_id, signal_type, severity, payload)
    VALUES (v_doc.startup_id, 'registration_ocr_low_confidence', 'medium',
      jsonb_build_object('confidence', p_confidence, 'extracted', p_extracted));
  END IF;

  PERFORM public.refresh_listing_gates_from_evidence(v_doc.startup_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.founder_submit_registration_document(
  p_startup_id uuid,
  p_doc_type text,
  p_storage_path text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
BEGIN
  IF NOT public.startup_owned_by_auth(p_startup_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;

  INSERT INTO public.business_registration_documents (
    id, startup_id, doc_type, storage_path, status
  ) VALUES (v_id, p_startup_id, p_doc_type, p_storage_path, 'pending');

  PERFORM public.try_invoke_registration_ocr(v_id);
  PERFORM public.refresh_listing_gates_from_evidence(p_startup_id);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.try_invoke_registration_ocr(p_document_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_secret text;
BEGIN
  SELECT value INTO v_url FROM public.platform_internal_config WHERE key = 'sync_worker_invoke_url';
  SELECT value INTO v_secret FROM public.platform_internal_config WHERE key = 'sync_worker_invoke_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN RETURN; END IF;
  PERFORM net.http_post(
    url := regexp_replace(v_url, '/v1/process-jobs$', '/v1/verification/process-registration'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := jsonb_build_object('document_id', p_document_id)::text
  );
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

-- Deprecate manual identity upload path
CREATE OR REPLACE FUNCTION public.founder_submit_identity_verification(
  p_startup_id uuid,
  p_legal_name text,
  p_id_document_storage_path text,
  p_selfie_storage_path text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Use founder_begin_identity_verification and provider redirect (automated IDV)';
END;
$$;

CREATE OR REPLACE FUNCTION public.founder_request_publish(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.startups WHERE slug = lower(trim(p_slug));
  IF NOT FOUND THEN RAISE EXCEPTION 'Listing not found'; END IF;
  IF NOT public.startup_owned_by_auth(v_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  PERFORM public.refresh_listing_gates_from_evidence(v_id);
  PERFORM public.try_auto_publish_listing(v_id);
  RETURN public.listing_verification_snapshot(v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_fraud_investigation_queue()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  RETURN jsonb_build_object(
    'high_risk_listings', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'startup_id', g.startup_id,
        'slug', s.slug,
        'title', s.title,
        'fraud_risk', g.fraud_risk,
        'listing_lifecycle', s.listing_lifecycle
      ) ORDER BY g.updated_at DESC), '[]'::jsonb)
      FROM public.listing_verification_gates g
      JOIN public.startups s ON s.id = g.startup_id
      WHERE g.fraud_risk IN ('warning', 'high_risk')
    ),
    'open_fraud_reviews', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', r.id,
        'startup_id', r.startup_id,
        'slug', s.slug,
        'status', r.status,
        'notes', r.notes,
        'created_at', r.created_at
      ) ORDER BY r.created_at DESC), '[]'::jsonb)
      FROM public.admin_listing_reviews r
      JOIN public.startups s ON s.id = r.startup_id
      WHERE r.review_type = 'fraud' AND r.status IN ('open', 'in_progress')
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_listing_verification_queue()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.admin_fraud_investigation_queue();
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.confirm_business_email_verification(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.founder_begin_identity_verification(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.webhook_apply_identity_verification(text, text, uuid, boolean, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_registration_verification(uuid, jsonb, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_fraud_investigation_queue() TO authenticated;

CREATE OR REPLACE FUNCTION public.founder_launch_identity_verification(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.identity_verification_sessions%ROWTYPE;
  v_url text;
  v_secret text;
BEGIN
  SELECT * INTO v_row FROM public.identity_verification_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF v_row.auth_user_id <> auth.uid() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT value INTO v_url FROM public.platform_internal_config WHERE key = 'sync_worker_invoke_url';
  SELECT value INTO v_secret FROM public.platform_internal_config WHERE key = 'sync_worker_invoke_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RAISE EXCEPTION 'Verification worker not configured';
  END IF;

  PERFORM net.http_post(
    url := regexp_replace(v_url, '/v1/process-jobs$', '/v1/identity/session'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := jsonb_build_object('session_id', p_session_id)::text
  );

  RETURN jsonb_build_object('session_id', p_session_id, 'status', 'launching');
END;
$$;

GRANT EXECUTE ON FUNCTION public.founder_launch_identity_verification(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
