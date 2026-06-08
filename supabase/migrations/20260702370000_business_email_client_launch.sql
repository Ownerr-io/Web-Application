-- Business email: browser launch to sync worker (local dev) + soft-fail pg_net on submit.

BEGIN;

CREATE TABLE IF NOT EXISTS public.business_email_launch_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id uuid NOT NULL REFERENCES public.business_email_verifications (id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS business_email_launch_tokens_hash_idx
  ON public.business_email_launch_tokens (token_hash)
  WHERE consumed_at IS NULL;

ALTER TABLE public.business_email_launch_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_email_launch_tokens_service ON public.business_email_launch_tokens;
CREATE POLICY business_email_launch_tokens_service ON public.business_email_launch_tokens
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.consume_business_email_launch_token(
  p_token text,
  p_verification_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
  v_id uuid;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
    RETURN false;
  END IF;
  v_hash := encode(digest(trim(p_token), 'sha256'), 'hex');

  SELECT t.id INTO v_id
  FROM public.business_email_launch_tokens t
  WHERE t.token_hash = v_hash
    AND t.verification_id = p_verification_id
    AND t.consumed_at IS NULL
    AND t.expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.business_email_launch_tokens SET consumed_at = now() WHERE id = v_id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_business_email_launch_token(text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.founder_launch_business_email_send(p_verification_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_row public.business_email_verifications%ROWTYPE;
  v_base text;
  v_endpoint text;
  v_plain text;
  v_hash text;
  v_email_token text;
BEGIN
  SELECT bev.* INTO v_row
  FROM public.business_email_verifications bev
  JOIN public.startups s ON s.id = bev.startup_id
  WHERE bev.id = p_verification_id
    AND s.founder_user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification not found or not authorized';
  END IF;

  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'Verification is not pending';
  END IF;

  v_email_token := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_email_token, 'sha256'), 'hex');

  UPDATE public.business_email_verifications SET
    verification_token_hash = v_hash,
    token_expires_at = now() + interval '48 hours'
  WHERE id = p_verification_id;

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
    RAISE EXCEPTION
      'Verification worker not configured. Set SYNC_WORKER_PUBLIC_URL or SYNC_WORKER_INVOKE_URL via npm run platform:set-integration-secrets.';
  END IF;

  v_base := trim(v_base);
  IF v_base LIKE '%/v1/process-jobs' THEN
    v_base := regexp_replace(v_base, '/v1/process-jobs$', '');
  END IF;
  v_endpoint := v_base || '/v1/verification/send-business-email';

  v_plain := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_plain, 'sha256'), 'hex');

  INSERT INTO public.business_email_launch_tokens (verification_id, token_hash, expires_at)
  VALUES (p_verification_id, v_hash, now() + interval '15 minutes');

  RETURN jsonb_build_object(
    'verification_id', p_verification_id,
    'email', v_row.email,
    'client_launch', jsonb_build_object(
      'endpoint', v_endpoint,
      'launch_token', v_plain,
      'email_token', v_email_token
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.founder_launch_business_email_send(uuid) TO authenticated;

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

  BEGIN
    PERFORM public.try_invoke_business_email_send(v_id, v_token);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  PERFORM public.refresh_listing_gates_from_evidence(p_startup_id);

  RETURN jsonb_build_object(
    'verification_id', v_id,
    'email', lower(trim(p_email)),
    'expires_at', now() + interval '48 hours'
  );
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
