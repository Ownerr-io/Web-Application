-- Sync worker invoke rate limits, reusable launch tokens, dedupe pending domain jobs.

BEGIN;

ALTER TABLE public.sys_sync_worker_launch_tokens
  ADD COLUMN IF NOT EXISTS use_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_uses integer NOT NULL DEFAULT 16;

CREATE TABLE IF NOT EXISTS public.sys_sync_worker_invoke_log (
  id bigserial PRIMARY KEY,
  auth_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  startup_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sys_sync_worker_invoke_log_user_startup_time_idx
  ON public.sys_sync_worker_invoke_log (auth_user_id, startup_id, occurred_at DESC);

ALTER TABLE public.sys_sync_worker_invoke_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_sync_worker_invoke_log FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sys_sync_worker_invoke_log_service ON public.sys_sync_worker_invoke_log;
CREATE POLICY sys_sync_worker_invoke_log_service ON public.sys_sync_worker_invoke_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON public.sys_sync_worker_invoke_log FROM anon, authenticated;

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
  v_row public.sys_sync_worker_launch_tokens%ROWTYPE;
  v_hash text;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
    RETURN false;
  END IF;
  v_hash := encode(digest(trim(p_token), 'sha256'), 'hex');

  SELECT * INTO v_row
  FROM public.sys_sync_worker_launch_tokens t
  WHERE t.token_hash = v_hash
    AND t.startup_id = p_startup_id
    AND t.expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_row.consumed_at IS NOT NULL AND v_row.use_count >= COALESCE(v_row.max_uses, 16) THEN
    RETURN false;
  END IF;

  UPDATE public.sys_sync_worker_launch_tokens
  SET use_count = use_count + 1,
      consumed_at = COALESCE(consumed_at, now())
  WHERE id = v_row.id;

  RETURN true;
END;
$$;

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
  v_uid uuid := auth.uid();
  v_recent integer;
BEGIN
  IF NOT public.startup_owned_by_auth(p_startup_id) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_uid IS NOT NULL AND NOT public.is_platform_admin() THEN
    SELECT count(*)::int INTO v_recent
    FROM public.sys_sync_worker_invoke_log l
    WHERE l.auth_user_id = v_uid
      AND l.startup_id = p_startup_id
      AND l.occurred_at > now() - interval '1 minute';

    IF v_recent >= 15 THEN
      RAISE EXCEPTION 'RATE_LIMITED'
        USING ERRCODE = 'P0001',
        DETAIL = jsonb_build_object('retry_after_seconds', 60)::text;
    END IF;

    INSERT INTO public.sys_sync_worker_invoke_log (auth_user_id, startup_id)
    VALUES (v_uid, p_startup_id);
  END IF;

  SELECT value INTO v_base
  FROM public.sys_platform_config
  WHERE key = 'sync_worker_public_url';

  IF v_base IS NULL OR length(trim(v_base)) < 8 THEN
    SELECT regexp_replace(trim(value), '/v1/process-jobs$', '')
    INTO v_base
    FROM public.sys_platform_config
    WHERE key = 'sync_worker_invoke_url';
  END IF;

  IF v_base IS NULL OR length(trim(v_base)) < 8 THEN
    RETURN jsonb_build_object(
      'configured', false,
      'message',
      'Async verification job processing is not configured. Set sync_worker_public_url in sys_platform_config when you add Supabase Edge Functions or same-origin serverless routes.'
    );
  END IF;

  v_base := trim(v_base);
  IF v_base LIKE '%/v1/process-jobs' THEN
    v_base := regexp_replace(v_base, '/v1/process-jobs$', '');
  END IF;
  v_endpoint := v_base || '/v1/process-jobs';

  v_plain := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_plain, 'sha256'), 'hex');

  INSERT INTO public.sys_sync_worker_launch_tokens (
    startup_id, token_hash, expires_at, use_count, max_uses
  )
  VALUES (p_startup_id, v_hash, now() + interval '10 minutes', 0, 16);

  RETURN jsonb_build_object(
    'configured', true,
    'client_launch', jsonb_build_object(
      'endpoint', v_endpoint,
      'launch_token', v_plain,
      'startup_id', p_startup_id
    )
  );
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
  v_id uuid;
  v_challenge_id text;
BEGIN
  v_challenge_id := nullif(trim(p_payload->>'challenge_id'), '');

  IF v_challenge_id IS NOT NULL THEN
    SELECT j.id INTO v_id
    FROM public.trust_integration_jobs j
    WHERE j.connection_id = p_connection_id
      AND j.job_type = p_job_type
      AND j.status IN ('pending', 'claimed')
      AND j.payload->>'challenge_id' = v_challenge_id
    ORDER BY j.created_at DESC
    LIMIT 1;
    IF v_id IS NOT NULL THEN
      RETURN v_id;
    END IF;
  ELSIF p_job_type = 'domain_check' THEN
    SELECT j.id INTO v_id
    FROM public.trust_integration_jobs j
    WHERE j.connection_id = p_connection_id
      AND j.job_type = 'domain_check'
      AND j.status IN ('pending', 'claimed')
      AND j.created_at > now() - interval '45 seconds'
    ORDER BY j.created_at DESC
    LIMIT 1;
    IF v_id IS NOT NULL THEN
      RETURN v_id;
    END IF;
  END IF;

  v_id := gen_random_uuid();

  INSERT INTO public.trust_integration_jobs (id, connection_id, job_type, payload)
  VALUES (v_id, p_connection_id, p_job_type, p_payload);

  INSERT INTO public.trust_integration_sync_runs (connection_id, sync_type, status)
  VALUES (
    p_connection_id,
    COALESCE(p_payload->>'sync_type', 'full'),
    'queued'
  );

  PERFORM public.try_invoke_sync_worker();
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_sync_worker_launch_token(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.founder_invoke_sync_worker(uuid) TO authenticated;

COMMIT;
