-- Marketplace admin: participant lists, detail RPCs, chart aggregates, RLS for admins.

BEGIN;

DROP POLICY IF EXISTS marketplace_profiles_admin_manage ON public.marketplace_profiles;
CREATE POLICY marketplace_profiles_admin_manage ON public.marketplace_profiles
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS startup_interests_admin_manage ON public.startup_interests;
CREATE POLICY startup_interests_admin_manage ON public.startup_interests
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS bids_admin_manage ON public.bids;
CREATE POLICY bids_admin_manage ON public.bids
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS conversations_admin_manage ON public.conversations;
CREATE POLICY conversations_admin_manage ON public.conversations
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS seller_listings_admin_manage ON public.seller_listings;
CREATE POLICY seller_listings_admin_manage ON public.seller_listings
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DO $$
BEGIN
  IF to_regclass('public.verification_requests') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS verification_requests_admin_manage ON public.verification_requests';
    EXECUTE $p$
      CREATE POLICY verification_requests_admin_manage ON public.verification_requests
        FOR ALL TO authenticated
        USING (public.is_platform_admin())
        WITH CHECK (public.is_platform_admin())
    $p$;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Dashboard chart series (real aggregates)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_marketplace_charts()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_interests_by_day jsonb := '[]'::jsonb;
  v_bids_by_day jsonb := '[]'::jsonb;
  v_listing_status jsonb := '[]'::jsonb;
  v_funnel jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF to_regclass('public.startup_interests') IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.day), '[]'::jsonb)
    INTO v_interests_by_day
    FROM (
      SELECT date_trunc('day', created_at)::date AS day, count(*)::int AS count
      FROM public.startup_interests
      WHERE created_at >= now() - interval '30 days'
      GROUP BY 1
    ) t;
  END IF;

  IF to_regclass('public.bids') IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.day), '[]'::jsonb)
    INTO v_bids_by_day
    FROM (
      SELECT date_trunc('day', created_at)::date AS day, count(*)::int AS count
      FROM public.bids
      WHERE created_at >= now() - interval '30 days'
      GROUP BY 1
    ) t;
  END IF;

  IF to_regclass('public.startups') IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
    INTO v_listing_status
    FROM (
      SELECT status, count(*)::int AS count
      FROM public.startups
      GROUP BY status
      ORDER BY count(*) DESC
    ) t;
  END IF;

  v_funnel := public.admin_marketplace_summary()->'funnel';

  RETURN jsonb_build_object(
    'interestsByDay', v_interests_by_day,
    'bidsByDay', v_bids_by_day,
    'listingStatusBreakdown', v_listing_status,
    'funnel', coalesce(v_funnel, '[]'::jsonb)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Buyers / sellers directory
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_marketplace_buyers()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF to_regclass('public.marketplace_profiles') IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t."lastActivityAt" DESC NULLS LAST), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT
      mp.id AS "profileId",
      mp.auth_user_id AS "authUserId",
      mp.status,
      mp.created_at AS "createdAt",
      coalesce(u.email, '') AS email,
      coalesce(u.username, left(mp.id::text, 8)) AS username,
      coalesce(u.full_name, '') AS "fullName",
      coalesce(ic.cnt, 0)::int AS "interestCount",
      coalesce(bc.cnt, 0)::int AS "bidCount",
      coalesce(cc.cnt, 0)::int AS "conversationCount",
      coalesce(closed.cnt, 0)::int AS "closedDeals",
      greatest(
        mp.updated_at,
        ic.last_at,
        bc.last_at,
        cc.last_at
      ) AS "lastActivityAt"
    FROM public.marketplace_profiles mp
    LEFT JOIN public.users u ON u.auth_user_id = mp.auth_user_id AND u.deleted_at IS NULL
    LEFT JOIN (
      SELECT buyer_profile_id, count(*) AS cnt, max(created_at) AS last_at
      FROM public.startup_interests GROUP BY buyer_profile_id
    ) ic ON ic.buyer_profile_id = mp.id
    LEFT JOIN (
      SELECT buyer_profile_id, count(*) AS cnt, max(created_at) AS last_at
      FROM public.bids GROUP BY buyer_profile_id
    ) bc ON bc.buyer_profile_id = mp.id
    LEFT JOIN (
      SELECT buyer_profile_id, count(*) AS cnt, max(created_at) AS last_at
      FROM public.conversations GROUP BY buyer_profile_id
    ) cc ON cc.buyer_profile_id = mp.id
    LEFT JOIN (
      SELECT buyer_profile_id, count(*) AS cnt
      FROM public.startup_interests WHERE status = 'closed' GROUP BY buyer_profile_id
    ) closed ON closed.buyer_profile_id = mp.id
    WHERE mp.desk_role = 'buyer'
  ) t;

  RETURN v_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_marketplace_sellers()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF to_regclass('public.marketplace_profiles') IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t."lastActivityAt" DESC NULLS LAST), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT
      mp.id AS "profileId",
      mp.auth_user_id AS "authUserId",
      mp.status,
      mp.created_at AS "createdAt",
      coalesce(u.email, '') AS email,
      coalesce(u.username, left(mp.id::text, 8)) AS username,
      coalesce(u.full_name, '') AS "fullName",
      coalesce(sl.listing_count, 0)::int AS "listingCount",
      coalesce(sl.published_count, 0)::int AS "publishedCount",
      coalesce(inb.interests, 0)::int AS "inboundInterests",
      coalesce(inb.bids, 0)::int AS "inboundBids",
      coalesce(vr.pending, 0)::int AS "pendingVerifications",
      greatest(mp.updated_at, sl.last_at, inb.last_at) AS "lastActivityAt"
    FROM public.marketplace_profiles mp
    LEFT JOIN public.users u ON u.auth_user_id = mp.auth_user_id AND u.deleted_at IS NULL
    LEFT JOIN (
      SELECT
        seller_profile_id,
        count(*) AS listing_count,
        count(*) FILTER (WHERE status = 'published') AS published_count,
        max(updated_at) AS last_at
      FROM public.seller_listings
      GROUP BY seller_profile_id
    ) sl ON sl.seller_profile_id = mp.id
    LEFT JOIN (
      SELECT
        sl.seller_profile_id,
        coalesce(sum(ic.cnt), 0)::int AS interests,
        coalesce(sum(bc.cnt), 0)::int AS bids,
        max(greatest(ic.last_at, bc.last_at)) AS last_at
      FROM public.seller_listings sl
      LEFT JOIN (
        SELECT startup_id, count(*) AS cnt, max(created_at) AS last_at
        FROM public.startup_interests GROUP BY startup_id
      ) ic ON ic.startup_id = sl.startup_id
      LEFT JOIN (
        SELECT startup_id, count(*) AS cnt, max(created_at) AS last_at
        FROM public.bids GROUP BY startup_id
      ) bc ON bc.startup_id = sl.startup_id
      GROUP BY sl.seller_profile_id
    ) inb ON inb.seller_profile_id = mp.id
    LEFT JOIN (
      SELECT seller_profile_id, count(*) FILTER (WHERE status = 'pending') AS pending
      FROM public.verification_requests
      GROUP BY seller_profile_id
    ) vr ON vr.seller_profile_id = mp.id
    WHERE mp.desk_role = 'seller'
  ) t;

  RETURN v_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_marketplace_buyer_detail(p_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile jsonb;
  v_interests jsonb := '[]'::jsonb;
  v_bids jsonb := '[]'::jsonb;
  v_conversations jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT row_to_json(t)::jsonb INTO v_profile
  FROM (
    SELECT
      mp.id AS "profileId",
      mp.auth_user_id AS "authUserId",
      mp.status,
      mp.desk_role AS "deskRole",
      mp.metadata,
      mp.created_at AS "createdAt",
      u.id AS "userId",
      coalesce(u.email, '') AS email,
      coalesce(u.username, '') AS username,
      coalesce(u.full_name, '') AS "fullName"
    FROM public.marketplace_profiles mp
    LEFT JOIN public.users u ON u.auth_user_id = mp.auth_user_id
    WHERE mp.id = p_profile_id AND mp.desk_role = 'buyer'
  ) t;

  IF v_profile IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x."createdAt" DESC), '[]'::jsonb)
  INTO v_interests
  FROM (
    SELECT
      si.id AS "interestId",
      si.startup_id AS "startupId",
      s.title AS "startupTitle",
      s.industry,
      si.status,
      si.message,
      si.created_at AS "createdAt"
    FROM public.startup_interests si
    JOIN public.startups s ON s.id = si.startup_id
    WHERE si.buyer_profile_id = p_profile_id
  ) x;

  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x."createdAt" DESC), '[]'::jsonb)
  INTO v_bids
  FROM (
    SELECT
      b.id AS "bidId",
      b.startup_id AS "startupId",
      s.title AS "startupTitle",
      b.amount,
      b.currency,
      b.status,
      b.message,
      b.created_at AS "createdAt"
    FROM public.bids b
    JOIN public.startups s ON s.id = b.startup_id
    WHERE b.buyer_profile_id = p_profile_id
  ) x;

  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x."createdAt" DESC), '[]'::jsonb)
  INTO v_conversations
  FROM (
    SELECT
      c.id AS "conversationId",
      c.startup_id AS "startupId",
      s.title AS "startupTitle",
      c.status,
      c.created_at AS "createdAt"
    FROM public.conversations c
    JOIN public.startups s ON s.id = c.startup_id
    WHERE c.buyer_profile_id = p_profile_id
  ) x;

  RETURN jsonb_build_object(
    'profile', v_profile,
    'interests', v_interests,
    'bids', v_bids,
    'conversations', v_conversations
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_marketplace_seller_detail(p_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile jsonb;
  v_listings jsonb := '[]'::jsonb;
  v_verifications jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT row_to_json(t)::jsonb INTO v_profile
  FROM (
    SELECT
      mp.id AS "profileId",
      mp.auth_user_id AS "authUserId",
      mp.status,
      mp.desk_role AS "deskRole",
      mp.metadata,
      mp.created_at AS "createdAt",
      u.id AS "userId",
      coalesce(u.email, '') AS email,
      coalesce(u.username, '') AS username,
      coalesce(u.full_name, '') AS "fullName"
    FROM public.marketplace_profiles mp
    LEFT JOIN public.users u ON u.auth_user_id = mp.auth_user_id
    WHERE mp.id = p_profile_id AND mp.desk_role = 'seller'
  ) t;

  IF v_profile IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x."updatedAt" DESC), '[]'::jsonb)
  INTO v_listings
  FROM (
    SELECT
      sl.id AS "sellerListingId",
      sl.startup_id AS "startupId",
      s.title AS "startupTitle",
      s.industry,
      s.status AS "startupStatus",
      sl.status AS "listingStatus",
      sl.published_at AS "publishedAt",
      sl.updated_at AS "updatedAt",
      coalesce(ic.cnt, 0)::int AS "interestCount",
      coalesce(bc.cnt, 0)::int AS "bidCount"
    FROM public.seller_listings sl
    JOIN public.startups s ON s.id = sl.startup_id
    LEFT JOIN (
      SELECT startup_id, count(*) AS cnt FROM public.startup_interests GROUP BY startup_id
    ) ic ON ic.startup_id = sl.startup_id
    LEFT JOIN (
      SELECT startup_id, count(*) AS cnt FROM public.bids GROUP BY startup_id
    ) bc ON bc.startup_id = sl.startup_id
    WHERE sl.seller_profile_id = p_profile_id
  ) x;

  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x."submittedAt" DESC), '[]'::jsonb)
  INTO v_verifications
  FROM (
    SELECT
      vr.id AS "requestId",
      vr.startup_id AS "startupId",
      s.title AS "startupTitle",
      vr.status,
      vr.submitted_at AS "submittedAt"
    FROM public.verification_requests vr
    JOIN public.startups s ON s.id = vr.startup_id
    WHERE vr.seller_profile_id = p_profile_id
  ) x;

  RETURN jsonb_build_object(
    'profile', v_profile,
    'listings', v_listings,
    'verificationRequests', v_verifications
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_marketplace_charts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_marketplace_buyers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_marketplace_sellers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_marketplace_buyer_detail(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_marketplace_seller_detail(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
