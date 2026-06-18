-- Schema v2 dropped platform_internal_config compat view (20260702530000) but many RPCs
-- still read public.platform_internal_config. Restore compat + fix founder_invoke_sync_worker.

BEGIN;

CREATE OR REPLACE VIEW public.platform_internal_config
WITH (security_invoker = true)
AS
SELECT * FROM public.sys_platform_config;

COMMENT ON VIEW public.platform_internal_config IS
  'Compat view for legacy RPC bodies; canonical table is sys_platform_config.';

GRANT SELECT ON public.platform_internal_config TO authenticated, service_role;

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
    IF to_regclass('public.sys_sync_worker_invoke_log') IS NOT NULL THEN
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
      'Async verification job processing is not configured. Set sync_worker_public_url in sys_platform_config (npm run platform:set-integration-secrets).'
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

GRANT EXECUTE ON FUNCTION public.founder_invoke_sync_worker(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
