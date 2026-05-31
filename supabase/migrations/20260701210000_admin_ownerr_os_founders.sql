-- Ownerr OS admin: founders directory, founder 360°, charts.

BEGIN;

DROP POLICY IF EXISTS founder_submissions_admin_manage ON public.founder_submissions;
CREATE POLICY founder_submissions_admin_manage ON public.founder_submissions
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS founder_referral_events_admin_manage ON public.founder_referral_events;
CREATE POLICY founder_referral_events_admin_manage ON public.founder_referral_events
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.admin_ownerr_os_founders()
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

  IF to_regclass('public.founder_submissions') IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t."createdAt" DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT
      fs.id AS "founderId",
      fs.founder_name AS "founderName",
      fs.startup_name AS "startupName",
      fs.referral_code AS "referralCode",
      fs.visit_count AS "visitCount",
      fs.referral_signup_count AS "signupCount",
      CASE WHEN fs.visit_count > 0
        THEN round((fs.referral_signup_count::numeric / fs.visit_count) * 100, 1)
        ELSE 0 END AS "conversionRate",
      (fs.visit_count + fs.referral_signup_count * 3)::int AS "viralScore",
      fs.category,
      fs.location,
      fs.created_at AS "createdAt"
    FROM public.founder_submissions fs
  ) t;

  RETURN v_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_ownerr_os_founder_detail(p_founder_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_founder jsonb;
  v_events jsonb := '[]'::jsonb;
  v_traffic jsonb := '[]'::jsonb;
  v_listings jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT row_to_json(t)::jsonb INTO v_founder
  FROM (
    SELECT
      fs.id AS "founderId",
      fs.auth_user_id AS "authUserId",
      fs.founder_name AS "founderName",
      fs.startup_name AS "startupName",
      fs.tagline,
      fs.description,
      fs.website,
      fs.social_links AS "socialLinks",
      fs.category,
      fs.location,
      fs.referral_code AS "referralCode",
      fs.referral_link AS "referralLink",
      fs.share_card_url AS "shareCardUrl",
      fs.visit_count AS "visitCount",
      fs.referral_signup_count AS "signupCount",
      fs.created_at AS "createdAt"
    FROM public.founder_submissions fs
    WHERE fs.id = p_founder_id
  ) t;

  IF v_founder IS NULL THEN
    RETURN NULL;
  END IF;

  IF to_regclass('public.founder_referral_events') IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x."createdAt" DESC), '[]'::jsonb)
    INTO v_events
    FROM (
      SELECT event_type AS "eventType", source_platform AS "sourcePlatform", created_at AS "createdAt"
      FROM public.founder_referral_events
      WHERE founder_id = p_founder_id
      ORDER BY created_at DESC
      LIMIT 25
    ) x;

    SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
    INTO v_traffic
    FROM (
      SELECT coalesce(source_platform, 'unknown') AS source, count(*)::int AS count
      FROM public.founder_referral_events
      WHERE founder_id = p_founder_id AND source_platform IS NOT NULL
      GROUP BY coalesce(source_platform, 'unknown')
      ORDER BY count(*) DESC
    ) x;
  END IF;

  IF to_regclass('public.listings') IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
    INTO v_listings
    FROM (
      SELECT l.id, l.title, l.status, l.visibility, l.updated_at AS "updatedAt"
      FROM public.listings l
      JOIN public.founder_submissions fs ON fs.id = p_founder_id
      WHERE fs.auth_user_id IS NOT NULL AND l.owner_user_id = fs.auth_user_id
    ) x;
  END IF;

  RETURN jsonb_build_object(
    'founder', v_founder,
    'recentEvents', v_events,
    'trafficBySource', v_traffic,
    'osListings', v_listings
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_ownerr_os_charts()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submissions jsonb := '[]'::jsonb;
  v_visits jsonb := '[]'::jsonb;
  v_signups jsonb := '[]'::jsonb;
  v_traffic jsonb := '[]'::jsonb;
  v_listing_status jsonb := '[]'::jsonb;
  v_funnel jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF to_regclass('public.founder_submissions') IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.day), '[]'::jsonb)
    INTO v_submissions
    FROM (
      SELECT date_trunc('day', created_at)::date AS day, count(*)::int AS count
      FROM public.founder_submissions
      WHERE created_at >= now() - interval '30 days'
      GROUP BY 1
    ) t;
  END IF;

  IF to_regclass('public.founder_referral_events') IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.day), '[]'::jsonb)
    INTO v_visits
    FROM (
      SELECT date_trunc('day', created_at)::date AS day, count(*)::int AS count
      FROM public.founder_referral_events
      WHERE event_type = 'visit' AND created_at >= now() - interval '30 days'
      GROUP BY 1
    ) t;

    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.day), '[]'::jsonb)
    INTO v_signups
    FROM (
      SELECT date_trunc('day', created_at)::date AS day, count(*)::int AS count
      FROM public.founder_referral_events
      WHERE event_type = 'signup' AND created_at >= now() - interval '30 days'
      GROUP BY 1
    ) t;

    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
    INTO v_traffic
    FROM (
      SELECT coalesce(source_platform, 'unknown') AS source, count(*)::int AS count
      FROM public.founder_referral_events
      WHERE source_platform IS NOT NULL
      GROUP BY coalesce(source_platform, 'unknown')
      ORDER BY count(*) DESC
      LIMIT 12
    ) t;
  END IF;

  IF to_regclass('public.listings') IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
    INTO v_listing_status
    FROM (
      SELECT status, count(*)::int AS count FROM public.listings GROUP BY status
    ) t;
  END IF;

  BEGIN
    v_funnel := coalesce(public.admin_os_summary()->'founderFunnel', '[]'::jsonb);
  EXCEPTION WHEN OTHERS THEN
    v_funnel := '[]'::jsonb;
  END;

  RETURN jsonb_build_object(
    'submissionsByDay', v_submissions,
    'visitsByDay', v_visits,
    'signupsByDay', v_signups,
    'trafficSources', v_traffic,
    'listingStatusBreakdown', v_listing_status,
    'founderFunnel', v_funnel
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_ownerr_os_founders() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ownerr_os_founder_detail(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ownerr_os_charts() TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
