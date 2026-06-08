-- Fix pg_net http_post (body must be jsonb). Identity launch uses browser → worker with one-time tokens.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.identity_launch_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.identity_verification_sessions (id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS identity_launch_tokens_hash_idx
  ON public.identity_launch_tokens (token_hash)
  WHERE consumed_at IS NULL;

ALTER TABLE public.identity_launch_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS identity_launch_tokens_service ON public.identity_launch_tokens;
CREATE POLICY identity_launch_tokens_service ON public.identity_launch_tokens
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.consume_identity_launch_token(
  p_token text,
  p_session_id uuid
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
  FROM public.identity_launch_tokens t
  WHERE t.token_hash = v_hash
    AND t.session_id = p_session_id
    AND t.consumed_at IS NULL
    AND t.expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.identity_launch_tokens SET consumed_at = now() WHERE id = v_id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_identity_launch_token(text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.founder_launch_identity_verification(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_row public.identity_verification_sessions%ROWTYPE;
  v_base text;
  v_endpoint text;
  v_plain text;
  v_hash text;
BEGIN
  SELECT * INTO v_row FROM public.identity_verification_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF v_row.auth_user_id <> auth.uid() THEN RAISE EXCEPTION 'Not authorized'; END IF;

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
    RAISE EXCEPTION 'Verification worker not configured. Set SYNC_WORKER_INVOKE_URL (or SYNC_WORKER_PUBLIC_URL) via npm run platform:set-integration-secrets.';
  END IF;

  v_base := trim(v_base);
  IF v_base LIKE '%/v1/process-jobs' THEN
    v_base := regexp_replace(v_base, '/v1/process-jobs$', '');
  END IF;
  v_endpoint := v_base || '/v1/identity/session';

  v_plain := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_plain, 'sha256'), 'hex');

  INSERT INTO public.identity_launch_tokens (session_id, token_hash, expires_at)
  VALUES (p_session_id, v_hash, now() + interval '15 minutes');

  RETURN jsonb_build_object(
    'session_id', p_session_id,
    'status', 'launching',
    'client_launch', jsonb_build_object(
      'endpoint', v_endpoint,
      'launch_token', v_plain
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.founder_launch_identity_verification(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.try_invoke_business_email_send(
  p_verification_id uuid,
  p_plain_token text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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
    )
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.try_invoke_registration_ocr(p_document_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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
    body := jsonb_build_object('document_id', p_document_id)
  );
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
