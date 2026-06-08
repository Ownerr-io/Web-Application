-- Enterprise ops hardening (post P0–P4): observability, rate limits, search, storage, verification cases, offers.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- Phase 1: Observability
-- ---------------------------------------------------------------------------
ALTER TABLE public.api_request_logs
  ADD COLUMN IF NOT EXISTS route text,
  ADD COLUMN IF NOT EXISTS error_code text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.sys_audit_logs
  ADD COLUMN IF NOT EXISTS request_id uuid;

CREATE INDEX IF NOT EXISTS sys_audit_logs_request_id_idx
  ON public.sys_audit_logs (request_id, created_at DESC)
  WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS api_request_logs_request_id_idx
  ON public.api_request_logs (request_id, created_at DESC)
  WHERE request_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.api_slow_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  route text,
  rpc_name text NOT NULL,
  duration_ms integer NOT NULL,
  threshold_ms integer NOT NULL DEFAULT 500,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_slow_queries_created_idx
  ON public.api_slow_queries (created_at DESC);

ALTER TABLE public.api_slow_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_slow_queries FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS api_slow_queries_admin ON public.api_slow_queries;
CREATE POLICY api_slow_queries_admin ON public.api_slow_queries
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

REVOKE INSERT, UPDATE, DELETE ON public.api_slow_queries FROM anon, authenticated;
GRANT INSERT ON public.api_slow_queries TO service_role, authenticated;

CREATE OR REPLACE FUNCTION public.api_log_client_request(
  p_request_id uuid,
  p_rpc_name text,
  p_route text DEFAULT NULL,
  p_duration_ms integer DEFAULT NULL,
  p_status text DEFAULT 'ok',
  p_error_code text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_threshold integer := 500;
BEGIN
  IF p_request_id IS NULL OR length(trim(p_rpc_name)) = 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.api_request_logs (
    request_id, user_id, rpc_name, route, duration_ms, status, error_code, metadata
  )
  VALUES (
    p_request_id,
    auth.uid(),
    trim(p_rpc_name),
    nullif(trim(p_route), ''),
    p_duration_ms,
    coalesce(nullif(trim(p_status), ''), 'ok'),
    nullif(trim(p_error_code), ''),
    coalesce(p_metadata, '{}'::jsonb)
  );

  IF p_duration_ms IS NOT NULL AND p_duration_ms >= v_threshold THEN
    INSERT INTO public.api_slow_queries (
      request_id, user_id, route, rpc_name, duration_ms, threshold_ms, metadata
    )
    VALUES (
      p_request_id,
      auth.uid(),
      nullif(trim(p_route), ''),
      trim(p_rpc_name),
      p_duration_ms,
      v_threshold,
      coalesce(p_metadata, '{}'::jsonb)
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.api_log_client_request(uuid, text, text, integer, text, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_slow_query_summary(p_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  RETURN coalesce(
    (
      SELECT jsonb_agg(row ORDER BY (row->>'avgMs')::int DESC)
      FROM (
        SELECT jsonb_build_object(
          'rpcName', rpc_name,
          'route', route,
          'count', count(*)::int,
          'avgMs', round(avg(duration_ms))::int,
          'maxMs', max(duration_ms)::int
        ) AS row
        FROM public.api_slow_queries
        WHERE created_at > now() - make_interval(days => greatest(1, least(coalesce(p_days, 7), 90)))
        GROUP BY rpc_name, route
        ORDER BY avg(duration_ms) DESC
        LIMIT 30
      ) t
    ),
    '[]'::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_slow_query_summary(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_platform_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_db_ok boolean := true;
  v_storage_ok boolean := true;
  v_auth_ok boolean := true;
  v_rpc_latency jsonb := '[]'::jsonb;
  v_queue_depth integer := 0;
  v_error_rate numeric := 0;
  v_active_users integer := 0;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  BEGIN
    PERFORM 1 FROM public.users LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_db_ok := false;
  END;

  BEGIN
    PERFORM 1 FROM storage.buckets LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_storage_ok := false;
  END;

  BEGIN
    PERFORM 1 FROM auth.users LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_auth_ok := false;
  END;

  SELECT coalesce(jsonb_agg(row), '[]'::jsonb)
  INTO v_rpc_latency
  FROM (
    SELECT jsonb_build_object(
      'rpcName', rpc_name,
      'avgMs', round(avg(duration_ms))::int,
      'p95Ms', round(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms))::int
    ) AS row
    FROM public.api_request_logs
    WHERE created_at > now() - interval '24 hours'
      AND duration_ms IS NOT NULL
    GROUP BY rpc_name
    ORDER BY avg(duration_ms) DESC
    LIMIT 15
  ) s;

  IF to_regclass('public.integration_sync_jobs') IS NOT NULL THEN
    SELECT count(*)::int INTO v_queue_depth
    FROM public.integration_sync_jobs
    WHERE status IN ('pending', 'queued', 'running');
  END IF;

  SELECT
    CASE WHEN count(*) = 0 THEN 0
         ELSE round(100.0 * count(*) FILTER (WHERE status <> 'ok') / count(*), 2)
    END,
    count(DISTINCT user_id)::int
  INTO v_error_rate, v_active_users
  FROM public.api_request_logs
  WHERE created_at > now() - interval '24 hours';

  RETURN jsonb_build_object(
    'database', jsonb_build_object('ok', v_db_ok),
    'storage', jsonb_build_object('ok', v_storage_ok),
    'auth', jsonb_build_object('ok', v_auth_ok),
    'rpc_latency', v_rpc_latency,
    'queue_depth', v_queue_depth,
    'error_rate', v_error_rate,
    'active_users', v_active_users
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_platform_health() TO authenticated;

CREATE OR REPLACE FUNCTION public.append_audit_log(
  p_subject_type text,
  p_subject_id uuid,
  p_action text,
  p_before jsonb DEFAULT NULL,
  p_after jsonb DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_request_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
  v_role text;
  v_ip_hash text;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  SELECT u.role INTO v_role FROM public.users u WHERE u.auth_user_id = auth.uid() LIMIT 1;

  IF p_ip_address IS NOT NULL AND length(trim(p_ip_address)) > 0 THEN
    v_ip_hash := encode(digest(trim(p_ip_address), 'sha256'), 'hex');
  END IF;

  INSERT INTO public.sys_audit_logs (
    id, subject_type, subject_id, action, actor_user_id, actor_role,
    ip_hash, before_state, after_state, request_id
  )
  VALUES (
    v_id, p_subject_type, p_subject_id, p_action, auth.uid(), v_role,
    v_ip_hash, p_before, p_after, p_request_id
  );
  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Phase 2: Tier limits + sliding window + abuse
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.api_tier_limits (
  tier text PRIMARY KEY,
  requests_per_minute integer NOT NULL,
  requests_per_hour integer NOT NULL,
  burst_per_minute integer NOT NULL
);

INSERT INTO public.api_tier_limits (tier, requests_per_minute, requests_per_hour, burst_per_minute)
VALUES
  ('free', 30, 200, 10),
  ('pro', 120, 2000, 50),
  ('enterprise', 600, 10000, 200),
  ('admin', 100000, 1000000, 100000)
ON CONFLICT (tier) DO UPDATE SET
  requests_per_minute = EXCLUDED.requests_per_minute,
  requests_per_hour = EXCLUDED.requests_per_hour,
  burst_per_minute = EXCLUDED.burst_per_minute;

CREATE TABLE IF NOT EXISTS public.api_rate_limit_events (
  id bigserial PRIMARY KEY,
  auth_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_rate_limit_events_user_endpoint_idx
  ON public.api_rate_limit_events (auth_user_id, endpoint, occurred_at DESC);

ALTER TABLE public.api_rate_limit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limit_events FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_rate_limit_events FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.api_abuse_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  abuse_type text NOT NULL,
  endpoint text,
  severity text NOT NULL DEFAULT 'warn',
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_abuse_events_user_created_idx
  ON public.api_abuse_events (auth_user_id, created_at DESC);

ALTER TABLE public.api_abuse_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_abuse_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS api_abuse_events_admin ON public.api_abuse_events;
CREATE POLICY api_abuse_events_admin ON public.api_abuse_events
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

REVOKE INSERT, UPDATE, DELETE ON public.api_abuse_events FROM anon, authenticated;
GRANT INSERT ON public.api_abuse_events TO service_role;

CREATE OR REPLACE FUNCTION public._api_record_abuse(
  p_type text,
  p_endpoint text,
  p_detail jsonb DEFAULT '{}'::jsonb,
  p_request_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.api_abuse_events (auth_user_id, abuse_type, endpoint, detail, request_id)
  VALUES (auth.uid(), p_type, p_endpoint, coalesce(p_detail, '{}'::jsonb), p_request_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.user_api_tier()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_platform_admin() THEN
    RETURN 'admin';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.user_products up
    WHERE up.user_id = (SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid() LIMIT 1)
      AND up.product_slug IN ('ownerr_enterprise', 'enterprise')
      AND up.status = 'active'
  ) THEN
    RETURN 'enterprise';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.trust_person_profiles p
    WHERE p.auth_user_id = auth.uid() AND p.verification_status = 'verified'
  ) THEN
    RETURN 'pro';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.marketplace_companies s
    WHERE s.founder_user_id = auth.uid()
      AND s.listing_lifecycle IN ('verified', 'published')
  ) THEN
    RETURN 'pro';
  END IF;
  RETURN 'free';
END;
$$;

CREATE OR REPLACE FUNCTION public.api_guard(
  p_endpoint text,
  p_request_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tier text;
  v_lim public.api_tier_limits%ROWTYPE;
  v_minute_count integer;
  v_hour_count integer;
  v_burst_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = '28000';
  END IF;

  v_tier := public.user_api_tier();
  IF v_tier = 'admin' THEN
    RETURN;
  END IF;

  SELECT * INTO v_lim FROM public.api_tier_limits WHERE tier = v_tier;
  IF NOT FOUND THEN
    SELECT * INTO v_lim FROM public.api_tier_limits WHERE tier = 'free';
  END IF;

  INSERT INTO public.api_rate_limit_events (auth_user_id, endpoint)
  VALUES (v_uid, p_endpoint);

  SELECT count(*)::int INTO v_minute_count
  FROM public.api_rate_limit_events e
  WHERE e.auth_user_id = v_uid
    AND e.endpoint = p_endpoint
    AND e.occurred_at > now() - interval '1 minute';

  SELECT count(*)::int INTO v_hour_count
  FROM public.api_rate_limit_events e
  WHERE e.auth_user_id = v_uid
    AND e.endpoint = p_endpoint
    AND e.occurred_at > now() - interval '1 hour';

  SELECT count(*)::int INTO v_burst_count
  FROM public.api_rate_limit_events e
  WHERE e.auth_user_id = v_uid
    AND e.endpoint = p_endpoint
    AND e.occurred_at > now() - interval '10 seconds';

  IF v_burst_count > v_lim.burst_per_minute THEN
    PERFORM public._api_record_abuse(
      'burst_limit',
      p_endpoint,
      jsonb_build_object('burst_count', v_burst_count, 'tier', v_tier),
      p_request_id
    );
    RAISE EXCEPTION 'RATE_LIMITED'
      USING ERRCODE = 'P0001',
      DETAIL = jsonb_build_object('retry_after_seconds', 10)::text;
  END IF;

  IF v_minute_count > v_lim.requests_per_minute OR v_hour_count > v_lim.requests_per_hour THEN
    IF p_endpoint LIKE '%offer%' AND v_minute_count > v_lim.requests_per_minute * 2 THEN
      PERFORM public._api_record_abuse('excessive_offers', p_endpoint, jsonb_build_object('count', v_minute_count), p_request_id);
    ELSIF p_endpoint LIKE '%message%' AND v_minute_count > v_lim.requests_per_minute * 2 THEN
      PERFORM public._api_record_abuse('excessive_messaging', p_endpoint, jsonb_build_object('count', v_minute_count), p_request_id);
    ELSIF p_endpoint LIKE '%verification%' AND v_minute_count > v_lim.requests_per_minute THEN
      PERFORM public._api_record_abuse('verification_abuse', p_endpoint, jsonb_build_object('count', v_minute_count), p_request_id);
    END IF;

    RAISE EXCEPTION 'RATE_LIMITED'
      USING ERRCODE = 'P0001',
      DETAIL = jsonb_build_object(
        'retry_after_seconds',
        greatest(1, extract(epoch FROM (date_trunc('minute', now()) + interval '1 minute' - now()))::int)
      )::text;
  END IF;

  DELETE FROM public.api_rate_limit_events
  WHERE occurred_at < now() - interval '2 hours';
END;
$$;

GRANT EXECUTE ON FUNCTION public.api_guard(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.api_guard(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Phase 3: Search v2 + search cache MV
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_marketplace_search_cache AS
SELECT
  s.id,
  s.slug,
  s.title,
  s.tagline,
  s.industry,
  s.asking_price,
  s.currency,
  s.listing_lifecycle,
  s.visibility,
  s.status,
  coalesce(s.metadata->>'country', s.metadata->>'hq_country', '') AS country,
  coalesce(ts.score, 0)::numeric AS trust_score,
  (
    coalesce(ts.score, 0) * 10
    + extract(epoch FROM s.updated_at) / 86400.0
  )::numeric AS ranking_score,
  s.created_at,
  s.updated_at
FROM public.marketplace_companies s
LEFT JOIN public.trust_company_scores ts ON ts.startup_id = s.id
WHERE s.visibility = 'public' AND s.status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS mv_marketplace_search_cache_id_idx
  ON public.mv_marketplace_search_cache (id);

CREATE INDEX IF NOT EXISTS mv_marketplace_search_cache_rank_idx
  ON public.mv_marketplace_search_cache (ranking_score DESC, id DESC);

REVOKE ALL ON public.mv_marketplace_search_cache FROM anon, authenticated;
GRANT SELECT ON public.mv_marketplace_search_cache TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_marketplace_search_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() AND auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_marketplace_search_cache;
  PERFORM public.refresh_marketplace_materialized_views();
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_marketplace_search_cache() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.marketplace_search_v2(
  p_query text DEFAULT '',
  p_industry text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_lifecycle text[] DEFAULT NULL,
  p_limit integer DEFAULT 24,
  p_cursor_score numeric DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_q text := trim(coalesce(p_query, ''));
  v_result jsonb;
BEGIN
  PERFORM public.api_guard('marketplace_search_v2');

  SELECT coalesce(jsonb_agg(row ORDER BY (row->>'rankingScore')::numeric DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', c.id,
      'slug', c.slug,
      'title', c.title,
      'tagline', c.tagline,
      'industry', c.industry,
      'country', c.country,
      'askingPrice', c.asking_price,
      'currency', c.currency,
      'listingLifecycle', c.listing_lifecycle,
      'trustScore', c.trust_score,
      'rankingScore', c.ranking_score,
      'createdAt', c.created_at
    ) AS row,
    c.ranking_score AS sort_score,
    c.id AS sort_id
    FROM public.mv_marketplace_search_cache c
    WHERE c.listing_lifecycle IN ('published', 'verified')
      AND (p_industry IS NULL OR p_industry = '' OR c.industry ILIKE p_industry)
      AND (p_country IS NULL OR p_country = '' OR c.country ILIKE p_country)
      AND (
        p_lifecycle IS NULL
        OR cardinality(p_lifecycle) = 0
        OR c.listing_lifecycle = ANY (p_lifecycle)
      )
      AND (
        v_q = ''
        OR c.title ILIKE '%' || v_q || '%'
        OR c.tagline ILIKE '%' || v_q || '%'
        OR c.slug ILIKE '%' || v_q || '%'
        OR similarity(c.title, v_q) > 0.2
      )
      AND (
        p_cursor_score IS NULL
        OR (c.ranking_score, c.id) < (p_cursor_score, p_cursor_id)
      )
    ORDER BY c.ranking_score DESC, c.id DESC
    LIMIT greatest(1, least(coalesce(p_limit, 24), 50))
  ) sub;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketplace_search_v2(text, text, text, text[], integer, numeric, uuid) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.marketplace_desk_inbox_bundle(p_limit integer DEFAULT 25)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.api_guard('marketplace_desk_inbox_bundle');
  RETURN jsonb_build_object(
    'conversations', public.marketplace_list_conversations(p_limit, NULL, NULL)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketplace_desk_inbox_bundle(integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- Phase 4: Storage hardening
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.storage_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL,
  object_path text NOT NULL,
  action text NOT NULL,
  auth_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  mime_type text,
  size_bytes bigint,
  request_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS storage_access_logs_bucket_path_idx
  ON public.storage_access_logs (bucket, object_path, created_at DESC);

ALTER TABLE public.storage_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_access_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS storage_access_logs_admin ON public.storage_access_logs;
CREATE POLICY storage_access_logs_admin ON public.storage_access_logs
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS storage_access_logs_own ON public.storage_access_logs;
CREATE POLICY storage_access_logs_own ON public.storage_access_logs
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.storage_access_logs FROM anon;
GRANT INSERT ON public.storage_access_logs TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.storage_scan_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL,
  object_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  provider text NOT NULL DEFAULT 'hook',
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.storage_scan_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.storage_scan_jobs FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.storage_scan_jobs TO service_role;

CREATE OR REPLACE FUNCTION public.storage_log_access(
  p_bucket text,
  p_object_path text,
  p_action text,
  p_mime_type text DEFAULT NULL,
  p_size_bytes bigint DEFAULT NULL,
  p_request_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.storage_access_logs (
    bucket, object_path, action, auth_user_id, mime_type, size_bytes, request_id, metadata
  )
  VALUES (
    trim(p_bucket),
    trim(p_object_path),
    trim(p_action),
    auth.uid(),
    nullif(trim(p_mime_type), ''),
    p_size_bytes,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.storage_log_access(text, text, text, text, bigint, uuid, jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.storage_create_upload_url(
  p_bucket text,
  p_filename text,
  p_mime_type text,
  p_startup_id uuid DEFAULT NULL,
  p_size_bytes bigint DEFAULT NULL,
  p_request_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bucket text := trim(p_bucket);
  v_mime text := lower(trim(coalesce(p_mime_type, '')));
  v_name text := trim(coalesce(p_filename, ''));
  v_path text;
  v_allowed boolean := false;
  v_max bigint := 20971520;
  v_expires interval := interval '1 hour';
BEGIN
  PERFORM public.api_guard('storage_create_upload_url', p_request_id);

  IF p_size_bytes IS NOT NULL AND (p_size_bytes <= 0 OR p_size_bytes > v_max) THEN
    RAISE EXCEPTION 'VALIDATION_ERROR' USING ERRCODE = '22023', DETAIL = 'size_out_of_range';
  END IF;

  IF v_mime NOT IN (
    'application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'
  ) THEN
    RAISE EXCEPTION 'VALIDATION_ERROR' USING ERRCODE = '22023', DETAIL = 'mime_not_allowed';
  END IF;

  IF v_bucket NOT IN (
    'listing-business-proofs', 'verification-documents', 'registration_docs',
    'listing_proofs', 'person_verification_docs'
  ) THEN
    RAISE EXCEPTION 'VALIDATION_ERROR' USING ERRCODE = '22023', DETAIL = 'bucket_not_allowed';
  END IF;

  IF p_startup_id IS NOT NULL THEN
    IF NOT public.startup_owned_by_auth(p_startup_id) AND NOT public.is_platform_admin() THEN
      RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
    END IF;
    v_path := p_startup_id::text || '/' || gen_random_uuid()::text || '-' || regexp_replace(v_name, '[^a-zA-Z0-9._-]', '_', 'g');
    v_allowed := true;
  ELSIF v_bucket = 'person_verification_docs' THEN
    v_path := auth.uid()::text || '/' || gen_random_uuid()::text || '-' || regexp_replace(v_name, '[^a-zA-Z0-9._-]', '_', 'g');
    v_allowed := true;
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'VALIDATION_ERROR' USING ERRCODE = '22023', DETAIL = 'startup_id_required';
  END IF;

  PERFORM public.storage_log_access(
    v_bucket, v_path, 'upload_allocate', v_mime, p_size_bytes, p_request_id,
    jsonb_build_object('startup_id', p_startup_id)
  );

  INSERT INTO public.storage_scan_jobs (bucket, object_path, status)
  VALUES (v_bucket, v_path, 'pending');

  PERFORM public.append_audit_log(
    'storage_object', gen_random_uuid(), 'upload_allocated', NULL,
    jsonb_build_object('bucket', v_bucket, 'path', v_path, 'mime', v_mime),
    NULL, p_request_id
  );

  RETURN jsonb_build_object(
    'bucket', v_bucket,
    'objectPath', v_path,
    'maxBytes', v_max,
    'mimeType', v_mime,
    'expiresInSeconds', extract(epoch FROM v_expires)::int,
    'expiresAt', (now() + v_expires)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.storage_create_upload_url(text, text, text, uuid, bigint, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Phase 5: Person verification cases (additive to trust_person_profiles)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._desk_marketplace_table_name()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN to_regclass('public.marketplace_accounts') IS NOT NULL THEN 'marketplace_accounts'
    WHEN to_regclass('public.marketplace_profiles') IS NOT NULL THEN 'marketplace_profiles'
    ELSE NULL
  END;
$$;

CREATE TABLE IF NOT EXISTS public.person_verification_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_person_profile_id uuid NOT NULL REFERENCES public.trust_person_profiles (id) ON DELETE CASCADE,
  marketplace_profile_id uuid,
  desk_role text NOT NULL CHECK (desk_role IN ('buyer', 'seller', 'founder')),
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'submitted', 'under_review', 'verified', 'rejected')
  ),
  full_name text,
  email text,
  country text,
  linkedin_url text,
  x_url text,
  review_notes text,
  reviewed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  request_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS person_verification_cases_profile_idx
  ON public.person_verification_cases (trust_person_profile_id, status);

DO $$
DECLARE
  v_tbl text := public._desk_marketplace_table_name();
BEGIN
  IF v_tbl IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'person_verification_cases_marketplace_profile_id_fkey'
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.person_verification_cases
         ADD CONSTRAINT person_verification_cases_marketplace_profile_id_fkey
         FOREIGN KEY (marketplace_profile_id) REFERENCES public.%I (id) ON DELETE SET NULL',
      v_tbl
    );
  END IF;
END $$;

ALTER TABLE public.person_verification_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS person_verification_cases_own ON public.person_verification_cases;
CREATE POLICY person_verification_cases_own ON public.person_verification_cases
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trust_person_profiles t
      WHERE t.id = trust_person_profile_id AND t.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trust_person_profiles t
      WHERE t.id = trust_person_profile_id AND t.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS person_verification_cases_admin ON public.person_verification_cases;
CREATE POLICY person_verification_cases_admin ON public.person_verification_cases
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE TABLE IF NOT EXISTS public.person_verification_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.person_verification_cases (id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (
    document_type IN ('national_id', 'passport', 'pan', 'ssn', 'tax_id', 'other')
  ),
  storage_bucket text NOT NULL DEFAULT 'person_verification_docs',
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS person_verification_documents_case_idx
  ON public.person_verification_documents (case_id);

ALTER TABLE public.person_verification_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS person_verification_documents_own ON public.person_verification_documents;
CREATE POLICY person_verification_documents_own ON public.person_verification_documents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.person_verification_cases c
      JOIN public.trust_person_profiles t ON t.id = c.trust_person_profile_id
      WHERE c.id = case_id AND t.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.person_verification_cases c
      JOIN public.trust_person_profiles t ON t.id = c.trust_person_profile_id
      WHERE c.id = case_id AND t.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS person_verification_documents_admin ON public.person_verification_documents;
CREATE POLICY person_verification_documents_admin ON public.person_verification_documents
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.upsert_person_verification_case(
  p_desk_role text,
  p_fields jsonb DEFAULT '{}'::jsonb,
  p_request_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base jsonb;
  v_profile_id uuid;
  v_case public.person_verification_cases%ROWTYPE;
BEGIN
  PERFORM public.api_guard('upsert_person_verification_case', p_request_id);
  v_base := public.get_or_create_person_verification_profile(p_desk_role);
  v_profile_id := (v_base->>'id')::uuid;

  SELECT * INTO v_case
  FROM public.person_verification_cases c
  WHERE c.trust_person_profile_id = v_profile_id
  ORDER BY c.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.person_verification_cases (
      trust_person_profile_id, marketplace_profile_id, desk_role, status,
      full_name, email, country, linkedin_url, x_url, request_id
    )
    VALUES (
      v_profile_id,
      (v_base->>'marketplace_profile_id')::uuid,
      p_desk_role,
      'draft',
      p_fields->>'fullName',
      p_fields->>'email',
      p_fields->>'country',
      p_fields->>'linkedinUrl',
      p_fields->>'xUrl',
      p_request_id
    )
    RETURNING * INTO v_case;
  ELSE
    UPDATE public.person_verification_cases SET
      full_name = coalesce(p_fields->>'fullName', full_name),
      email = coalesce(p_fields->>'email', email),
      country = coalesce(p_fields->>'country', country),
      linkedin_url = coalesce(p_fields->>'linkedinUrl', linkedin_url),
      x_url = coalesce(p_fields->>'xUrl', x_url),
      updated_at = now()
    WHERE id = v_case.id
    RETURNING * INTO v_case;
  END IF;

  RETURN jsonb_build_object('caseId', v_case.id, 'status', v_case.status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_person_verification_case(text, jsonb, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_person_verification_case(p_case_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.person_verification_cases c SET
    status = 'submitted',
    updated_at = now()
  WHERE c.id = p_case_id
    AND EXISTS (
      SELECT 1 FROM public.trust_person_profiles t
      WHERE t.id = c.trust_person_profile_id AND t.auth_user_id = auth.uid()
    );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_person_verification_case(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_review_person_verification_case(
  p_case_id uuid,
  p_decision text,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  v_status := CASE lower(trim(p_decision))
    WHEN 'verified' THEN 'verified'
    WHEN 'approve' THEN 'verified'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'reject' THEN 'rejected'
    ELSE 'under_review'
  END;

  UPDATE public.person_verification_cases SET
    status = v_status,
    review_notes = coalesce(p_notes, review_notes),
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  WHERE id = p_case_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  PERFORM public.append_audit_log('person_verification_case', p_case_id, 'admin_review', NULL,
    jsonb_build_object('decision', v_status, 'notes', p_notes));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_review_person_verification_case(uuid, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Phase 6: Offer analytics + lifecycle events
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._emit_marketplace_offer_event(
  p_bid_id uuid,
  p_event_type text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bid public.marketplace_offers%ROWTYPE;
  v_recipient uuid;
  v_tbl text := public._desk_marketplace_table_name();
BEGIN
  SELECT * INTO v_bid FROM public.marketplace_offers WHERE id = p_bid_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_tbl IS NOT NULL THEN
    EXECUTE format(
      'SELECT auth_user_id FROM public.%I WHERE id = $1',
      v_tbl
    )
    INTO v_recipient
    USING v_bid.buyer_profile_id;
  END IF;

  IF v_recipient IS NULL THEN
    RETURN;
  END IF;

  IF to_regclass('public.marketplace_offer_notifications') IS NOT NULL THEN
    INSERT INTO public.marketplace_offer_notifications (
      bid_id, startup_id, recipient_user_id, event_type, payload
    )
    VALUES (
      p_bid_id,
      v_bid.startup_id,
      v_recipient,
      p_event_type,
      coalesce(p_payload, '{}'::jsonb)
    );
  ELSIF to_regclass('public.marketplace_offer_events') IS NOT NULL THEN
    INSERT INTO public.marketplace_offer_events (
      bid_id, startup_id, recipient_user_id, event_type, payload
    )
    VALUES (
      p_bid_id,
      v_bid.startup_id,
      v_recipient,
      p_event_type,
      coalesce(p_payload, '{}'::jsonb)
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_marketplace_offer_lifecycle_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public._emit_marketplace_offer_event(NEW.id, 'created', jsonb_build_object('status', NEW.status));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      PERFORM public._emit_marketplace_offer_event(
        NEW.id,
        CASE NEW.status
          WHEN 'accepted' THEN 'accepted'
          WHEN 'declined' THEN 'declined'
          WHEN 'rejected' THEN 'declined'
          WHEN 'withdrawn' THEN 'expired'
          WHEN 'expired' THEN 'expired'
          ELSE 'updated'
        END,
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
      );
    END IF;
    IF NEW.amount IS DISTINCT FROM OLD.amount THEN
      PERFORM public._emit_marketplace_offer_event(NEW.id, 'countered', jsonb_build_object('amount', NEW.amount));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS marketplace_offer_lifecycle_event ON public.marketplace_offers;
CREATE TRIGGER marketplace_offer_lifecycle_event
  AFTER INSERT OR UPDATE ON public.marketplace_offers
  FOR EACH ROW EXECUTE FUNCTION public.trg_marketplace_offer_lifecycle_event();

CREATE OR REPLACE FUNCTION public.admin_offer_metrics(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'total', (SELECT count(*)::int FROM public.marketplace_offers),
    'byStatus', (
      SELECT coalesce(jsonb_object_agg(status, cnt), '{}'::jsonb)
      FROM (
        SELECT status, count(*)::int AS cnt
        FROM public.marketplace_offers
        GROUP BY status
      ) s
    ),
    'lastDays', p_days,
    'createdInPeriod', (
      SELECT count(*)::int FROM public.marketplace_offers
      WHERE created_at > now() - make_interval(days => greatest(1, p_days))
    ),
    'eventsInPeriod', (
      SELECT count(*)::int FROM public.marketplace_offer_notifications
      WHERE created_at > now() - make_interval(days => greatest(1, p_days))
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_offer_metrics(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.marketplace_buyer_offer_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer uuid;
BEGIN
  PERFORM public.api_guard('marketplace_buyer_offer_dashboard');
  v_buyer := public._marketplace_buyer_profile_id();
  IF v_buyer IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'activeOffers', (
      SELECT count(*)::int FROM public.marketplace_offers o
      WHERE o.buyer_profile_id = v_buyer AND o.status IN ('submitted', 'countered', 'under_review')
    ),
    'accepted', (
      SELECT count(*)::int FROM public.marketplace_offers o
      WHERE o.buyer_profile_id = v_buyer AND o.status = 'accepted'
    ),
    'declined', (
      SELECT count(*)::int FROM public.marketplace_offers o
      WHERE o.buyer_profile_id = v_buyer AND o.status IN ('declined', 'rejected', 'withdrawn')
    ),
    'responseRate', (
      SELECT CASE WHEN count(*) = 0 THEN 0
                  ELSE round(100.0 * count(*) FILTER (WHERE o.status NOT IN ('draft', 'submitted')) / count(*), 1)
             END
      FROM public.marketplace_offers o
      WHERE o.buyer_profile_id = v_buyer
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketplace_buyer_offer_dashboard() TO authenticated;

CREATE OR REPLACE FUNCTION public._desk_seller_publications_table_name()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN to_regclass('public.marketplace_seller_publications') IS NOT NULL THEN 'marketplace_seller_publications'
    WHEN to_regclass('public.seller_listings') IS NOT NULL THEN 'seller_listings'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_seller_offer_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_ids uuid[];
  v_tbl text := public._desk_marketplace_table_name();
  v_sl text := public._desk_seller_publications_table_name();
  v_result jsonb;
BEGIN
  PERFORM public.api_guard('marketplace_seller_offer_dashboard');

  IF v_tbl IS NULL OR v_sl IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  EXECUTE format(
    'SELECT array_agg(mp.id) FROM public.%I mp
     WHERE mp.auth_user_id = $1 AND mp.desk_role IN (''seller'', ''founder'')',
    v_tbl
  )
  INTO v_seller_ids
  USING auth.uid();

  IF v_seller_ids IS NULL OR cardinality(v_seller_ids) = 0 THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  EXECUTE format(
    $q$
    SELECT jsonb_build_object(
      'pending', (
        SELECT count(*)::int FROM public.marketplace_offers o
        JOIN public.%1$I sl ON sl.startup_id = o.startup_id
        WHERE sl.seller_profile_id = ANY ($1) AND o.status = 'submitted'
      ),
      'accepted', (
        SELECT count(*)::int FROM public.marketplace_offers o
        JOIN public.%1$I sl ON sl.startup_id = o.startup_id
        WHERE sl.seller_profile_id = ANY ($1) AND o.status = 'accepted'
      ),
      'declined', (
        SELECT count(*)::int FROM public.marketplace_offers o
        JOIN public.%1$I sl ON sl.startup_id = o.startup_id
        WHERE sl.seller_profile_id = ANY ($1) AND o.status IN ('declined', 'rejected')
      ),
      'underReview', (
        SELECT count(*)::int FROM public.marketplace_offers o
        JOIN public.%1$I sl ON sl.startup_id = o.startup_id
        WHERE sl.seller_profile_id = ANY ($1) AND o.status = 'under_review'
      ),
      'closed', (
        SELECT count(*)::int FROM public.marketplace_offers o
        JOIN public.%1$I sl ON sl.startup_id = o.startup_id
        WHERE sl.seller_profile_id = ANY ($1) AND o.status IN ('withdrawn', 'expired')
      )
    )
    $q$,
    v_sl
  )
  INTO v_result
  USING v_seller_ids;

  RETURN coalesce(v_result, '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketplace_seller_offer_dashboard() TO authenticated;

-- Phase 7: Security re-check (additive revokes)
REVOKE INSERT, UPDATE, DELETE ON public.person_verification_cases FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.person_verification_documents FROM anon;
REVOKE ALL ON public.api_tier_limits FROM anon, authenticated;
REVOKE ALL ON public.storage_scan_jobs FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
