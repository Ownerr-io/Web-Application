-- OWNERR Network: rename Unemployed Network schema + platform app_slug

-- ---------------------------------------------------------------------------
-- Table renames
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.unemployed_users') IS NOT NULL AND to_regclass('public.ownerr_network_users') IS NULL THEN
    ALTER TABLE public.unemployed_users RENAME TO ownerr_network_users;
  END IF;
  IF to_regclass('public.unemployed_points_ledger') IS NOT NULL AND to_regclass('public.ownerr_network_points_ledger') IS NULL THEN
    ALTER TABLE public.unemployed_points_ledger RENAME TO ownerr_network_points_ledger;
  END IF;
  IF to_regclass('public.unemployed_referrals') IS NOT NULL AND to_regclass('public.ownerr_network_referrals') IS NULL THEN
    ALTER TABLE public.unemployed_referrals RENAME TO ownerr_network_referrals;
  END IF;
  IF to_regclass('public.unemployed_mcq_sessions') IS NOT NULL AND to_regclass('public.ownerr_network_onboarding_sessions') IS NULL THEN
    ALTER TABLE public.unemployed_mcq_sessions RENAME TO ownerr_network_onboarding_sessions;
  END IF;
  IF to_regclass('public.unemployed_badges') IS NOT NULL AND to_regclass('public.ownerr_network_badges') IS NULL THEN
    ALTER TABLE public.unemployed_badges RENAME TO ownerr_network_badges;
  END IF;
  IF to_regclass('public.unemployed_user_badges') IS NOT NULL AND to_regclass('public.ownerr_network_user_badges') IS NULL THEN
    ALTER TABLE public.unemployed_user_badges RENAME TO ownerr_network_user_badges;
  END IF;
  IF to_regclass('public.unemployed_analytics_events') IS NOT NULL AND to_regclass('public.ownerr_network_analytics_events') IS NULL THEN
    ALTER TABLE public.unemployed_analytics_events RENAME TO ownerr_network_analytics_events;
  END IF;
  IF to_regclass('public.unemployed_profiles') IS NOT NULL AND to_regclass('public.ownerr_network_profiles') IS NULL THEN
    ALTER TABLE public.unemployed_profiles RENAME TO ownerr_network_profiles;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Profile fields (network identity)
-- ---------------------------------------------------------------------------
ALTER TABLE public.ownerr_network_profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS user_type TEXT,
  ADD COLUMN IF NOT EXISTS skill_tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS work_preference TEXT,
  ADD COLUMN IF NOT EXISTS goals TEXT,
  ADD COLUMN IF NOT EXISTS experience_level TEXT,
  ADD COLUMN IF NOT EXISTS availability TEXT,
  ADD COLUMN IF NOT EXISTS seriousness_score TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS profile_completion_pct INT NOT NULL DEFAULT 0 CHECK (profile_completion_pct >= 0 AND profile_completion_pct <= 100);

CREATE INDEX IF NOT EXISTS ownerr_network_profiles_username_idx ON public.ownerr_network_profiles (lower(username));
CREATE INDEX IF NOT EXISTS ownerr_network_profiles_user_type_idx ON public.ownerr_network_profiles (user_type);
CREATE INDEX IF NOT EXISTS ownerr_network_profiles_onboarding_idx ON public.ownerr_network_profiles (onboarding_completed_at);

-- Backfill username/display from users + onboarding sessions
UPDATE public.ownerr_network_profiles p
SET
  display_name = coalesce(p.display_name, u.name),
  username = coalesce(p.username, u.username),
  onboarding_completed_at = coalesce(
    p.onboarding_completed_at,
    (SELECT s.completed_at FROM public.ownerr_network_onboarding_sessions s
     JOIN public.ownerr_network_users u2 ON u2.id = s.user_id
     WHERE u2.auth_user_id = p.auth_user_id LIMIT 1)
  )
FROM public.ownerr_network_users u
WHERE u.auth_user_id = p.auth_user_id;

-- ---------------------------------------------------------------------------
-- Platform app_slug: unemployed → ownerr_network
-- ---------------------------------------------------------------------------
UPDATE public.user_app_access SET app_slug = 'ownerr_network' WHERE app_slug = 'unemployed';
UPDATE public.product_sessions SET product = 'ownerr_network' WHERE product = 'unemployed';
UPDATE public.platform_users SET preferred_app_slug = 'ownerr_network' WHERE preferred_app_slug = 'unemployed';

ALTER TABLE public.user_app_access DROP CONSTRAINT IF EXISTS user_app_access_app_slug_check;
ALTER TABLE public.user_app_access ADD CONSTRAINT user_app_access_app_slug_check
  CHECK (app_slug IN ('ownerr_os', 'marketplace', 'ownerr_network'));

ALTER TABLE public.product_sessions DROP CONSTRAINT IF EXISTS product_sessions_product_check;
ALTER TABLE public.product_sessions ADD CONSTRAINT product_sessions_product_check
  CHECK (product IN ('ownerr_os', 'marketplace', 'ownerr_network'));

-- ---------------------------------------------------------------------------
-- Points + provision RPCs (renamed)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ownerr_network_award_points(
  p_user_id UUID,
  p_type TEXT,
  p_amount BIGINT,
  p_idempotency_key TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ledger_id UUID;
BEGIN
  IF p_amount <= 0 THEN RETURN false; END IF;
  INSERT INTO ownerr_network_points_ledger (user_id, type, amount, idempotency_key, metadata)
  VALUES (p_user_id, p_type, p_amount, p_idempotency_key, p_metadata)
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_ledger_id;
  IF v_ledger_id IS NULL THEN RETURN false; END IF;
  UPDATE ownerr_network_users
  SET points = points + p_amount, wallet_balance = wallet_balance + p_amount,
      total_earned = total_earned + p_amount, updated_at = now()
  WHERE id = p_user_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION ownerr_network_current_user_row()
RETURNS ownerr_network_users
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT * FROM ownerr_network_users WHERE auth_user_id = auth.uid() LIMIT 1; $$;

CREATE OR REPLACE FUNCTION ownerr_network_provision_user(
  p_name TEXT,
  p_referral_code_input TEXT DEFAULT NULL,
  p_signup_source TEXT DEFAULT NULL,
  p_device_info JSONB DEFAULT NULL
) RETURNS ownerr_network_users
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_auth UUID := auth.uid();
  v_email TEXT;
  v_existing ownerr_network_users;
  v_referrer ownerr_network_users;
  v_referrer_id UUID;
  v_username TEXT;
  v_code TEXT;
  v_user ownerr_network_users;
  v_base TEXT;
BEGIN
  IF v_auth IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_existing FROM ownerr_network_users WHERE auth_user_id = v_auth;
  IF FOUND THEN RETURN v_existing; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_auth;
  v_base := coalesce(nullif(trim(p_name), ''), split_part(coalesce(v_email, ''), '@', 1));
  v_username := lower(regexp_replace(v_base, '[^a-zA-Z0-9]', '', 'g'));
  IF length(v_username) < 3 THEN v_username := 'user'; END IF;
  v_username := v_username || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4);
  v_code := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  INSERT INTO ownerr_network_users (auth_user_id, name, username, email, referral_code, signup_source, device_info)
  VALUES (v_auth, coalesce(nullif(trim(p_name), ''), split_part(coalesce(v_email, ''), '@', 1)),
          v_username, coalesce(v_email, ''), v_code, p_signup_source, p_device_info)
  RETURNING * INTO v_user;
  PERFORM ownerr_network_award_points(v_user.id, 'signup', 1, 'signup:' || v_user.id::text, '{}'::jsonb);
  IF p_referral_code_input IS NOT NULL AND length(trim(p_referral_code_input)) > 0 THEN
    SELECT * INTO v_referrer FROM ownerr_network_users WHERE referral_code = trim(p_referral_code_input) LIMIT 1;
    IF FOUND AND v_referrer.id <> v_user.id THEN
      v_referrer_id := v_referrer.id;
      UPDATE ownerr_network_users SET referred_by = v_referrer_id WHERE id = v_user.id;
      INSERT INTO ownerr_network_referrals (referrer_id, referee_id, status, completed_at)
      VALUES (v_referrer_id, v_user.id, 'completed', now()) ON CONFLICT (referee_id) DO NOTHING;
      UPDATE ownerr_network_users SET total_referrals = total_referrals + 1 WHERE id = v_referrer_id;
      PERFORM ownerr_network_award_points(v_referrer_id, 'referral', 1,
        'referral:' || v_referrer_id::text || ':' || v_user.id::text,
        jsonb_build_object('referee_id', v_user.id));
    END IF;
  END IF;
  PERFORM ownerr_network_check_badges(v_user.id);
  IF v_referrer_id IS NOT NULL THEN PERFORM ownerr_network_check_badges(v_referrer_id); END IF;
  RETURN v_user;
END;
$$;

CREATE OR REPLACE FUNCTION ownerr_network_complete_onboarding(
  p_name TEXT,
  p_username TEXT,
  p_answers JSONB
) RETURNS ownerr_network_users
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user ownerr_network_users;
  v_profile_id UUID;
  v_pct INT := 0;
BEGIN
  SELECT * INTO v_user FROM ownerr_network_users WHERE auth_user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'profile_missing'; END IF;

  IF nullif(trim(p_name), '') IS NOT NULL THEN
    UPDATE ownerr_network_users SET name = trim(p_name), updated_at = now() WHERE id = v_user.id;
  END IF;
  IF nullif(trim(p_username), '') IS NOT NULL THEN
    UPDATE ownerr_network_users SET username = lower(trim(p_username)), updated_at = now() WHERE id = v_user.id;
  END IF;

  INSERT INTO ownerr_network_onboarding_sessions (user_id, answers_json, completed_at)
  VALUES (v_user.id, p_answers, now())
  ON CONFLICT (user_id) DO UPDATE SET answers_json = EXCLUDED.answers_json, completed_at = EXCLUDED.completed_at;

  INSERT INTO ownerr_network_profiles (auth_user_id)
  VALUES (v_user.auth_user_id)
  ON CONFLICT (auth_user_id) DO NOTHING;

  SELECT id INTO v_profile_id FROM ownerr_network_profiles WHERE auth_user_id = v_user.auth_user_id;

  UPDATE ownerr_network_profiles SET
    display_name = coalesce(nullif(trim(p_name), ''), display_name, v_user.name),
    username = coalesce(nullif(lower(trim(p_username)), ''), username, v_user.username),
    user_type = coalesce(p_answers->>'describes_you', user_type),
    skill_tags = CASE
      WHEN p_answers ? 'skills' AND jsonb_typeof(p_answers->'skills') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(p_answers->'skills'))
      ELSE skill_tags
    END,
    work_preference = coalesce(p_answers->>'remote', work_preference),
    goals = coalesce(p_answers->>'looking_for', goals),
    experience_level = coalesce(p_answers->>'experience', experience_level),
    availability = coalesce(p_answers->>'availability', availability),
    seriousness_score = coalesce(p_answers->>'seriousness', seriousness_score),
    onboarding_completed_at = now(),
    profile_completion_pct = 100,
    metadata = metadata || jsonb_build_object('ownerr_network_user_id', v_user.id::text),
    updated_at = now()
  WHERE id = v_profile_id;

  PERFORM ownerr_network_award_points(v_user.id, 'profile_completed', 5, 'profile:' || v_user.id::text, p_answers);
  PERFORM ownerr_network_check_badges(v_user.id);
  SELECT * INTO v_user FROM ownerr_network_users WHERE id = v_user.id;
  RETURN v_user;
END;
$$;

CREATE OR REPLACE FUNCTION ownerr_network_complete_mcq(p_answers JSONB)
RETURNS ownerr_network_users
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN ownerr_network_complete_onboarding(
    coalesce(p_answers->>'name', ''),
    coalesce(p_answers->>'username', ''),
    p_answers
  );
END;
$$;

CREATE OR REPLACE FUNCTION ownerr_network_claim_daily_activity() RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user ownerr_network_users; v_today DATE := (now() AT TIME ZONE 'utc')::date;
BEGIN
  SELECT * INTO v_user FROM ownerr_network_users WHERE auth_user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_user.last_daily_reward_at = v_today THEN RETURN false; END IF;
  UPDATE ownerr_network_users SET last_daily_reward_at = v_today WHERE id = v_user.id;
  PERFORM ownerr_network_award_points(v_user.id, 'daily_activity', 1, 'daily:' || v_user.id::text || ':' || v_today::text, '{}'::jsonb);
  PERFORM ownerr_network_check_badges(v_user.id);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION ownerr_network_verify_profile_bonus() RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user ownerr_network_users;
BEGIN
  SELECT * INTO v_user FROM ownerr_network_users WHERE auth_user_id = auth.uid();
  IF NOT FOUND OR NOT v_user.profile_verified THEN RETURN false; END IF;
  RETURN ownerr_network_award_points(v_user.id, 'verified', 10, 'verified:' || v_user.id::text, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION ownerr_network_check_badges(p_user_id UUID) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_refs INT; v_has_survey BOOLEAN;
BEGIN
  SELECT total_referrals INTO v_refs FROM ownerr_network_users WHERE id = p_user_id;
  SELECT EXISTS(
    SELECT 1 FROM ownerr_network_onboarding_sessions WHERE user_id = p_user_id AND completed_at IS NOT NULL
  ) INTO v_has_survey;
  IF v_has_survey THEN
    INSERT INTO ownerr_network_user_badges (user_id, badge_id)
    SELECT p_user_id, id FROM ownerr_network_badges WHERE code = 'builder' ON CONFLICT DO NOTHING;
  END IF;
  IF v_refs >= 5 THEN
    INSERT INTO ownerr_network_user_badges (user_id, badge_id)
    SELECT p_user_id, id FROM ownerr_network_badges WHERE code = 'recruiter' ON CONFLICT DO NOTHING;
  END IF;
  IF v_refs >= 10 THEN
    INSERT INTO ownerr_network_user_badges (user_id, badge_id)
    SELECT p_user_id, id FROM ownerr_network_badges WHERE code = 'connector' ON CONFLICT DO NOTHING;
  END IF;
  IF EXISTS(SELECT 1 FROM ownerr_network_points_ledger WHERE user_id = p_user_id AND type = 'daily_activity' LIMIT 3) THEN
    INSERT INTO ownerr_network_user_badges (user_id, badge_id)
    SELECT p_user_id, id FROM ownerr_network_badges WHERE code = 'hustler' ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION ownerr_network_provision_user TO authenticated;
GRANT EXECUTE ON FUNCTION ownerr_network_complete_onboarding TO authenticated;
GRANT EXECUTE ON FUNCTION ownerr_network_complete_mcq TO authenticated;
GRANT EXECUTE ON FUNCTION ownerr_network_claim_daily_activity TO authenticated;
GRANT EXECUTE ON FUNCTION ownerr_network_verify_profile_bonus TO authenticated;
GRANT EXECUTE ON FUNCTION ownerr_network_current_user_row TO authenticated;

-- Discover: public directory rows for completed profiles
DROP POLICY IF EXISTS ownerr_network_profiles_select_discover ON public.ownerr_network_profiles;
CREATE POLICY ownerr_network_profiles_select_discover
  ON public.ownerr_network_profiles FOR SELECT TO authenticated
  USING (onboarding_completed_at IS NOT NULL);
