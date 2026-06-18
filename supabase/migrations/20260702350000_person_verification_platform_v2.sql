-- Person verification (buyer + founder) + listing gates v2 (founder person, business email required, trust weights).

BEGIN;

-- ---------------------------------------------------------------------------
-- Person verification profiles (one per marketplace desk profile)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.person_verification_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_profile_id uuid NOT NULL REFERENCES public.marketplace_profiles (id) ON DELETE CASCADE,
  auth_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text,
  country_code text,
  linkedin_url text,
  twitter_url text,
  email text,
  id_document_type text CHECK (
    id_document_type IS NULL OR id_document_type IN ('passport', 'national_id', 'driver_license')
  ),
  verification_status text NOT NULL DEFAULT 'draft' CHECK (
    verification_status IN ('draft', 'pending', 'verified', 'rejected')
  ),
  verification_level smallint NOT NULL DEFAULT 0 CHECK (verification_level >= 0 AND verification_level <= 3),
  identity_provider text,
  verified_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (marketplace_profile_id)
);

CREATE INDEX IF NOT EXISTS person_verification_profiles_auth_idx
  ON public.person_verification_profiles (auth_user_id);

DROP TRIGGER IF EXISTS person_verification_profiles_set_updated_at ON public.person_verification_profiles;
CREATE TRIGGER person_verification_profiles_set_updated_at
  BEFORE UPDATE ON public.person_verification_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.person_verification_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS person_verification_profiles_own ON public.person_verification_profiles;
CREATE POLICY person_verification_profiles_own ON public.person_verification_profiles
  FOR ALL TO authenticated
  USING (auth_user_id = auth.uid() OR public.is_platform_admin())
  WITH CHECK (auth_user_id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS person_verification_profiles_public_read ON public.person_verification_profiles;
CREATE POLICY person_verification_profiles_public_read ON public.person_verification_profiles
  FOR SELECT TO authenticated, anon
  USING (verification_status = 'verified');

-- ---------------------------------------------------------------------------
-- Identity sessions: person OR listing (not both)
-- ---------------------------------------------------------------------------
ALTER TABLE public.identity_verification_sessions
  ADD COLUMN IF NOT EXISTS person_verification_profile_id uuid
  REFERENCES public.person_verification_profiles (id) ON DELETE CASCADE;

ALTER TABLE public.identity_verification_sessions
  ALTER COLUMN startup_id DROP NOT NULL;

ALTER TABLE public.identity_verification_sessions
  DROP CONSTRAINT IF EXISTS identity_verification_sessions_scope_check;

ALTER TABLE public.identity_verification_sessions
  ADD CONSTRAINT identity_verification_sessions_scope_check CHECK (
    (
      startup_id IS NOT NULL
      AND person_verification_profile_id IS NULL
    )
    OR (
      startup_id IS NULL
      AND person_verification_profile_id IS NOT NULL
    )
  );

CREATE INDEX IF NOT EXISTS identity_verification_sessions_person_idx
  ON public.identity_verification_sessions (person_verification_profile_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.marketplace_desk_role_for_person(p_desk_role text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN lower(trim(p_desk_role)) IN ('founder', 'seller') THEN 'seller'
    WHEN lower(trim(p_desk_role)) = 'buyer' THEN 'buyer'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.founder_person_verified_for_auth(p_auth_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.person_verification_profiles pvp
    JOIN public.marketplace_profiles mp ON mp.id = pvp.marketplace_profile_id
    WHERE mp.auth_user_id = p_auth_user_id
      AND mp.desk_role IN ('seller', 'founder')
      AND mp.status = 'active'
      AND pvp.verification_status = 'verified'
      AND pvp.verification_level >= 2
  );
$$;

CREATE OR REPLACE FUNCTION public.refresh_listing_gates_for_founder(p_auth_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id FROM public.startups WHERE founder_user_id = p_auth_user_id
  LOOP
    PERFORM public.refresh_listing_gates_from_evidence(r.id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_person_identity_verification_result(
  p_profile_id uuid,
  p_verified boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.person_verification_profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.person_verification_profiles WHERE id = p_profile_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF p_verified THEN
    UPDATE public.person_verification_profiles SET
      verification_status = 'verified',
      verification_level = GREATEST(verification_level, 2),
      identity_provider = COALESCE(identity_provider, 'stripe_identity'),
      verified_at = now(),
      rejection_reason = NULL,
      updated_at = now()
    WHERE id = p_profile_id;
  ELSE
    UPDATE public.person_verification_profiles SET
      verification_status = 'rejected',
      rejection_reason = COALESCE(rejection_reason, 'Identity verification failed'),
      updated_at = now()
    WHERE id = p_profile_id;
  END IF;

  PERFORM public.refresh_listing_gates_for_founder(v_row.auth_user_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- Person profile RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_or_create_person_verification_profile(p_desk_role text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_desk text;
  v_mp public.marketplace_profiles%ROWTYPE;
  v_row public.person_verification_profiles%ROWTYPE;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  v_desk := public.marketplace_desk_role_for_person(p_desk_role);
  IF v_desk IS NULL THEN RAISE EXCEPTION 'Invalid desk role'; END IF;

  SELECT * INTO v_mp
  FROM public.marketplace_profiles
  WHERE auth_user_id = auth.uid() AND desk_role = v_desk AND status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.marketplace_profiles (auth_user_id, desk_role, status, metadata)
    VALUES (auth.uid(), v_desk, 'active', '{}'::jsonb)
    RETURNING * INTO v_mp;
  END IF;

  SELECT * INTO v_row FROM public.person_verification_profiles WHERE marketplace_profile_id = v_mp.id;
  IF NOT FOUND THEN
    SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
    INSERT INTO public.person_verification_profiles (
      marketplace_profile_id, auth_user_id, email, verification_level
    ) VALUES (
      v_mp.id, auth.uid(), v_email, CASE WHEN v_email IS NOT NULL THEN 0 ELSE 0 END
    )
    RETURNING * INTO v_row;
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_person_verification_profile(
  p_desk_role text,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base jsonb;
  v_row public.person_verification_profiles%ROWTYPE;
  v_linkedin text;
  v_level smallint;
BEGIN
  v_base := public.get_or_create_person_verification_profile(p_desk_role);
  SELECT * INTO v_row FROM public.person_verification_profiles WHERE id = (v_base->>'id')::uuid;

  IF v_row.verification_status = 'verified' THEN
    RETURN to_jsonb(v_row);
  END IF;

  v_linkedin := nullif(trim(p_payload->>'linkedin_url'), '');

  UPDATE public.person_verification_profiles SET
    full_name = COALESCE(nullif(trim(p_payload->>'full_name'), ''), full_name),
    country_code = COALESCE(nullif(trim(p_payload->>'country_code'), ''), country_code),
    linkedin_url = COALESCE(v_linkedin, linkedin_url),
    twitter_url = COALESCE(nullif(trim(p_payload->>'twitter_url'), ''), twitter_url),
    email = COALESCE(nullif(trim(p_payload->>'email'), ''), email),
    id_document_type = COALESCE(
      nullif(trim(p_payload->>'id_document_type'), ''),
      id_document_type
    ),
    updated_at = now()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  v_level := v_row.verification_level;
  IF v_linkedin IS NOT NULL AND v_linkedin ~* '^https?://' THEN
    v_level := GREATEST(v_level, 1);
  END IF;
  IF v_row.full_name IS NOT NULL AND v_row.country_code IS NOT NULL THEN
    v_level := GREATEST(v_level, 1);
  END IF;

  UPDATE public.person_verification_profiles SET verification_level = v_level WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_person_verification_profile(p_desk_role text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.person_verification_profiles%ROWTYPE;
BEGIN
  PERFORM public.get_or_create_person_verification_profile(p_desk_role);
  SELECT pvp.* INTO v_row
  FROM public.person_verification_profiles pvp
  JOIN public.marketplace_profiles mp ON mp.id = pvp.marketplace_profile_id
  WHERE mp.auth_user_id = auth.uid()
    AND mp.desk_role = public.marketplace_desk_role_for_person(p_desk_role);

  IF v_row.full_name IS NULL OR length(trim(v_row.full_name)) < 2 THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;
  IF v_row.country_code IS NULL OR length(trim(v_row.country_code)) < 2 THEN
    RAISE EXCEPTION 'Country is required';
  END IF;
  IF v_row.linkedin_url IS NULL OR v_row.linkedin_url !~* '^https?://' THEN
    RAISE EXCEPTION 'Valid LinkedIn URL is required';
  END IF;

  UPDATE public.person_verification_profiles SET
    verification_status = CASE
      WHEN verification_status = 'verified' THEN 'verified'
      ELSE 'pending'
    END,
    verification_level = GREATEST(verification_level, 1),
    updated_at = now()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.begin_person_identity_verification(
  p_desk_role text,
  p_id_document_type text DEFAULT 'passport'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.person_verification_profiles%ROWTYPE;
  v_session_id uuid := gen_random_uuid();
  v_doc text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  v_doc := lower(trim(p_id_document_type));
  IF v_doc NOT IN ('passport', 'national_id', 'driver_license') THEN
    RAISE EXCEPTION 'Invalid document type';
  END IF;

  PERFORM public.submit_person_verification_profile(p_desk_role);
  SELECT pvp.* INTO v_row
  FROM public.person_verification_profiles pvp
  JOIN public.marketplace_profiles mp ON mp.id = pvp.marketplace_profile_id
  WHERE mp.auth_user_id = auth.uid()
    AND mp.desk_role = public.marketplace_desk_role_for_person(p_desk_role);

  UPDATE public.person_verification_profiles SET
    id_document_type = v_doc,
    identity_provider = 'stripe_identity',
    updated_at = now()
  WHERE id = v_row.id;

  INSERT INTO public.identity_verification_sessions (
    id, person_verification_profile_id, auth_user_id, provider, status
  ) VALUES (
    v_session_id, v_row.id, auth.uid(), 'stripe_identity', 'pending'
  );

  RETURN jsonb_build_object(
    'session_id', v_session_id,
    'person_profile_id', v_row.id,
    'provider', 'stripe_identity',
    'status', 'pending'
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Webhook: person + listing identity
-- ---------------------------------------------------------------------------
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
  v_reg uuid;
  v_hash text;
BEGIN
  -- Replay protection registry (additive). If already processed, no-op.
  v_hash := encode(digest(coalesce(p_payload,'{}'::jsonb)::text, 'sha256'), 'hex');
  INSERT INTO public.webhook_event_registry (provider, event_id, payload_hash)
  VALUES (p_provider, p_external_event_id, v_hash)
  ON CONFLICT (provider, event_id) DO NOTHING
  RETURNING id INTO v_reg;
  IF v_reg IS NULL THEN
    RETURN;
  END IF;

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

  IF v_session.person_verification_profile_id IS NOT NULL THEN
    PERFORM public.apply_person_identity_verification_result(
      v_session.person_verification_profile_id,
      p_verified
    );
  ELSIF v_session.startup_id IS NOT NULL THEN
    PERFORM public.refresh_listing_gates_from_evidence(v_session.startup_id);
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Mandatory gates: founder person + domain + business email + revenue
-- ---------------------------------------------------------------------------
UPDATE public.listing_verification_gates
SET business_email_status = 'pending', updated_at = now()
WHERE business_email_status = 'not_required';

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
      AND COALESCE(g.verified_mrr, 0) > 0
      AND public.founder_person_verified_for_auth(s.founder_user_id)
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
    OR g.revenue_status = 'failed'
    OR g.business_email_status = 'failed';

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
  v_founder_user_id uuid;
  v_founder_person boolean := false;
BEGIN
  PERFORM public.ensure_listing_gates_row(p_startup_id);

  SELECT founder_user_id INTO v_founder_user_id FROM public.startups WHERE id = p_startup_id;
  IF v_founder_user_id IS NOT NULL THEN
    v_founder_person := public.founder_person_verified_for_auth(v_founder_user_id);
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

-- Trust score v2 weights (100 = founder 20 + domain 20 + revenue 30 + email 20 + fraud 10)
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
  IF g.revenue_status = 'verified' AND COALESCE(g.verified_mrr, 0) > 0 THEN
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

GRANT EXECUTE ON FUNCTION public.get_or_create_person_verification_profile(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_person_verification_profile(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_person_verification_profile(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.begin_person_identity_verification(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_person_verified_for_auth(uuid) TO authenticated, anon;

NOTIFY pgrst, 'reload schema';

COMMIT;
