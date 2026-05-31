-- Ownerr Network admin: unified members list, member 360°, charts.

BEGIN;

DROP POLICY IF EXISTS user_scores_admin_manage ON public.user_scores;
CREATE POLICY user_scores_admin_manage ON public.user_scores
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DO $$
BEGIN
  IF to_regclass('public.user_badges') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS user_badges_admin_manage ON public.user_badges';
    EXECUTE $p$
      CREATE POLICY user_badges_admin_manage ON public.user_badges
        FOR ALL TO authenticated
        USING (public.is_platform_admin())
        WITH CHECK (public.is_platform_admin())
    $p$;
  END IF;
  IF to_regclass('public.referral_events') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS referral_events_admin_manage ON public.referral_events';
    EXECUTE $p$
      CREATE POLICY referral_events_admin_manage ON public.referral_events
        FOR ALL TO authenticated
        USING (public.is_platform_admin())
        WITH CHECK (public.is_platform_admin())
    $p$;
  END IF;
END $$;

-- Directory: one row per member (account + profile summary)
CREATE OR REPLACE FUNCTION public.admin_network_members()
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

  IF to_regclass('public.users') IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t."createdAt" DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT
      u.id AS "userId",
      u.username,
      u.email,
      u.full_name AS "fullName",
      u.status,
      u.verification_status AS "verificationStatus",
      u.role AS "platformRole",
      u.referral_code AS "referralCode",
      u.created_at AS "createdAt",
      u.last_login_at AS "lastLoginAt",
      coalesce(up.onboarding_completed, false) AS "onboardingCompleted",
      coalesce(up.profile_completion_score, 0)::int AS "profileCompletionScore",
      up.user_type AS "userType",
      up.headline,
      coalesce(us.points, 0)::bigint AS points,
      coalesce(w.balance, 0)::bigint AS "walletBalance",
      (
        SELECT count(*)::int FROM public.referrals r
        WHERE r.referrer_user_id = u.id AND r.product_slug = 'ownerr_network'
      ) AS "referralsMade",
      (
        SELECT count(*)::int FROM public.referrals r
        WHERE r.referred_user_id = u.id AND r.product_slug = 'ownerr_network'
      ) AS "referralsReceived"
    FROM public.users u
    LEFT JOIN public.user_profiles up ON up.user_id = u.id
    LEFT JOIN public.user_scores us ON us.user_id = u.id
    LEFT JOIN public.wallets w ON w.user_id = u.id
    WHERE u.deleted_at IS NULL
  ) t;

  RETURN v_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_network_member_detail(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account jsonb;
  v_profile jsonb;
  v_scores jsonb;
  v_wallet jsonb;
  v_tx jsonb := '[]'::jsonb;
  v_referrals_out jsonb := '[]'::jsonb;
  v_referrals_in jsonb := '[]'::jsonb;
  v_badges jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT row_to_json(t)::jsonb INTO v_account
  FROM (
    SELECT
      u.id AS "userId",
      u.auth_user_id AS "authUserId",
      u.username,
      u.email,
      u.full_name AS "fullName",
      u.status,
      u.verification_status AS "verificationStatus",
      u.role AS "platformRole",
      u.referral_code AS "referralCode",
      u.referred_by AS "referredByUserId",
      u.created_at AS "createdAt",
      u.last_login_at AS "lastLoginAt",
      u.trust_score AS "trustScore"
    FROM public.users u
    WHERE u.id = p_user_id AND u.deleted_at IS NULL
  ) t;

  IF v_account IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT row_to_json(t)::jsonb INTO v_profile
  FROM (
    SELECT
      up.headline,
      up.bio,
      up.user_type AS "userType",
      up.location,
      up.remote_preference AS "remotePreference",
      up.experience_level AS "experienceLevel",
      up.skill_tags AS "skillTags",
      up.industries,
      up.onboarding_completed AS "onboardingCompleted",
      up.profile_completion_score AS "profileCompletionScore",
      up.visibility,
      up.updated_at AS "updatedAt"
    FROM public.user_profiles up
    WHERE up.user_id = p_user_id
  ) t;

  SELECT row_to_json(t)::jsonb INTO v_scores
  FROM (
    SELECT
      points,
      referrals_score AS "referralsScore",
      completion_score AS "completionScore",
      verification_score AS "verificationScore",
      activity_score AS "activityScore",
      network_score AS "networkScore",
      updated_at AS "updatedAt"
    FROM public.user_scores
    WHERE user_id = p_user_id
  ) t;

  SELECT row_to_json(t)::jsonb INTO v_wallet
  FROM (
    SELECT balance, total_earned AS "totalEarned", total_spent AS "totalSpent", locked_balance AS "lockedBalance"
    FROM public.wallets
    WHERE user_id = p_user_id
  ) t;

  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x."createdAt" DESC), '[]'::jsonb)
  INTO v_tx
  FROM (
    SELECT wt.id, wt.transaction_type AS type, wt.amount, wt.source, wt.created_at AS "createdAt"
    FROM public.wallet_transactions wt
    JOIN public.wallets w ON w.id = wt.wallet_id
    WHERE w.user_id = p_user_id
    ORDER BY wt.created_at DESC
    LIMIT 15
  ) x;

  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x."createdAt" DESC), '[]'::jsonb)
  INTO v_referrals_out
  FROM (
    SELECT r.id, r.status, r.source, r.reward_amount AS "rewardAmount", r.created_at AS "createdAt",
      ru.username AS "referredUsername"
    FROM public.referrals r
    JOIN public.users ru ON ru.id = r.referred_user_id
    WHERE r.referrer_user_id = p_user_id AND r.product_slug = 'ownerr_network'
  ) x;

  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x."createdAt" DESC), '[]'::jsonb)
  INTO v_referrals_in
  FROM (
    SELECT r.id, r.status, r.source, r.created_at AS "createdAt",
      ru.username AS "referrerUsername"
    FROM public.referrals r
    JOIN public.users ru ON ru.id = r.referrer_user_id
    WHERE r.referred_user_id = p_user_id AND r.product_slug = 'ownerr_network'
  ) x;

  IF to_regclass('public.user_badges') IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x."awardedAt" DESC), '[]'::jsonb)
    INTO v_badges
    FROM (
      SELECT badge_slug AS "badgeSlug", awarded_at AS "awardedAt"
      FROM public.user_badges
      WHERE user_id = p_user_id
    ) x;
  END IF;

  RETURN jsonb_build_object(
    'account', v_account,
    'profile', coalesce(v_profile, '{}'::jsonb),
    'scores', v_scores,
    'wallet', v_wallet,
    'recentTransactions', v_tx,
    'referralsMade', v_referrals_out,
    'referralsReceived', v_referrals_in,
    'badges', v_badges
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_network_charts()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signups jsonb := '[]'::jsonb;
  v_referrals jsonb := '[]'::jsonb;
  v_wallet jsonb := '[]'::jsonb;
  v_referral_status jsonb := '[]'::jsonb;
  v_onboarding jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF to_regclass('public.users') IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.day), '[]'::jsonb)
    INTO v_signups
    FROM (
      SELECT date_trunc('day', created_at)::date AS day, count(*)::int AS count
      FROM public.users
      WHERE deleted_at IS NULL AND created_at >= now() - interval '30 days'
      GROUP BY 1
    ) t;
  END IF;

  IF to_regclass('public.referrals') IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.day), '[]'::jsonb)
    INTO v_referrals
    FROM (
      SELECT date_trunc('day', created_at)::date AS day, count(*)::int AS count
      FROM public.referrals
      WHERE product_slug = 'ownerr_network' AND created_at >= now() - interval '30 days'
      GROUP BY 1
    ) t;

    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
    INTO v_referral_status
    FROM (
      SELECT status, count(*)::int AS count
      FROM public.referrals
      WHERE product_slug = 'ownerr_network'
      GROUP BY status
    ) t;
  END IF;

  IF to_regclass('public.wallet_transactions') IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.day), '[]'::jsonb)
    INTO v_wallet
    FROM (
      SELECT date_trunc('day', wt.created_at)::date AS day, coalesce(sum(wt.amount), 0)::bigint AS volume
      FROM public.wallet_transactions wt
      WHERE wt.created_at >= now() - interval '30 days'
      GROUP BY 1
    ) t;
  END IF;

  IF to_regclass('public.user_profiles') IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.bucket), '[]'::jsonb)
    INTO v_onboarding
    FROM (
      SELECT
        CASE
          WHEN profile_completion_score >= 80 THEN '80-100'
          WHEN profile_completion_score >= 50 THEN '50-79'
          WHEN profile_completion_score >= 1 THEN '1-49'
          ELSE '0'
        END AS bucket,
        count(*)::int AS count
      FROM public.user_profiles
      GROUP BY 1
    ) t;
  END IF;

  RETURN jsonb_build_object(
    'signupsByDay', v_signups,
    'referralsByDay', v_referrals,
    'walletVolumeByDay', v_wallet,
    'referralStatusBreakdown', v_referral_status,
    'profileCompletionBuckets', v_onboarding
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_network_members() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_network_member_detail(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_network_charts() TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
