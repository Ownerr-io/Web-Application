-- Enrich platform-level admin RPCs (hub / operations / system only).

BEGIN;

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
  v_users_total bigint := 0;
  v_users_deleted bigint := 0;
  v_admins bigint := 0;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF to_regclass('public.users') IS NOT NULL THEN
    SELECT count(*) FILTER (WHERE deleted_at IS NULL),
           count(*) FILTER (WHERE deleted_at IS NOT NULL),
           count(*) FILTER (WHERE deleted_at IS NULL AND role = 'admin')
    INTO v_users_total, v_users_deleted, v_admins
    FROM public.users;
    SELECT v_tables || jsonb_build_array(jsonb_build_object('name', 'users', 'rows', v_users_total, 'group', 'identity'))
    INTO v_tables;
  END IF;

  IF to_regclass('public.user_profiles') IS NOT NULL THEN
    SELECT v_tables || jsonb_build_array(jsonb_build_object('name', 'user_profiles', 'rows', count(*)::bigint, 'group', 'identity'))
    INTO v_tables FROM public.user_profiles;
  END IF;

  IF to_regclass('public.user_products') IS NOT NULL THEN
    SELECT v_tables || jsonb_build_array(jsonb_build_object('name', 'user_products', 'rows', count(*)::bigint, 'group', 'identity'))
    INTO v_tables FROM public.user_products;
  END IF;

  IF to_regclass('public.product_sessions') IS NOT NULL THEN
    SELECT count(*), count(*) FILTER (WHERE last_active_at >= now() - interval '24 hours')
    INTO v_sessions, v_sessions_active
    FROM public.product_sessions;
    SELECT v_tables || jsonb_build_array(jsonb_build_object('name', 'product_sessions', 'rows', v_sessions, 'group', 'identity'))
    INTO v_tables;
  END IF;

  IF to_regclass('public.marketplace_profiles') IS NOT NULL THEN
    SELECT v_tables || jsonb_build_array(jsonb_build_object('name', 'marketplace_profiles', 'rows', count(*)::bigint, 'group', 'marketplace'))
    INTO v_tables FROM public.marketplace_profiles;
  END IF;

  IF to_regclass('public.startups') IS NOT NULL THEN
    SELECT v_tables || jsonb_build_array(jsonb_build_object('name', 'startups', 'rows', count(*)::bigint, 'group', 'marketplace'))
    INTO v_tables FROM public.startups;
  END IF;

  IF to_regclass('public.startup_interests') IS NOT NULL THEN
    SELECT v_tables || jsonb_build_array(jsonb_build_object('name', 'startup_interests', 'rows', count(*)::bigint, 'group', 'marketplace'))
    INTO v_tables FROM public.startup_interests;
  END IF;

  IF to_regclass('public.bids') IS NOT NULL THEN
    SELECT v_tables || jsonb_build_array(jsonb_build_object('name', 'bids', 'rows', count(*)::bigint, 'group', 'marketplace'))
    INTO v_tables FROM public.bids;
  END IF;

  IF to_regclass('public.submissions') IS NOT NULL THEN
    SELECT v_tables || jsonb_build_array(jsonb_build_object('name', 'submissions', 'rows', count(*)::bigint, 'group', 'marketplace'))
    INTO v_tables FROM public.submissions;
  END IF;

  IF to_regclass('public.referrals') IS NOT NULL THEN
    SELECT v_tables || jsonb_build_array(jsonb_build_object('name', 'referrals', 'rows', count(*)::bigint, 'group', 'network'))
    INTO v_tables FROM public.referrals;
  END IF;

  IF to_regclass('public.founder_submissions') IS NOT NULL THEN
    SELECT v_tables || jsonb_build_array(jsonb_build_object('name', 'founder_submissions', 'rows', count(*)::bigint, 'group', 'ownerr_os'))
    INTO v_tables FROM public.founder_submissions;
  END IF;

  IF to_regclass('public.conversations') IS NOT NULL THEN
    SELECT v_tables || jsonb_build_array(jsonb_build_object('name', 'conversations', 'rows', count(*)::bigint, 'group', 'marketplace'))
    INTO v_tables FROM public.conversations;
  END IF;

  IF to_regclass('public.messages') IS NOT NULL THEN
    SELECT v_tables || jsonb_build_array(jsonb_build_object('name', 'messages', 'rows', count(*)::bigint, 'group', 'marketplace'))
    INTO v_tables FROM public.messages;
  END IF;

  RETURN jsonb_build_object(
    'tableCounts', v_tables,
    'productSessionsTotal', v_sessions,
    'productSessionsActive24h', v_sessions_active,
    'usersTotal', v_users_total,
    'usersDeleted', v_users_deleted,
    'platformAdmins', v_admins,
    'storageUsageAvailable', false,
    'authFailuresAvailable', false,
    'apiErrorsAvailable', false,
    'rpcErrorsAvailable', false,
    'notes', jsonb_build_array(
      'storage_and_auth_metrics_require_supabase_dashboard_or_log_drain',
      'table_counts_are_live_row_totals_not_storage_bytes'
    )
  );
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
