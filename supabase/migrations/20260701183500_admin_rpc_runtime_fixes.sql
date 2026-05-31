-- Fix admin RPC runtime errors (platform hub 404/500, operations 400).

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_platform_intelligence()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total bigint := 0;
  v_new_today bigint := 0;
  v_new_week bigint := 0;
  v_new_month bigint := 0;
  v_new_prev_week bigint := 0;
  v_active_7d bigint := 0;
  v_active_30d bigint := 0;
  v_referral_signups bigint := 0;
  v_organic_signups bigint := 0;
  v_returning bigint := 0;
  v_profile_completion numeric := 0;
  v_marketplace_users bigint := 0;
  v_os_users bigint := 0;
  v_network_users bigint := 0;
  v_multi_product bigint := 0;
  v_referrals bigint := 0;
  v_referrals_completed bigint := 0;
  v_daily jsonb := '[]'::jsonb;
  v_weekly jsonb := '[]'::jsonb;
  v_product_dist jsonb := '[]'::jsonb;
  v_growth_pct numeric := 0;
  v_tracking_gaps jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF to_regclass('public.users') IS NOT NULL THEN
    SELECT count(*) INTO v_total FROM public.users WHERE deleted_at IS NULL;
    SELECT count(*) INTO v_new_today FROM public.users
      WHERE deleted_at IS NULL AND created_at >= date_trunc('day', now());
    SELECT count(*) INTO v_new_week FROM public.users
      WHERE deleted_at IS NULL AND created_at >= now() - interval '7 days';
    SELECT count(*) INTO v_new_month FROM public.users
      WHERE deleted_at IS NULL AND created_at >= now() - interval '30 days';
    SELECT count(*) INTO v_new_prev_week FROM public.users
      WHERE deleted_at IS NULL
        AND created_at >= now() - interval '14 days'
        AND created_at < now() - interval '7 days';
    SELECT count(*) INTO v_active_7d FROM public.users
      WHERE deleted_at IS NULL AND last_login_at >= now() - interval '7 days';
    SELECT count(*) INTO v_active_30d FROM public.users
      WHERE deleted_at IS NULL AND last_login_at >= now() - interval '30 days';
    SELECT count(*) INTO v_referral_signups FROM public.users
      WHERE deleted_at IS NULL AND referred_by IS NOT NULL;
    SELECT count(*) INTO v_organic_signups FROM public.users
      WHERE deleted_at IS NULL AND referred_by IS NULL;
    SELECT count(*) INTO v_returning FROM public.users
      WHERE deleted_at IS NULL
        AND last_login_at IS NOT NULL
        AND last_login_at > created_at + interval '1 day';

    SELECT coalesce(avg(profile_completion_score), 0)
    INTO v_profile_completion
    FROM public.user_profiles up
    JOIN public.users u ON u.id = up.user_id
    WHERE u.deleted_at IS NULL;

    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.day), '[]'::jsonb)
    INTO v_daily
    FROM (
      SELECT date_trunc('day', created_at)::date AS day, count(*)::int AS count
      FROM public.users
      WHERE deleted_at IS NULL AND created_at >= now() - interval '30 days'
      GROUP BY 1
      ORDER BY 1
    ) t;

    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.week), '[]'::jsonb)
    INTO v_weekly
    FROM (
      SELECT date_trunc('week', created_at)::date AS week, count(*)::int AS count
      FROM public.users
      WHERE deleted_at IS NULL AND created_at >= now() - interval '56 days'
      GROUP BY 1
      ORDER BY 1
    ) t;
  END IF;

  IF to_regclass('public.user_products') IS NOT NULL THEN
    SELECT count(DISTINCT user_id) INTO v_network_users FROM public.user_products
      WHERE product_slug = 'ownerr_network' AND status = 'active';
    SELECT count(DISTINCT user_id) INTO v_marketplace_users FROM public.user_products
      WHERE product_slug = 'marketplace' AND status = 'active';
    SELECT count(DISTINCT user_id) INTO v_os_users FROM public.user_products
      WHERE product_slug = 'ownerr_os' AND status = 'active';
    SELECT count(*) INTO v_multi_product FROM (
      SELECT user_id FROM public.user_products WHERE status = 'active'
      GROUP BY user_id HAVING count(*) >= 2
    ) mp;

    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
    INTO v_product_dist
    FROM (
      SELECT product_slug AS product, count(DISTINCT user_id)::int AS count
      FROM public.user_products
      WHERE status = 'active'
      GROUP BY product_slug
      ORDER BY count DESC
    ) t;
  END IF;

  IF to_regclass('public.referrals') IS NOT NULL THEN
    SELECT count(*), count(*) FILTER (WHERE status = 'completed')
    INTO v_referrals, v_referrals_completed
    FROM public.referrals;
  END IF;

  IF v_new_prev_week > 0 THEN
    v_growth_pct := round(((v_new_week - v_new_prev_week)::numeric / v_new_prev_week) * 100, 1);
  ELSIF v_new_week > 0 THEN
    v_growth_pct := 100;
  END IF;

  IF v_active_7d = 0 AND v_total > 0 THEN
    v_tracking_gaps := jsonb_build_array('active_users_use_last_login_at_only');
  END IF;

  RETURN jsonb_build_object(
    'totalUsers', v_total,
    'newUsersToday', v_new_today,
    'newUsersWeek', v_new_week,
    'newUsersMonth', v_new_month,
    'activeUsers7d', v_active_7d,
    'activeUsers30d', v_active_30d,
    'growthPercentWeek', v_growth_pct,
    'marketplaceUsers', v_marketplace_users,
    'ownerrOsUsers', v_os_users,
    'ownerrNetworkUsers', v_network_users,
    'multiProductUsers', v_multi_product,
    'referralSignups', v_referral_signups,
    'organicSignups', v_organic_signups,
    'referralConversionPercent',
      CASE WHEN v_referrals > 0
        THEN round((v_referrals_completed::numeric / v_referrals) * 100, 1)
        ELSE 0 END,
    'returningUsers', v_returning,
    'profileCompletionRate', round(v_profile_completion, 1),
    'dailySignups', v_daily,
    'weeklyGrowth', v_weekly,
    'productAdoption', v_product_dist,
    'trackingGaps', v_tracking_gaps
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_operations_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_feed jsonb := '[]'::jsonb;
  v_suspended bigint := 0;
  v_flagged_profiles bigint := 0;
  v_suspended_buyers bigint := 0;
  v_pending_submissions bigint := 0;
  v_draft_listings bigint := 0;
  v_new_users_24h bigint := 0;
  v_platform_admins bigint := 0;
  v_open_bids bigint := 0;
  v_pending_referrals bigint := 0;
  v_onboarding_incomplete bigint := 0;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF to_regclass('public.users') IS NOT NULL THEN
    SELECT count(*) INTO v_suspended FROM public.users WHERE status = 'suspended';
    SELECT count(*) INTO v_flagged_profiles FROM public.users
      WHERE deleted_at IS NULL
        AND (verification_status IN ('pending', 'rejected') OR trust_score < 20);
    SELECT count(*) INTO v_new_users_24h FROM public.users
      WHERE deleted_at IS NULL AND created_at >= now() - interval '24 hours';
    SELECT count(*) INTO v_platform_admins FROM public.users
      WHERE deleted_at IS NULL AND role = 'admin';
  END IF;

  IF to_regclass('public.marketplace_profiles') IS NOT NULL THEN
    SELECT count(*) INTO v_suspended_buyers FROM public.marketplace_profiles
      WHERE status = 'suspended';
  END IF;

  IF to_regclass('public.submissions') IS NOT NULL THEN
    SELECT count(*) INTO v_pending_submissions FROM public.submissions
      WHERE status IN ('pending', 'review', 'submitted', 'active');
  END IF;

  IF to_regclass('public.startups') IS NOT NULL THEN
    SELECT count(*) INTO v_draft_listings FROM public.startups WHERE status = 'draft';
  END IF;

  IF to_regclass('public.bids') IS NOT NULL THEN
    SELECT count(*) INTO v_open_bids FROM public.bids
      WHERE status NOT IN ('withdrawn', 'rejected', 'accepted');
  END IF;

  IF to_regclass('public.referrals') IS NOT NULL THEN
    SELECT count(*) INTO v_pending_referrals FROM public.referrals
      WHERE status IS DISTINCT FROM 'completed';
  END IF;

  IF to_regclass('public.user_profiles') IS NOT NULL THEN
    SELECT count(*) INTO v_onboarding_incomplete FROM public.user_profiles up
    JOIN public.users u ON u.id = up.user_id
    WHERE u.deleted_at IS NULL AND coalesce(up.onboarding_completed, false) = false;
  ELSIF to_regclass('public.ownerr_network_profiles') IS NOT NULL THEN
    SELECT count(*) INTO v_onboarding_incomplete FROM public.ownerr_network_profiles
    WHERE coalesce(onboarding_completed, false) = false;
  END IF;

  IF to_regclass('public.users') IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(ev), '[]'::jsonb) || v_feed
    INTO v_feed
    FROM (
      SELECT jsonb_build_object(
        'type', 'user_registered', 'at', created_at, 'label', coalesce(username, email, id::text)
      ) AS ev
      FROM public.users
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 8
    ) q;
  END IF;

  IF to_regclass('public.bids') IS NOT NULL THEN
    SELECT v_feed || coalesce(jsonb_agg(ev), '[]'::jsonb)
    INTO v_feed
    FROM (
      SELECT jsonb_build_object(
        'type', 'bid_submitted', 'at', created_at, 'label', startup_id::text
      ) AS ev
      FROM public.bids
      ORDER BY created_at DESC
      LIMIT 5
    ) q;
  END IF;

  IF to_regclass('public.referrals') IS NOT NULL THEN
    SELECT v_feed || coalesce(jsonb_agg(ev), '[]'::jsonb)
    INTO v_feed
    FROM (
      SELECT jsonb_build_object(
        'type', 'referral_recorded', 'at', created_at, 'label', product_slug
      ) AS ev
      FROM public.referrals
      ORDER BY created_at DESC
      LIMIT 5
    ) q;
  END IF;

  IF to_regclass('public.submissions') IS NOT NULL THEN
    SELECT v_feed || coalesce(jsonb_agg(ev), '[]'::jsonb)
    INTO v_feed
    FROM (
      SELECT jsonb_build_object(
        'type', 'submission_created', 'at', created_at, 'label', title
      ) AS ev
      FROM public.submissions
      ORDER BY created_at DESC
      LIMIT 5
    ) q;
  END IF;

  SELECT coalesce(
    (SELECT jsonb_agg(x ORDER BY (x->>'at') DESC)
     FROM jsonb_array_elements(v_feed) AS x
     LIMIT 25),
    '[]'::jsonb
  )
  INTO v_feed;

  RETURN jsonb_build_object(
    'auditLogsAvailable', false,
    'auditLogsNote', 'No admin_audit_log table yet — add migration for role changes, suspensions, listing edits.',
    'activityFeed', v_feed,
    'moderation', jsonb_build_object(
      'suspendedUsers', v_suspended,
      'flaggedProfiles', v_flagged_profiles,
      'suspendedMarketplaceProfiles', v_suspended_buyers,
      'flaggedListingsNote', 'Use Marketplace admin → Listings for listing review; drafts counted in governance KPIs.'
    ),
    'governance', jsonb_build_object(
      'pendingSubmissions', v_pending_submissions,
      'draftListings', v_draft_listings,
      'openBids', v_open_bids,
      'pendingReferrals', v_pending_referrals,
      'onboardingIncomplete', v_onboarding_incomplete,
      'newUsers24h', v_new_users_24h,
      'platformAdmins', v_platform_admins
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_platform_intelligence() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_operations_summary() TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
