-- Per-listing CNAME targets (not one global verify.ownerr.live), normalize domains, pending challenge read RPC.

BEGIN;

CREATE OR REPLACE FUNCTION public.normalize_verification_domain(p_domain text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(
    regexp_replace(
      split_part(
        regexp_replace(trim(coalesce(p_domain, '')), '^https?://', '', 'i'),
        '/',
        1
      ),
      '\.$',
      ''
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.domain_verification_cname_target(p_startup_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_slug text;
  v_label text;
  v_suffix text;
BEGIN
  SELECT s.slug INTO v_slug FROM public.startups s WHERE s.id = p_startup_id;
  IF v_slug IS NULL THEN
    RAISE EXCEPTION 'Startup not found';
  END IF;

  v_label := lower(regexp_replace(v_slug, '[^a-z0-9-]', '-', 'g'));
  v_label := trim(both '-' from v_label);
  IF length(v_label) < 2 THEN
    v_label := 'listing';
  END IF;
  IF length(v_label) > 48 THEN
    v_label := left(v_label, 48);
  END IF;

  SELECT value INTO v_suffix
  FROM public.platform_internal_config
  WHERE key = 'domain_verification_cname_suffix';

  v_suffix := coalesce(nullif(trim(v_suffix), ''), 'verify.ownerr.live');

  RETURN v_label || '.' || v_suffix;
END;
$$;

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
    expires_at = EXCLUDED.expires_at
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

-- Align open CNAME challenges that still use the legacy global target.
UPDATE public.domain_verification_challenges d
SET expected_record = public.domain_verification_cname_target(d.startup_id)
WHERE d.method = 'cname'
  AND d.status = 'pending'
  AND d.expires_at > now()
  AND d.expected_record = 'verify.ownerr.live';

CREATE OR REPLACE FUNCTION public.domain_verification_pending(p_startup_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.domain_verification_challenges%ROWTYPE;
BEGIN
  IF NOT public.startup_owned_by_auth(p_startup_id) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_row
  FROM public.domain_verification_challenges
  WHERE startup_id = p_startup_id
    AND status = 'pending'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'challenge_id', v_row.id,
    'domain', v_row.domain,
    'host', v_row.host,
    'expected_record', v_row.expected_record,
    'method', v_row.method
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.normalize_verification_domain(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.domain_verification_cname_target(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.domain_verification_pending(uuid) TO authenticated;

COMMIT;
