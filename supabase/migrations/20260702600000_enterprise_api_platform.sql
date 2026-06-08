-- Enterprise API platform (P0–P4): security, messaging RPCs, rate limits, MVs, storage, admin RPCs.

BEGIN;

-- ---------------------------------------------------------------------------
-- TD-01: Platform admin — database role only
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin boolean;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.deleted_at IS NULL
      AND u.role = 'admin'
  )
  INTO v_admin;
  RETURN coalesce(v_admin, false);
END;
$$;

-- ---------------------------------------------------------------------------
-- TD-05: Audit → sys_audit_logs (+ optional IP hash)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.append_audit_log(
  p_subject_type text,
  p_subject_id uuid,
  p_action text,
  p_before jsonb DEFAULT NULL,
  p_after jsonb DEFAULT NULL,
  p_ip_address text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
  v_role text;
  v_ip_hash text;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  SELECT u.role
  INTO v_role
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1;

  IF p_ip_address IS NOT NULL AND length(trim(p_ip_address)) > 0 THEN
    v_ip_hash := encode(digest(trim(p_ip_address), 'sha256'), 'hex');
  END IF;

  INSERT INTO public.sys_audit_logs (
    id,
    subject_type,
    subject_id,
    action,
    actor_user_id,
    actor_role,
    ip_hash,
    before_state,
    after_state
  )
  VALUES (
    v_id,
    p_subject_type,
    p_subject_id,
    p_action,
    auth.uid(),
    v_role,
    v_ip_hash,
    p_before,
    p_after
  );
  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- P2: Rate limiting (Postgres-native)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  auth_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (auth_user_id, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS api_rate_limits_window_idx
  ON public.api_rate_limits (window_start);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS api_rate_limits_service ON public.api_rate_limits;
CREATE POLICY api_rate_limits_service ON public.api_rate_limits
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.api_rate_limits FROM anon, authenticated;

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
    SELECT 1
    FROM public.trust_person_profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.status = 'verified'
  ) THEN
    RETURN 'verified';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.marketplace_companies s
    WHERE s.founder_user_id = auth.uid()
      AND s.listing_lifecycle IN ('verified', 'published')
  ) THEN
    RETURN 'verified';
  END IF;
  RETURN 'default';
END;
$$;

CREATE OR REPLACE FUNCTION public.api_guard(p_endpoint text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tier text;
  v_limit integer;
  v_window timestamptz;
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = '28000';
  END IF;
  IF public.is_platform_admin() THEN
    RETURN;
  END IF;

  v_tier := public.user_api_tier();
  v_limit := CASE v_tier WHEN 'verified' THEN 1000 ELSE 100 END;
  v_window := date_trunc('hour', now());

  INSERT INTO public.api_rate_limits (auth_user_id, endpoint, window_start, request_count)
  VALUES (v_uid, p_endpoint, v_window, 1)
  ON CONFLICT (auth_user_id, endpoint, window_start)
  DO UPDATE SET request_count = api_rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  IF v_count > v_limit THEN
    RAISE EXCEPTION 'RATE_LIMITED'
      USING ERRCODE = 'P0001',
      DETAIL = jsonb_build_object(
        'retry_after_seconds',
        greatest(1, extract(epoch FROM (v_window + interval '1 hour' - now()))::int)
      )::text;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_api_tier() TO authenticated;
GRANT EXECUTE ON FUNCTION public.api_guard(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- P2: Request observability
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.api_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  rpc_name text NOT NULL,
  duration_ms integer,
  status text NOT NULL DEFAULT 'ok',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_request_logs_rpc_created_idx
  ON public.api_request_logs (rpc_name, created_at DESC);

ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_request_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS api_request_logs_admin ON public.api_request_logs;
CREATE POLICY api_request_logs_admin ON public.api_request_logs
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

REVOKE INSERT, UPDATE, DELETE ON public.api_request_logs FROM anon, authenticated;
GRANT INSERT ON public.api_request_logs TO service_role;

CREATE OR REPLACE FUNCTION public.admin_api_observability_summary()
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
    'top_rpcs',
    (
      SELECT coalesce(jsonb_agg(row), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'rpc_name', rpc_name,
          'count', cnt
        ) AS row
        FROM (
          SELECT rpc_name, count(*)::int AS cnt
          FROM public.api_request_logs
          WHERE created_at > now() - interval '7 days'
          GROUP BY rpc_name
          ORDER BY cnt DESC
          LIMIT 20
        ) t
      ) s
    ),
    'slowest_rpcs',
    (
      SELECT coalesce(jsonb_agg(row), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'rpc_name', rpc_name,
          'avg_ms', round(avg(duration_ms))::int
        ) AS row
        FROM public.api_request_logs
        WHERE created_at > now() - interval '7 days'
          AND duration_ms IS NOT NULL
        GROUP BY rpc_name
        ORDER BY avg(duration_ms) DESC
        LIMIT 15
      ) s2
    ),
    'failed_count',
    (
      SELECT count(*)::int
      FROM public.api_request_logs
      WHERE created_at > now() - interval '7 days'
        AND status <> 'ok'
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_api_observability_summary() TO authenticated;

-- ---------------------------------------------------------------------------
-- Messaging helpers + RPCs (P1)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._marketplace_conversation_participant(p_conversation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv public.marketplace_conversations%ROWTYPE;
  v_buyer uuid;
  v_seller_ids uuid[];
BEGIN
  SELECT * INTO v_conv FROM public.marketplace_conversations WHERE id = p_conversation_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  v_buyer := public._marketplace_buyer_profile_id();
  IF v_buyer IS NOT NULL AND v_conv.buyer_profile_id = v_buyer THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.marketplace_accounts mp
    WHERE mp.auth_user_id = auth.uid()
      AND mp.desk_role IN ('seller', 'founder')
      AND mp.id = v_conv.seller_profile_id
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.marketplace_companies s
    WHERE s.id = v_conv.startup_id
      AND s.founder_user_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;

  IF public.is_platform_admin() THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_list_conversations(
  p_limit integer DEFAULT 25,
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer uuid;
  v_result jsonb;
BEGIN
  PERFORM public.api_guard('marketplace_list_conversations');
  v_buyer := public._marketplace_buyer_profile_id();

  SELECT coalesce(jsonb_agg(row ORDER BY (row->>'updatedAt') DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'conversationId', c.id,
      'startupSlug', s.slug,
      'startupTitle', s.title,
      'status', c.status,
      'createdAt', c.created_at,
      'updatedAt', coalesce(lm.created_at, c.created_at),
      'lastMessage', coalesce(lm.body, ''),
      'unreadCount', coalesce(uc.cnt, 0),
      'buyerName', coalesce(bm.metadata->>'display_name', 'Buyer'),
      'sellerName', coalesce(sm.metadata->>'display_name', 'Seller')
    ) AS row
    FROM public.marketplace_conversations c
    JOIN public.marketplace_companies s ON s.id = c.startup_id
    LEFT JOIN public.marketplace_accounts bm ON bm.id = c.buyer_profile_id
    LEFT JOIN public.marketplace_accounts sm ON sm.id = c.seller_profile_id
    LEFT JOIN LATERAL (
      SELECT m.body, m.created_at
      FROM public.marketplace_messages m
      WHERE m.conversation_id = c.id
      ORDER BY m.created_at DESC
      LIMIT 1
    ) lm ON true
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS cnt
      FROM public.marketplace_messages m
      WHERE m.conversation_id = c.id
        AND m.sender_user_id <> auth.uid()
        AND m.read_at IS NULL
    ) uc ON true
    WHERE (
      (v_buyer IS NOT NULL AND c.buyer_profile_id = v_buyer)
      OR EXISTS (
        SELECT 1 FROM public.marketplace_accounts mp
        WHERE mp.auth_user_id = auth.uid()
          AND mp.id = c.seller_profile_id
      )
      OR EXISTS (
        SELECT 1 FROM public.marketplace_companies sc
        WHERE sc.id = c.startup_id AND sc.founder_user_id = auth.uid()
      )
      OR public.is_platform_admin()
    )
    AND (
      p_cursor_created_at IS NULL
      OR (coalesce(lm.created_at, c.created_at), c.id)
        < (p_cursor_created_at, p_cursor_id)
    )
    ORDER BY coalesce(lm.created_at, c.created_at) DESC, c.id DESC
    LIMIT greatest(1, least(coalesce(p_limit, 25), 50))
  ) sub;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_list_messages(
  p_conversation_id uuid,
  p_limit integer DEFAULT 100,
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  PERFORM public.api_guard('marketplace_list_messages');
  IF NOT public._marketplace_conversation_participant(p_conversation_id) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  SELECT coalesce(jsonb_agg(row ORDER BY (row->>'createdAt') ASC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', m.id,
      'conversationId', m.conversation_id,
      'senderUserId', m.sender_user_id,
      'body', m.body,
      'readAt', m.read_at,
      'createdAt', m.created_at
    ) AS row
    FROM public.marketplace_messages m
    WHERE m.conversation_id = p_conversation_id
      AND (
        p_cursor_created_at IS NULL
        OR (m.created_at, m.id) > (p_cursor_created_at, p_cursor_id)
      )
    ORDER BY m.created_at ASC, m.id ASC
    LIMIT greatest(1, least(coalesce(p_limit, 100), 200))
  ) sub;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_send_message(
  p_conversation_id uuid,
  p_body text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv public.marketplace_conversations%ROWTYPE;
  v_trim text;
  v_row public.marketplace_messages%ROWTYPE;
BEGIN
  PERFORM public.api_guard('marketplace_send_message');
  v_trim := trim(coalesce(p_body, ''));
  IF length(v_trim) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR' USING ERRCODE = '22023', DETAIL = 'empty_body';
  END IF;
  IF NOT public._marketplace_conversation_participant(p_conversation_id) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_conv FROM public.marketplace_conversations WHERE id = p_conversation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF v_conv.status <> 'open' THEN
    RAISE EXCEPTION 'VALIDATION_ERROR' USING ERRCODE = '22023', DETAIL = 'conversation_closed';
  END IF;

  INSERT INTO public.marketplace_messages (
    conversation_id, sender_user_id, body
  )
  VALUES (p_conversation_id, auth.uid(), v_trim)
  RETURNING * INTO v_row;

  PERFORM public.append_audit_log(
    'conversation', p_conversation_id, 'message_sent', NULL,
    jsonb_build_object('message_id', v_row.id)
  );

  RETURN jsonb_build_object(
    'id', v_row.id,
    'conversationId', v_row.conversation_id,
    'senderUserId', v_row.sender_user_id,
    'body', v_row.body,
    'readAt', v_row.read_at,
    'createdAt', v_row.created_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_mark_conversation_read(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.api_guard('marketplace_mark_conversation_read');
  IF NOT public._marketplace_conversation_participant(p_conversation_id) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  UPDATE public.marketplace_messages
  SET read_at = now()
  WHERE conversation_id = p_conversation_id
    AND sender_user_id <> auth.uid()
    AND read_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketplace_list_conversations(integer, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_list_messages(uuid, integer, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_send_message(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_mark_conversation_read(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- P2: Search RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.marketplace_search_listings(
  p_query text DEFAULT '',
  p_limit integer DEFAULT 24,
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q text := trim(coalesce(p_query, ''));
  v_result jsonb;
BEGIN
  PERFORM public.api_guard('marketplace_search_listings');

  SELECT coalesce(jsonb_agg(row ORDER BY (row->>'createdAt') DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', s.id,
      'slug', s.slug,
      'title', s.title,
      'tagline', s.tagline,
      'industry', s.industry,
      'askingPrice', s.asking_price,
      'currency', s.currency,
      'listingLifecycle', s.listing_lifecycle,
      'visibility', s.visibility,
      'createdAt', s.created_at
    ) AS row
    FROM public.marketplace_companies s
    WHERE s.visibility = 'public'
      AND s.status = 'active'
      AND s.listing_lifecycle IN ('published', 'verified')
      AND (
        v_q = ''
        OR s.title ILIKE '%' || v_q || '%'
        OR s.tagline ILIKE '%' || v_q || '%'
        OR s.slug ILIKE '%' || v_q || '%'
      )
      AND (
        p_cursor_created_at IS NULL
        OR (s.created_at, s.id) < (p_cursor_created_at, p_cursor_id)
      )
    ORDER BY s.created_at DESC, s.id DESC
    LIMIT greatest(1, least(coalesce(p_limit, 24), 50))
  ) sub;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketplace_search_listings(text, integer, timestamptz, uuid) TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- P0: Storage upload allocation (client upload with RLS; path validated here)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.storage_create_upload_url(
  p_bucket text,
  p_filename text,
  p_mime_type text,
  p_startup_id uuid DEFAULT NULL
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
BEGIN
  PERFORM public.api_guard('storage_create_upload_url');

  IF v_mime NOT IN (
    'application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'
  ) THEN
    RAISE EXCEPTION 'VALIDATION_ERROR' USING ERRCODE = '22023', DETAIL = 'mime_not_allowed';
  END IF;

  IF v_bucket NOT IN (
    'listing-business-proofs',
    'verification-documents',
    'registration_docs',
    'listing_proofs',
    'person_verification_docs'
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

  RETURN jsonb_build_object(
    'bucket', v_bucket,
    'objectPath', v_path,
    'maxBytes', 20971520,
    'mimeType', v_mime
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.storage_create_upload_url(text, text, text, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- P4: Admin catalog listing update RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_catalog_listing(
  p_id uuid,
  p_patch jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  UPDATE public.catalog_listings
  SET
    title = coalesce(p_patch->>'title', title),
    description = coalesce(p_patch->>'description', description),
    industry = coalesce(p_patch->>'industry', industry),
    price_range = coalesce(p_patch->>'price_range', price_range),
    status = coalesce(p_patch->>'status', status),
    visibility = coalesce(p_patch->>'visibility', visibility),
    updated_at = now()
  WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  PERFORM public.append_audit_log('catalog_listing', p_id, 'admin_update', NULL, p_patch);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_catalog_listing(uuid, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- P2: Materialized views
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_marketplace_stats AS
SELECT
  1 AS id,
  count(*) FILTER (WHERE listing_lifecycle = 'published')::bigint AS published_count,
  count(*) FILTER (WHERE listing_lifecycle IN ('verification_required', 'verification_in_progress'))::bigint AS verifying_count,
  count(*)::bigint AS total_companies
FROM public.marketplace_companies;

CREATE UNIQUE INDEX IF NOT EXISTS mv_marketplace_stats_id_idx ON public.mv_marketplace_stats (id);

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_marketplace_featured_listings AS
SELECT id, slug, title, tagline, asking_price, currency, created_at
FROM (
  SELECT
    s.id,
    s.slug,
    s.title,
    s.tagline,
    s.asking_price,
    s.currency,
    s.created_at,
    s.updated_at
  FROM public.marketplace_companies s
  WHERE s.visibility = 'public'
    AND s.status = 'active'
    AND s.listing_lifecycle = 'published'
  ORDER BY s.updated_at DESC
  LIMIT 100
) q;

CREATE UNIQUE INDEX IF NOT EXISTS mv_marketplace_featured_listings_id_idx
  ON public.mv_marketplace_featured_listings (id);

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_admin_dashboard_metrics AS
SELECT
  1 AS id,
  (SELECT count(*) FROM public.users WHERE deleted_at IS NULL)::bigint AS users_count,
  (SELECT count(*) FROM public.marketplace_offers)::bigint AS offers_count,
  (SELECT count(*) FROM public.marketplace_conversations)::bigint AS conversations_count;

CREATE UNIQUE INDEX IF NOT EXISTS mv_admin_dashboard_metrics_id_idx
  ON public.mv_admin_dashboard_metrics (id);

CREATE OR REPLACE FUNCTION public.refresh_marketplace_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() AND auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_marketplace_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_marketplace_featured_listings;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_admin_dashboard_metrics;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_marketplace_materialized_views() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- P0/P4: Restrict direct mutations on offers/messages (RPC-only writes)
-- ---------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.marketplace_offers FROM authenticated;
REVOKE INSERT, UPDATE ON public.marketplace_messages FROM authenticated;

-- TD-06: Remove anon access to key-based founder analytics
DO $$
BEGIN
  IF to_regprocedure('public.founder_analytics_summary(text)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.founder_analytics_summary(text) FROM anon;
    REVOKE ALL ON FUNCTION public.founder_analytics_summary(text) FROM PUBLIC;
  END IF;
END $$;

-- Grant baseline: authenticated read on MVs via RPC only — revoke direct select from anon on MVs
REVOKE ALL ON public.mv_marketplace_stats FROM anon, authenticated;
REVOKE ALL ON public.mv_marketplace_featured_listings FROM anon, authenticated;
REVOKE ALL ON public.mv_admin_dashboard_metrics FROM anon, authenticated;
GRANT SELECT ON public.mv_marketplace_stats TO service_role;
GRANT SELECT ON public.mv_marketplace_featured_listings TO service_role;
GRANT SELECT ON public.mv_admin_dashboard_metrics TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
