-- Extended admin intelligence (real aggregates only; no synthetic metrics).

BEGIN;

-- ---------------------------------------------------------------------------
-- Platform intelligence (users, products, referrals, trends)
-- ---------------------------------------------------------------------------
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
    'trackingGaps',
      CASE WHEN v_active_7d = 0 AND v_total > 0
        THEN jsonb_build_array('active_users_use_last_login_at_only')
        ELSE '[]'::jsonb END
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Marketplace intelligence
-- ---------------------------------------------------------------------------
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
  v_viewed bigint := 0;
  v_interests bigint := 0;
  v_bids bigint := 0;
  v_conversations bigint := 0;
  v_closed bigint := 0;
  v_funnel jsonb := '[]'::jsonb;
  v_pipeline jsonb := '[]'::jsonb;
  v_startup_perf jsonb := '[]'::jsonb;
  v_industry_analytics jsonb := '[]'::jsonb;
  v_top_buyers jsonb := '[]'::jsonb;
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

    SELECT coalesce(sum((metadata->>'listing_views')::bigint), 0)::bigint
    INTO v_viewed
    FROM public.startups
    WHERE coalesce((metadata->>'listing_views')::int, 0) > 0;

    IF v_viewed = 0 THEN
      SELECT count(*) INTO v_viewed FROM public.startups WHERE status = 'published';
    END IF;

    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
    INTO v_top_industries
    FROM (
      SELECT coalesce(industry, 'Unknown') AS industry, count(*)::int AS count
      FROM public.startups
      GROUP BY coalesce(industry, 'Unknown')
      ORDER BY count(*) DESC
      LIMIT 8
    ) t;

    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
    INTO v_startup_perf
    FROM (
      SELECT
        s.id AS "startupId",
        s.title AS title,
        coalesce((s.metadata->>'listing_views')::int, 0) AS views,
        coalesce(i.interest_count, 0)::int AS "interestCount",
        coalesce(b.bid_count, 0)::int AS "bidCount",
        coalesce(c.conv_count, 0)::int AS "conversationCount",
        greatest(0, (extract(epoch from (now() - s.created_at)) / 86400)::int) AS "daysListed",
        CASE WHEN coalesce((s.metadata->>'listing_views')::int, 0) > 0
          THEN round((coalesce(i.interest_count, 0)::numeric
            / greatest((s.metadata->>'listing_views')::int, 1)) * 100, 1)
          ELSE 0 END AS "conversionRate"
      FROM public.startups s
      LEFT JOIN (
        SELECT startup_id, count(*) AS interest_count
        FROM public.startup_interests GROUP BY startup_id
      ) i ON i.startup_id = s.id
      LEFT JOIN (
        SELECT startup_id, count(*) AS bid_count FROM public.bids GROUP BY startup_id
      ) b ON b.startup_id = s.id
      LEFT JOIN (
        SELECT startup_id, count(*) AS conv_count FROM public.conversations GROUP BY startup_id
      ) c ON c.startup_id = s.id
      ORDER BY coalesce(i.interest_count, 0) DESC
      LIMIT 15
    ) t;

    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
    INTO v_industry_analytics
    FROM (
      SELECT
        coalesce(s.industry, 'Unknown') AS industry,
        count(DISTINCT s.id)::int AS "listingCount",
        coalesce(sum(i.cnt), 0)::int AS "interestCount",
        coalesce(sum(b.cnt), 0)::int AS "bidCount"
      FROM public.startups s
      LEFT JOIN (
        SELECT startup_id, count(*) AS cnt FROM public.startup_interests GROUP BY startup_id
      ) i ON i.startup_id = s.id
      LEFT JOIN (
        SELECT startup_id, count(*) AS cnt FROM public.bids GROUP BY startup_id
      ) b ON b.startup_id = s.id
      GROUP BY coalesce(s.industry, 'Unknown')
      ORDER BY coalesce(sum(i.cnt), 0) DESC
      LIMIT 12
    ) t;
  END IF;

  IF to_regclass('public.startup_interests') IS NOT NULL THEN
    SELECT count(*) INTO v_interests FROM public.startup_interests;
    SELECT count(*) INTO v_closed FROM public.startup_interests WHERE status = 'closed';

    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
    INTO v_pipeline
    FROM (
      SELECT status, count(*)::int AS count
      FROM public.startup_interests
      GROUP BY status
      ORDER BY count(*) DESC
    ) t;
  END IF;

  IF to_regclass('public.bids') IS NOT NULL THEN
    SELECT count(*) INTO v_bids FROM public.bids;

    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
    INTO v_top_buyers
    FROM (
      SELECT
        mp.id AS "buyerProfileId",
        left(mp.id::text, 8) AS label,
        coalesce(ic.cnt, 0)::int AS interests,
        coalesce(bc.cnt, 0)::int AS bids
      FROM public.marketplace_profiles mp
      LEFT JOIN (
        SELECT buyer_profile_id, count(*) AS cnt FROM public.startup_interests GROUP BY buyer_profile_id
      ) ic ON ic.buyer_profile_id = mp.id
      LEFT JOIN (
        SELECT buyer_profile_id, count(*) AS cnt FROM public.bids GROUP BY buyer_profile_id
      ) bc ON bc.buyer_profile_id = mp.id
      WHERE mp.desk_role = 'buyer'
      ORDER BY coalesce(bc.cnt, 0) + coalesce(ic.cnt, 0) DESC
      LIMIT 10
    ) t;
  END IF;

  IF to_regclass('public.conversations') IS NOT NULL THEN
    SELECT count(*) INTO v_conversations FROM public.conversations;
  END IF;

  v_funnel := jsonb_build_array(
    jsonb_build_object('stage', 'listingsCreated', 'count', v_listings),
    jsonb_build_object('stage', 'published', 'count', v_published),
    jsonb_build_object('stage', 'viewed', 'count', v_viewed,
      'note', CASE WHEN to_regclass('public.startups') IS NOT NULL
        THEN 'uses metadata.listing_views sum when present else published count proxy'
        ELSE NULL END),
    jsonb_build_object('stage', 'interested', 'count', v_interests),
    jsonb_build_object('stage', 'bidSubmitted', 'count', v_bids),
    jsonb_build_object('stage', 'conversationStarted', 'count', v_conversations),
    jsonb_build_object('stage', 'closed', 'count', v_closed)
  );

  IF to_regclass('public.submissions') IS NOT NULL THEN
    SELECT count(*) INTO v_submissions FROM public.submissions;
    SELECT count(*) INTO v_pending FROM public.submissions
      WHERE status IN ('pending', 'review', 'submitted', 'active');
    SELECT coalesce(avg(score), 0) INTO v_avg_score FROM public.submissions WHERE score IS NOT NULL;
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
    'topIndustries', v_top_industries,
    'funnel', v_funnel,
    'dealPipeline', v_pipeline,
    'startupPerformance', v_startup_perf,
    'industryAnalytics', v_industry_analytics,
    'topBuyers', v_top_buyers,
    'trackingGaps', jsonb_build_array(
      'per_listing_view_events_not_in_db_use_metadata_listing_views',
      'offer_made_stage_not_in_startup_interests_status_enum'
    )
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Network intelligence
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_network_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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
  v_profiles bigint := 0;
  v_onboarding_started bigint := 0;
  v_funnel jsonb := '[]'::jsonb;
  v_top_referrers jsonb := '[]'::jsonb;
  v_top_earners jsonb := '[]'::jsonb;
  v_most_active jsonb := '[]'::jsonb;
  v_fast_growing jsonb := '[]'::jsonb;
  v_referrals_by_day jsonb := '[]'::jsonb;
  v_referrals_by_source jsonb := '[]'::jsonb;
  v_avg_balance numeric := 0;
  v_inactive bigint := 0;
  v_incomplete bigint := 0;
  v_suspicious_referrals bigint := 0;
  v_health jsonb := '[]'::jsonb;
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
    SELECT count(*) INTO v_inactive FROM public.users
      WHERE deleted_at IS NULL
        AND coalesce(last_login_at, created_at) < now() - interval '30 days';
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
    SELECT count(*) INTO v_profiles FROM public.user_profiles;
    SELECT count(*) INTO v_onboarded FROM public.user_profiles WHERE onboarding_completed = true;
    SELECT count(*) INTO v_onboarding_started FROM public.user_profiles
      WHERE onboarding_completed = false
        AND (headline IS NOT NULL OR bio IS NOT NULL OR cardinality(skill_tags) > 0);
    SELECT count(*) INTO v_incomplete FROM public.user_profiles
      WHERE profile_completion_score < 50 OR onboarding_completed = false;
  END IF;

  IF to_regclass('public.referrals') IS NOT NULL THEN
    SELECT count(*) INTO v_referrals FROM public.referrals
      WHERE product_slug = 'ownerr_network';
    SELECT count(*) INTO v_referrals_completed FROM public.referrals
      WHERE product_slug = 'ownerr_network' AND status = 'completed';

    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.day), '[]'::jsonb)
    INTO v_referrals_by_day
    FROM (
      SELECT date_trunc('day', created_at)::date AS day, count(*)::int AS count
      FROM public.referrals
      WHERE product_slug = 'ownerr_network' AND created_at >= now() - interval '30 days'
      GROUP BY 1
    ) t;

    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
    INTO v_referrals_by_source
    FROM (
      SELECT coalesce(source, 'unknown') AS source, count(*)::int AS count
      FROM public.referrals
      WHERE product_slug = 'ownerr_network'
      GROUP BY coalesce(source, 'unknown')
      ORDER BY count(*) DESC
      LIMIT 12
    ) t;

    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
    INTO v_top_referrers
    FROM (
      SELECT u.username AS label, count(*)::int AS count
      FROM public.referrals r
      JOIN public.users u ON u.id = r.referrer_user_id
      WHERE r.product_slug = 'ownerr_network'
      GROUP BY u.id, u.username
      ORDER BY count(*) DESC
      LIMIT 10
    ) t;

    SELECT count(*) INTO v_suspicious_referrals
    FROM (
      SELECT referrer_user_id FROM public.referrals
      WHERE product_slug = 'ownerr_network' AND created_at >= now() - interval '7 days'
      GROUP BY referrer_user_id
      HAVING count(*) >= 10
    ) s;
  END IF;

  IF to_regclass('public.wallet_transactions') IS NOT NULL THEN
    SELECT count(*), coalesce(sum(amount), 0)
    INTO v_tx, v_tx_volume
    FROM public.wallet_transactions;
  END IF;

  IF to_regclass('public.wallets') IS NOT NULL THEN
    SELECT coalesce(avg(balance), 0) INTO v_avg_balance FROM public.wallets;
    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
    INTO v_top_earners
    FROM (
      SELECT u.username AS label, w.total_earned::bigint AS earned
      FROM public.wallets w
      JOIN public.users u ON u.id = w.user_id
      ORDER BY w.total_earned DESC
      LIMIT 10
    ) t;
  END IF;

  IF to_regclass('public.user_scores') IS NOT NULL THEN
    SELECT coalesce(sum(points), 0)::bigint INTO v_points FROM public.user_scores;
    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
    INTO v_most_active
    FROM (
      SELECT u.username AS label, us.activity_score::bigint AS score
      FROM public.user_scores us
      JOIN public.users u ON u.id = us.user_id
      ORDER BY us.activity_score DESC
      LIMIT 10
    ) t;
  END IF;

  IF to_regclass('public.users') IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
    INTO v_fast_growing
    FROM (
      SELECT u.username AS label, count(r.id)::int AS "referrals7d"
      FROM public.users u
      LEFT JOIN public.referrals r ON r.referrer_user_id = u.id
        AND r.created_at >= now() - interval '7 days'
      WHERE u.deleted_at IS NULL AND u.created_at >= now() - interval '14 days'
      GROUP BY u.id, u.username
      ORDER BY count(r.id) DESC
      LIMIT 10
    ) t;
  END IF;

  v_funnel := jsonb_build_array(
    jsonb_build_object('stage', 'signup', 'count', v_users),
    jsonb_build_object('stage', 'profileCreated', 'count', v_profiles),
    jsonb_build_object('stage', 'onboardingStarted', 'count', v_onboarding_started),
    jsonb_build_object('stage', 'onboardingCompleted', 'count', v_onboarded),
    jsonb_build_object('stage', 'referralShared', 'count', v_referrals),
    jsonb_build_object('stage', 'referralConverted', 'count', v_referrals_completed)
  );

  v_health := jsonb_build_array(
    jsonb_build_object('flag', 'inactive30d', 'count', v_inactive),
    jsonb_build_object('flag', 'incompleteProfiles', 'count', v_incomplete),
    jsonb_build_object('flag', 'highReferralVelocity7d', 'count', v_suspicious_referrals),
    jsonb_build_object('flag', 'suspiciousPoints', 'count', 0,
      'note', 'requires_points_anomaly_rules_not_implemented')
  );

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
    'totalPoints', v_points,
    'averageWalletBalance', round(v_avg_balance, 0),
    'funnel', v_funnel,
    'topReferrers', v_top_referrers,
    'topEarners', v_top_earners,
    'mostActiveUsers', v_most_active,
    'fastestGrowingUsers', v_fast_growing,
    'referralsByDay', v_referrals_by_day,
    'referralsBySource', v_referrals_by_source,
    'userHealth', v_health
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Ownerr OS / founder funnel
-- ---------------------------------------------------------------------------
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
  v_submissions bigint := 0;
  v_with_visits bigint := 0;
  v_with_signups bigint := 0;
  v_visit_events bigint := 0;
  v_signup_events bigint := 0;
  v_funnel jsonb := '[]'::jsonb;
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

  IF to_regclass('public.founder_submissions') IS NOT NULL THEN
    SELECT count(*) INTO v_submissions FROM public.founder_submissions;
    SELECT count(*) INTO v_with_visits FROM public.founder_submissions WHERE visit_count > 0;
    SELECT count(*) INTO v_with_signups FROM public.founder_submissions WHERE referral_signup_count > 0;
  END IF;

  IF to_regclass('public.founder_referral_events') IS NOT NULL THEN
    SELECT count(*) INTO v_visit_events FROM public.founder_referral_events WHERE event_type = 'visit';
    SELECT count(*) INTO v_signup_events FROM public.founder_referral_events WHERE event_type = 'signup';
  END IF;

  v_funnel := jsonb_build_array(
    jsonb_build_object('stage', 'submissionCompleted', 'count', v_submissions,
      'note', 'landing_visit_and_submission_started_not_tracked_in_db'),
    jsonb_build_object('stage', 'referralLinkGenerated', 'count', v_submissions),
    jsonb_build_object('stage', 'linkVisited', 'count', v_with_visits),
    jsonb_build_object('stage', 'referralEventsVisit', 'count', v_visit_events),
    jsonb_build_object('stage', 'referralConverted', 'count', v_with_signups),
    jsonb_build_object('stage', 'referralEventsSignup', 'count', v_signup_events)
  );

  RETURN jsonb_build_object(
    'totalListings', v_listings,
    'publishedListings', v_published,
    'draftListings', v_draft,
    'founderAnalytics', v_founder,
    'founderFunnel', v_funnel,
    'trackingGaps', jsonb_build_array(
      'founder_landing_visit',
      'submission_started_partial',
      'explicit_share_events_not_in_db'
    )
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
    'platform', public.admin_platform_intelligence(),
    'generatedAt', to_jsonb(now())
  );
END;
$$;

-- Operations & system health
-- ---------------------------------------------------------------------------
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
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF to_regclass('public.users') IS NOT NULL THEN
    SELECT count(*) INTO v_suspended FROM public.users WHERE status = 'suspended';
    SELECT count(*) INTO v_flagged_profiles FROM public.users
      WHERE verification_status IN ('pending', 'rejected') OR trust_score < 20;
  END IF;

  IF to_regclass('public.marketplace_profiles') IS NOT NULL THEN
    SELECT count(*) INTO v_suspended_buyers FROM public.marketplace_profiles
      WHERE status = 'suspended';
  END IF;

  IF to_regclass('public.users') IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(ev), '[]'::jsonb) || v_feed
    INTO v_feed
    FROM (
      SELECT jsonb_build_object(
        'type', 'user_registered', 'at', created_at, 'label', username
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
      'flaggedListingsNote', 'No listing_flag column — use archived + unverified heuristics in CRUD'
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_system_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tables jsonb := '[]'::jsonb;
  v_sessions bigint := 0;
  v_sessions_active bigint := 0;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  v_tables := '[]'::jsonb;
  IF to_regclass('public.users') IS NOT NULL THEN
    SELECT v_tables || jsonb_build_array(jsonb_build_object('name', 'users', 'rows', count(*)::bigint))
    INTO v_tables FROM public.users;
  END IF;
  IF to_regclass('public.user_profiles') IS NOT NULL THEN
    SELECT v_tables || jsonb_build_array(jsonb_build_object('name', 'user_profiles', 'rows', count(*)::bigint))
    INTO v_tables FROM public.user_profiles;
  END IF;
  IF to_regclass('public.referrals') IS NOT NULL THEN
    SELECT v_tables || jsonb_build_array(jsonb_build_object('name', 'referrals', 'rows', count(*)::bigint))
    INTO v_tables FROM public.referrals;
  END IF;
  IF to_regclass('public.startups') IS NOT NULL THEN
    SELECT v_tables || jsonb_build_array(jsonb_build_object('name', 'startups', 'rows', count(*)::bigint))
    INTO v_tables FROM public.startups;
  END IF;
  IF to_regclass('public.startup_interests') IS NOT NULL THEN
    SELECT v_tables || jsonb_build_array(jsonb_build_object('name', 'startup_interests', 'rows', count(*)::bigint))
    INTO v_tables FROM public.startup_interests;
  END IF;
  IF to_regclass('public.bids') IS NOT NULL THEN
    SELECT v_tables || jsonb_build_array(jsonb_build_object('name', 'bids', 'rows', count(*)::bigint))
    INTO v_tables FROM public.bids;
  END IF;
  IF to_regclass('public.founder_submissions') IS NOT NULL THEN
    SELECT v_tables || jsonb_build_array(jsonb_build_object('name', 'founder_submissions', 'rows', count(*)::bigint))
    INTO v_tables FROM public.founder_submissions;
  END IF;

  IF to_regclass('public.product_sessions') IS NOT NULL THEN
    SELECT count(*), count(*) FILTER (WHERE last_active_at >= now() - interval '24 hours')
    INTO v_sessions, v_sessions_active
    FROM public.product_sessions;
  END IF;

  RETURN jsonb_build_object(
    'tableCounts', v_tables,
    'productSessionsTotal', v_sessions,
    'productSessionsActive24h', v_sessions_active,
    'storageUsageAvailable', false,
    'authFailuresAvailable', false,
    'apiErrorsAvailable', false,
    'rpcErrorsAvailable', false,
    'notes', jsonb_build_array(
      'storage_and_auth_metrics_require_supabase_dashboard_or_log_drain'
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_platform_intelligence() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_operations_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_system_health() TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
