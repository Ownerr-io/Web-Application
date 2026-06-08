-- Domain DNS: allow retries (pending challenge), fix gate stuck on first fail,
-- re-queue domain_check on "Validate all", browser invoke sync worker in local dev.

BEGIN;

CREATE TABLE IF NOT EXISTS public.sync_worker_launch_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startups (id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sync_worker_launch_tokens_hash_idx
  ON public.sync_worker_launch_tokens (token_hash)
  WHERE consumed_at IS NULL;

ALTER TABLE public.sync_worker_launch_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sync_worker_launch_tokens_service ON public.sync_worker_launch_tokens;
CREATE POLICY sync_worker_launch_tokens_service ON public.sync_worker_launch_tokens
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.consume_sync_worker_launch_token(
  p_token text,
  p_startup_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_id uuid;
  v_hash text;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
    RETURN false;
  END IF;
  v_hash := encode(digest(trim(p_token), 'sha256'), 'hex');

  SELECT t.id INTO v_id
  FROM public.sync_worker_launch_tokens t
  WHERE t.token_hash = v_hash
    AND t.startup_id = p_startup_id
    AND t.consumed_at IS NULL
    AND t.expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.sync_worker_launch_tokens SET consumed_at = now() WHERE id = v_id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_sync_worker_launch_token(text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.founder_invoke_sync_worker(p_startup_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_base text;
  v_endpoint text;
  v_plain text;
  v_hash text;
BEGIN
  IF NOT public.startup_owned_by_auth(p_startup_id) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT value INTO v_base
  FROM public.platform_internal_config
  WHERE key = 'sync_worker_public_url';

  IF v_base IS NULL OR length(trim(v_base)) < 8 THEN
    SELECT regexp_replace(trim(value), '/v1/process-jobs$', '')
    INTO v_base
    FROM public.platform_internal_config
    WHERE key = 'sync_worker_invoke_url';
  END IF;

  IF v_base IS NULL OR length(trim(v_base)) < 8 THEN
    RAISE EXCEPTION 'Verification worker not configured. Set SYNC_WORKER_INVOKE_URL via npm run platform:set-integration-secrets.';
  END IF;

  v_base := trim(v_base);
  IF v_base LIKE '%/v1/process-jobs' THEN
    v_base := regexp_replace(v_base, '/v1/process-jobs$', '');
  END IF;
  v_endpoint := v_base || '/v1/process-jobs';

  v_plain := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_plain, 'sha256'), 'hex');

  INSERT INTO public.sync_worker_launch_tokens (startup_id, token_hash, expires_at)
  VALUES (p_startup_id, v_hash, now() + interval '10 minutes');

  RETURN jsonb_build_object(
    'client_launch', jsonb_build_object(
      'endpoint', v_endpoint,
      'launch_token', v_plain,
      'startup_id', p_startup_id
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.founder_invoke_sync_worker(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.domain_verification_apply_result(
  p_challenge_id uuid,
  p_pass boolean,
  p_evidence jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ch public.domain_verification_challenges%ROWTYPE;
  v_provider_id uuid;
BEGIN
  SELECT * INTO v_ch FROM public.domain_verification_challenges WHERE id = p_challenge_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Challenge not found'; END IF;

  UPDATE public.domain_verification_challenges
  SET status = CASE WHEN p_pass THEN 'verified' ELSE 'pending' END,
      verified_at = CASE WHEN p_pass THEN now() ELSE NULL END
  WHERE id = p_challenge_id;

  SELECT id INTO v_provider_id FROM public.verification_providers WHERE slug = 'domain';

  INSERT INTO public.verification_results (
    startup_id, provider_id, dimension, status, summary, evidence_ref, valid_from, valid_until
  ) VALUES (
    v_ch.startup_id,
    v_provider_id,
    'domain',
    CASE WHEN p_pass THEN 'pass' ELSE 'fail' END,
    jsonb_build_object('domain', v_ch.domain, 'method', v_ch.method, 'host', v_ch.host),
    p_evidence,
    CASE WHEN p_pass THEN now() ELSE NULL END,
    CASE WHEN p_pass THEN now() + interval '365 days' ELSE NULL END
  );

  PERFORM public.recompute_startup_trust(v_ch.startup_id);
  PERFORM public.refresh_listing_gates_from_evidence(v_ch.startup_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.integration_request_sync(p_connection_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conn public.integration_connections%ROWTYPE;
  v_provider_slug text;
  v_ch public.domain_verification_challenges%ROWTYPE;
BEGIN
  SELECT * INTO v_conn FROM public.integration_connections WHERE id = p_connection_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Connection not found'; END IF;
  IF NOT public.startup_owned_by_auth(v_conn.startup_id) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT vp.slug INTO v_provider_slug
  FROM public.verification_providers vp
  WHERE vp.id = v_conn.provider_id;

  IF v_provider_slug = 'domain' THEN
    SELECT * INTO v_ch
    FROM public.domain_verification_challenges
    WHERE startup_id = v_conn.startup_id
      AND status = 'pending'
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
      RETURN public.enqueue_integration_sync(
        p_connection_id,
        'domain_check',
        jsonb_build_object(
          'challenge_id', v_ch.id,
          'host', v_ch.host,
          'expected_record', v_ch.expected_record,
          'method', v_ch.method,
          'sync_type', 'domain_check'
        )
      );
    END IF;

    RETURN NULL;
  END IF;

  RETURN public.enqueue_integration_sync(
    p_connection_id,
    'sync',
    jsonb_build_object('sync_type', 'incremental')
  );
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
BEGIN
  PERFORM public.ensure_listing_gates_row(p_startup_id);

  SELECT EXISTS (
    SELECT 1 FROM public.verification_results r
    WHERE r.startup_id = p_startup_id AND r.dimension = 'domain'
      AND r.status = 'pass'
      AND (r.valid_until IS NULL OR r.valid_until > now())
  ) OR EXISTS (
    SELECT 1 FROM public.domain_verification_challenges c
    WHERE c.startup_id = p_startup_id AND c.status = 'verified'
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
      WHEN v_domain_pending THEN 'pending'
      WHEN v_latest_domain_status = 'fail' THEN 'failed'
      ELSE COALESCE(g.domain_status, 'pending')
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

-- Unstick listings stuck on domain failed while a pending challenge exists
UPDATE public.listing_verification_gates g
SET domain_status = 'pending', updated_at = now()
WHERE g.domain_status = 'failed'
  AND EXISTS (
    SELECT 1 FROM public.domain_verification_challenges c
    WHERE c.startup_id = g.startup_id
      AND c.status = 'pending'
      AND c.expires_at > now()
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
