-- Admin analytics & founder stats for platform admins (database role, no env keys).

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_founder_analytics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_totals record;
  v_top_founder jsonb;
  v_top_startup jsonb;
  v_traffic jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF to_regclass('public.founder_submissions') IS NULL THEN
    RETURN jsonb_build_object(
      'totalFounders', 0,
      'totalReferralClicks', 0,
      'totalConversions', 0,
      'topFounders', '[]'::jsonb,
      'topStartups', '[]'::jsonb,
      'trafficSources', '[]'::jsonb
    );
  END IF;

  SELECT
    count(*)::int AS total_founders,
    coalesce(sum(visit_count), 0)::int AS total_referral_clicks,
    coalesce(sum(referral_signup_count), 0)::int AS total_conversions
  INTO v_totals
  FROM public.founder_submissions;

  SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_top_founder
  FROM (
    SELECT
      id,
      founder_name AS "founderName",
      startup_name AS "startupName",
      referral_code AS "referralCode",
      visit_count AS "visitCount",
      referral_signup_count AS "referralSignupCount",
      (visit_count + referral_signup_count * 3) AS "viralScore"
    FROM public.founder_submissions
    ORDER BY (visit_count + referral_signup_count * 3) DESC
    LIMIT 10
  ) t;

  SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_top_startup
  FROM (
    SELECT
      startup_name AS "startupName",
      count(*)::int AS founders,
      coalesce(sum(visit_count), 0)::int AS "visitCount",
      coalesce(sum(referral_signup_count), 0)::int AS "referralSignupCount"
    FROM public.founder_submissions
    GROUP BY startup_name
    ORDER BY coalesce(sum(visit_count), 0) DESC
    LIMIT 10
  ) t;

  SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_traffic
  FROM (
    SELECT source_platform AS "sourcePlatform", count(*)::int AS count
    FROM public.founder_referral_events
    WHERE source_platform IS NOT NULL
    GROUP BY source_platform
    ORDER BY count(*) DESC
    LIMIT 12
  ) t;

  RETURN jsonb_build_object(
    'totalFounders', v_totals.total_founders,
    'totalReferralClicks', v_totals.total_referral_clicks,
    'totalConversions', v_totals.total_conversions,
    'topFounders', v_top_founder,
    'topStartups', v_top_startup,
    'trafficSources', v_traffic
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_network_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb := '{}'::jsonb;
  v_users bigint := 0;
  v_users_7d bigint := 0;
  v_users_30d bigint := 0;
  v_onboarded bigint := 0;
  v_verified bigint := 0;
  v_admins bigint := 0;
  v_referrals bigint := 0;
  v_referrals_completed bigint := 0;
  v_tx bigint := 0;
  v_tx_volume numeric := 0;
  v_points bigint := 0;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF to_regclass('public.users') IS NOT NULL THEN
    SELECT count(*) INTO v_users FROM public.users WHERE deleted_at IS NULL;
    SELECT count(*) INTO v_users_7d FROM public.users
      WHERE deleted_at IS NULL AND created_at >= now() - interval '7 days';
    SELECT count(*) INTO v_users_30d FROM public.users
      WHERE deleted_at IS NULL AND created_at >= now() - interval '30 days';
    SELECT count(*) INTO v_verified FROM public.users
      WHERE deleted_at IS NULL AND verification_status = 'verified';
    SELECT count(*) INTO v_admins FROM public.users
      WHERE deleted_at IS NULL AND role = 'admin';
  ELSIF to_regclass('public.ownerr_network_users') IS NOT NULL THEN
    SELECT count(*) INTO v_users FROM public.ownerr_network_users;
    SELECT count(*) INTO v_users_7d FROM public.ownerr_network_users
      WHERE created_at >= now() - interval '7 days';
    SELECT count(*) INTO v_users_30d FROM public.ownerr_network_users
      WHERE created_at >= now() - interval '30 days';
    SELECT count(*) INTO v_verified FROM public.ownerr_network_users
      WHERE profile_verified = true;
  END IF;

  IF to_regclass('public.user_profiles') IS NOT NULL THEN
    SELECT count(*) INTO v_onboarded FROM public.user_profiles
      WHERE onboarding_completed = true;
  ELSIF to_regclass('public.ownerr_network_profiles') IS NOT NULL THEN
    SELECT count(*) INTO v_onboarded FROM public.ownerr_network_profiles
      WHERE onboarding_completed_at IS NOT NULL;
  END IF;

  IF to_regclass('public.referrals') IS NOT NULL THEN
    SELECT count(*) INTO v_referrals FROM public.referrals
      WHERE product_slug = 'ownerr_network';
    SELECT count(*) INTO v_referrals_completed FROM public.referrals
      WHERE product_slug = 'ownerr_network' AND status = 'completed';
  ELSIF to_regclass('public.ownerr_network_referrals') IS NOT NULL THEN
    SELECT count(*) INTO v_referrals FROM public.ownerr_network_referrals;
    SELECT count(*) INTO v_referrals_completed FROM public.ownerr_network_referrals
      WHERE status = 'completed';
  END IF;

  IF to_regclass('public.wallet_transactions') IS NOT NULL THEN
    SELECT count(*), coalesce(sum(amount), 0)
    INTO v_tx, v_tx_volume
    FROM public.wallet_transactions;
  ELSIF to_regclass('public.ownerr_network_points_ledger') IS NOT NULL THEN
    SELECT count(*), coalesce(sum(amount), 0)
    INTO v_tx, v_tx_volume
    FROM public.ownerr_network_points_ledger;
  END IF;

  IF to_regclass('public.user_scores') IS NOT NULL THEN
    SELECT coalesce(sum(points), 0)::bigint INTO v_points FROM public.user_scores;
  END IF;

  RETURN jsonb_build_object(
    'totalUsers', v_users,
    'newUsers7d', v_users_7d,
    'newUsers30d', v_users_30d,
    'onboardingCompleted', v_onboarded,
    'verifiedUsers', v_verified,
    'platformAdmins', v_admins,
    'totalReferrals', v_referrals,
    'completedReferrals', v_referrals_completed,
    'walletTransactions', v_tx,
    'walletVolume', v_tx_volume,
    'totalPoints', v_points
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_marketplace_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listings bigint := 0;
  v_published bigint := 0;
  v_draft bigint := 0;
  v_archived bigint := 0;
  v_verified bigint := 0;
  v_submissions bigint := 0;
  v_pending bigint := 0;
  v_avg_score numeric := 0;
  v_top_industries jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF to_regclass('public.startups') IS NOT NULL THEN
    SELECT count(*) INTO v_listings FROM public.startups;
    SELECT count(*) INTO v_published FROM public.startups WHERE status = 'published';
    SELECT count(*) INTO v_draft FROM public.startups WHERE status = 'draft';
    SELECT count(*) INTO v_archived FROM public.startups WHERE status = 'archived';
    SELECT count(*) INTO v_verified FROM public.startups WHERE verified = true;

    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
    INTO v_top_industries
    FROM (
      SELECT coalesce(industry, 'Unknown') AS industry, count(*)::int AS count
      FROM public.startups
      GROUP BY coalesce(industry, 'Unknown')
      ORDER BY count(*) DESC
      LIMIT 8
    ) t;
  END IF;

  IF to_regclass('public.submissions') IS NOT NULL THEN
    SELECT count(*) INTO v_submissions FROM public.submissions;
    SELECT count(*) INTO v_pending FROM public.submissions
      WHERE status IN ('pending', 'review', 'submitted');
    SELECT coalesce(avg(score), 0) INTO v_avg_score FROM public.submissions
      WHERE score IS NOT NULL;
  END IF;

  RETURN jsonb_build_object(
    'totalListings', v_listings,
    'publishedListings', v_published,
    'draftListings', v_draft,
    'archivedListings', v_archived,
    'verifiedListings', v_verified,
    'totalSubmissions', v_submissions,
    'pendingSubmissions', v_pending,
    'avgSubmissionScore', round(v_avg_score::numeric, 1),
    'topIndustries', v_top_industries
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_os_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listings bigint := 0;
  v_published bigint := 0;
  v_draft bigint := 0;
  v_founder jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF to_regclass('public.listings') IS NOT NULL THEN
    SELECT count(*) INTO v_listings FROM public.listings;
    SELECT count(*) INTO v_published FROM public.listings WHERE status = 'published';
    SELECT count(*) INTO v_draft FROM public.listings WHERE status = 'draft';
  END IF;

  v_founder := public.admin_founder_analytics();

  RETURN jsonb_build_object(
    'totalListings', v_listings,
    'publishedListings', v_published,
    'draftListings', v_draft,
    'founderAnalytics', v_founder
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_platform_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'network', public.admin_network_summary(),
    'marketplace', public.admin_marketplace_summary(),
    'ownerrOs', public.admin_os_summary(),
    'generatedAt', to_jsonb(now())
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_founder_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_network_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_marketplace_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_os_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_platform_summary() TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
