-- One active domain method per startup: TXT on the seller's hostname (expire stale CNAME).

BEGIN;

CREATE OR REPLACE FUNCTION public.domain_verification_begin(
  p_startup_id uuid,
  p_domain text,
  p_method text DEFAULT 'txt'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug text;
  v_domain text;
  v_token text;
  v_host text;
  v_expected text;
  v_id uuid;
BEGIN
  IF NOT public.startup_owned_by_auth(p_startup_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_method NOT IN ('txt', 'cname') THEN
    RAISE EXCEPTION 'Invalid method';
  END IF;

  v_domain := public.normalize_verification_domain(p_domain);
  IF length(v_domain) < 4 OR v_domain !~ '\.' THEN
    RAISE EXCEPTION 'Enter a valid domain (e.g. clykur.com or app.clykur.com)';
  END IF;

  -- Only one pending challenge at a time (avoid CNAME vs TXT fighting on validate-all).
  UPDATE public.domain_verification_challenges
  SET status = 'expired'
  WHERE startup_id = p_startup_id
    AND status = 'pending'
    AND method IS DISTINCT FROM p_method;

  SELECT slug INTO v_slug FROM public.startups WHERE id = p_startup_id;
  v_token := 'ownerr-verification=' || v_slug;

  IF p_method = 'txt' THEN
    v_host := v_domain;
    v_expected := v_token;
  ELSE
    v_host := '_ownerr.' || v_domain;
    v_expected := public.domain_verification_cname_target(p_startup_id);
  END IF;

  INSERT INTO public.domain_verification_challenges (
    startup_id, domain, method, expected_record, host, expires_at
  ) VALUES (
    p_startup_id, v_domain, p_method, v_expected, v_host, now() + interval '7 days'
  )
  ON CONFLICT (startup_id, method) DO UPDATE SET
    domain = EXCLUDED.domain,
    expected_record = EXCLUDED.expected_record,
    host = EXCLUDED.host,
    status = 'pending',
    verified_at = NULL,
    expires_at = EXCLUDED.expires_at,
    created_at = now()
  RETURNING id INTO v_id;

  INSERT INTO public.integration_connections (startup_id, provider_id, status, created_by)
  SELECT p_startup_id, vp.id, 'connected', auth.uid()
  FROM public.verification_providers vp WHERE vp.slug = 'domain'
  ON CONFLICT (startup_id, provider_id) DO UPDATE SET updated_at = now();

  PERFORM public.enqueue_integration_sync(
    (SELECT ic.id FROM public.integration_connections ic
     JOIN public.verification_providers vp ON vp.id = ic.provider_id
     WHERE ic.startup_id = p_startup_id AND vp.slug = 'domain'
     LIMIT 1),
    'domain_check',
    jsonb_build_object(
      'challenge_id', v_id,
      'host', v_host,
      'expected_record', v_expected,
      'method', p_method,
      'sync_type', 'domain_check'
    )
  );

  PERFORM public.append_verification_event(
    p_startup_id, 'domain_challenge_created', 'user',
    jsonb_build_object('domain', v_domain, 'method', p_method, 'host', v_host)
  );

  RETURN jsonb_build_object(
    'challenge_id', v_id,
    'domain', v_domain,
    'host', v_host,
    'expected_record', v_expected,
    'method', p_method
  );
END;
$$;

-- Prefer TXT for sellers already stuck on pending CNAME (no separate ownerr.live DNS to create).
UPDATE public.domain_verification_challenges
SET status = 'expired'
WHERE method = 'cname'
  AND status = 'pending';

COMMIT;
