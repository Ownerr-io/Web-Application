-- Supabase BaaS: marketplace desk uses RPC/RLS only. Async verification (email, identity, jobs)
-- is optional — return structured JSON instead of hard-failing when no invoke URL is stored.

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
    RETURN jsonb_build_object(
      'configured', false,
      'message',
      'Async verification job processing is not configured. Store verification_invoke_url in platform_internal_config when you add Supabase Edge Functions or same-origin serverless routes.'
    );
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
    'configured', true,
    'client_launch', jsonb_build_object(
      'endpoint', v_endpoint,
      'launch_token', v_plain,
      'startup_id', p_startup_id
    )
  );
END;
$$;

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
    RETURN jsonb_build_object(
      'session_id', p_session_id,
      'status', 'launch_unavailable',
      'configured', false,
      'message',
      'Identity launch is not configured. Add a verification invoke URL in platform_internal_config (Supabase Edge Function or same-origin /api route).'
    );
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
    'configured', true,
    'client_launch', jsonb_build_object(
      'endpoint', v_endpoint,
      'launch_token', v_plain
    )
  );
END;
$$;

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
    RETURN jsonb_build_object(
      'verification_id', p_verification_id,
      'email', v_row.email,
      'configured', false,
      'message',
      'Business email send is not configured. Add a verification invoke URL in platform_internal_config (Supabase Edge Function or same-origin /api route).'
    );
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
    'configured', true,
    'client_launch', jsonb_build_object(
      'endpoint', v_endpoint,
      'launch_token', v_plain,
      'email_token', v_email_token
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.founder_invoke_sync_worker(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_launch_identity_verification(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_launch_business_email_send(uuid) TO authenticated;
