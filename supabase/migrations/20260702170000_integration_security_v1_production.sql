-- Integration security v1: peppered encryption key, secret fingerprints, auto worker invoke (pg_net).

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

ALTER TABLE public.integration_credentials
  ADD COLUMN IF NOT EXISTS secret_fingerprint text;

COMMENT ON COLUMN public.integration_credentials.secret_fingerprint IS
  'SHA-256 hex of plaintext secret at store time; one-way, for audit/dedup only — not used to call providers.';

CREATE OR REPLACE FUNCTION public.integration_secret_fingerprint(p_plain text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public, extensions
AS $$
  SELECT encode(digest(coalesce(p_plain, ''), 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.platform_encryption_key()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  k text;
  pepper text;
BEGIN
  SELECT value INTO k
  FROM public.platform_internal_config
  WHERE key = 'integration_encryption_key';

  IF k IS NULL OR length(k) < 32 THEN
    RAISE EXCEPTION 'integration_encryption_key not configured on platform';
  END IF;

  SELECT value INTO pepper
  FROM public.platform_internal_config
  WHERE key = 'integration_encryption_pepper';

  IF pepper IS NOT NULL AND length(trim(pepper)) >= 16 THEN
    RETURN encode(digest(trim(pepper) || '|' || k, 'sha256'), 'hex');
  END IF;

  RETURN k;
END;
$$;

CREATE OR REPLACE FUNCTION public.try_invoke_sync_worker()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url text;
  v_secret text;
  v_request_id bigint;
BEGIN
  SELECT value INTO v_url
  FROM public.platform_internal_config
  WHERE key = 'sync_worker_invoke_url';

  SELECT value INTO v_secret
  FROM public.platform_internal_config
  WHERE key = 'sync_worker_invoke_secret';

  IF v_url IS NULL OR length(trim(v_url)) < 8 THEN
    RETURN;
  END IF;
  IF v_secret IS NULL OR length(v_secret) < 16 THEN
    RETURN;
  END IF;

  SELECT net.http_post(
    url := trim(v_url),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := jsonb_build_object('max_jobs', 8)
  ) INTO v_request_id;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_integration_sync(
  p_connection_id uuid,
  p_job_type text DEFAULT 'sync',
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.integration_sync_jobs (id, connection_id, job_type, payload)
  VALUES (v_id, p_connection_id, p_job_type, p_payload);

  INSERT INTO public.integration_syncs (connection_id, sync_type, status)
  VALUES (
    p_connection_id,
    COALESCE(p_payload->>'sync_type', 'full'),
    'queued'
  );

  PERFORM public.try_invoke_sync_worker();
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.integration_connect_api_key(
  p_startup_id uuid,
  p_provider_slug text,
  p_api_key text,
  p_external_account_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_provider public.verification_providers%ROWTYPE;
  v_conn public.integration_connections%ROWTYPE;
  v_key text;
  v_cipher bytea;
  v_fp text;
BEGIN
  IF NOT public.startup_owned_by_auth(p_startup_id) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized for startup';
  END IF;
  IF p_api_key IS NULL OR length(trim(p_api_key)) < 8 THEN
    RAISE EXCEPTION 'Invalid API key';
  END IF;

  SELECT * INTO v_provider FROM public.verification_providers
  WHERE slug = p_provider_slug AND is_enabled = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown provider';
  END IF;
  IF v_provider.auth_type <> 'api_key' THEN
    RAISE EXCEPTION 'Provider does not accept API keys';
  END IF;

  v_key := public.platform_encryption_key();
  v_cipher := pgp_sym_encrypt(p_api_key, v_key);
  v_fp := public.integration_secret_fingerprint(p_api_key);

  INSERT INTO public.integration_connections (
    startup_id, provider_id, status, external_account_id, created_by, health_status
  ) VALUES (
    p_startup_id, v_provider.id, 'pending', p_external_account_id, auth.uid(), 'unknown'
  )
  ON CONFLICT (startup_id, provider_id) DO UPDATE SET
    status = 'pending',
    external_account_id = COALESCE(EXCLUDED.external_account_id, integration_connections.external_account_id),
    updated_at = now()
  RETURNING * INTO v_conn;

  INSERT INTO public.integration_credentials (
    connection_id, credential_type, secret_ciphertext, secret_fingerprint
  ) VALUES (v_conn.id, 'api_key', v_cipher, v_fp)
  ON CONFLICT (connection_id) DO UPDATE SET
    secret_ciphertext = EXCLUDED.secret_ciphertext,
    secret_fingerprint = EXCLUDED.secret_fingerprint,
    rotated_at = now();

  PERFORM public.append_audit_log(
    'integration_connection', v_conn.id, 'connect_api_key', NULL,
    jsonb_build_object(
      'provider', p_provider_slug,
      'startup_id', p_startup_id,
      'secret_fingerprint', v_fp
    )
  );
  PERFORM public.enqueue_integration_sync(v_conn.id, 'sync', jsonb_build_object('sync_type', 'full'));

  RETURN jsonb_build_object('connection_id', v_conn.id, 'status', v_conn.status);
END;
$$;

CREATE OR REPLACE FUNCTION public.integration_complete_oauth(
  p_startup_id uuid,
  p_provider_slug text,
  p_token_bundle jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_provider public.verification_providers%ROWTYPE;
  v_conn public.integration_connections%ROWTYPE;
  v_key text;
  v_cipher bytea;
  v_plain text;
  v_fp text;
BEGIN
  IF NOT public.startup_owned_by_auth(p_startup_id) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO v_provider FROM public.verification_providers
  WHERE slug = p_provider_slug AND is_enabled = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown provider'; END IF;

  v_plain := p_token_bundle::text;
  v_key := public.platform_encryption_key();
  v_cipher := pgp_sym_encrypt(v_plain, v_key);
  v_fp := public.integration_secret_fingerprint(v_plain);

  INSERT INTO public.integration_connections (startup_id, provider_id, status, created_by)
  VALUES (p_startup_id, v_provider.id, 'connected', auth.uid())
  ON CONFLICT (startup_id, provider_id) DO UPDATE SET status = 'connected', updated_at = now()
  RETURNING * INTO v_conn;

  INSERT INTO public.integration_credentials (
    connection_id, credential_type, secret_ciphertext, secret_fingerprint, expires_at
  )
  VALUES (
    v_conn.id,
    'oauth_bundle',
    v_cipher,
    v_fp,
    (p_token_bundle->>'expires_at')::timestamptz
  )
  ON CONFLICT (connection_id) DO UPDATE SET
    secret_ciphertext = EXCLUDED.secret_ciphertext,
    secret_fingerprint = EXCLUDED.secret_fingerprint,
    expires_at = EXCLUDED.expires_at,
    rotated_at = now();

  PERFORM public.enqueue_integration_sync(v_conn.id, 'sync', jsonb_build_object('sync_type', 'full'));
  RETURN jsonb_build_object('connection_id', v_conn.id);
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
