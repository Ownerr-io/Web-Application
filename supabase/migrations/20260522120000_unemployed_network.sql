-- OWNERR Unemployed Network (Supabase-first: Auth + RLS + RPC)

CREATE TABLE IF NOT EXISTS unemployed_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  profile_image TEXT,
  referral_code TEXT NOT NULL UNIQUE,
  referred_by UUID REFERENCES unemployed_users(id) ON DELETE SET NULL,
  points BIGINT NOT NULL DEFAULT 0 CHECK (points >= 0),
  wallet_balance BIGINT NOT NULL DEFAULT 0 CHECK (wallet_balance >= 0),
  total_earned BIGINT NOT NULL DEFAULT 0 CHECK (total_earned >= 0),
  total_referrals INT NOT NULL DEFAULT 0 CHECK (total_referrals >= 0),
  leaderboard_rank INT,
  subscription_status TEXT NOT NULL DEFAULT 'free',
  profile_verified BOOLEAN NOT NULL DEFAULT false,
  last_daily_reward_at DATE,
  signup_source TEXT,
  device_info JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unemployed_users_referral_code ON unemployed_users(referral_code);
CREATE INDEX IF NOT EXISTS idx_unemployed_users_points ON unemployed_users(points DESC);
CREATE INDEX IF NOT EXISTS idx_unemployed_users_created ON unemployed_users(created_at DESC);

CREATE TABLE IF NOT EXISTS unemployed_points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES unemployed_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount BIGINT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unemployed_ledger_user ON unemployed_points_ledger(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS unemployed_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES unemployed_users(id) ON DELETE CASCADE,
  referee_id UUID NOT NULL UNIQUE REFERENCES unemployed_users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_unemployed_referrals_referrer ON unemployed_referrals(referrer_id, status);

CREATE TABLE IF NOT EXISTS unemployed_mcq_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES unemployed_users(id) ON DELETE CASCADE,
  answers_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS unemployed_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS unemployed_user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES unemployed_users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES unemployed_badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS unemployed_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES unemployed_users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unemployed_events_type ON unemployed_analytics_events(event_type, created_at DESC);

INSERT INTO unemployed_badges (code, name, description) VALUES
  ('hustler', 'Hustler', 'Daily activity streak'),
  ('builder', 'Builder', 'Completed onboarding survey'),
  ('recruiter', 'Recruiter', '5+ successful referrals'),
  ('connector', 'Connector', '10+ successful referrals')
ON CONFLICT (code) DO NOTHING;

-- Award points via ledger (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION unemployed_award_points(
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
  IF p_amount <= 0 THEN
    RETURN false;
  END IF;

  INSERT INTO unemployed_points_ledger (user_id, type, amount, idempotency_key, metadata)
  VALUES (p_user_id, p_type, p_amount, p_idempotency_key, p_metadata)
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_ledger_id;

  IF v_ledger_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE unemployed_users
  SET
    points = points + p_amount,
    wallet_balance = wallet_balance + p_amount,
    total_earned = total_earned + p_amount,
    updated_at = now()
  WHERE id = p_user_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION unemployed_current_user_row()
RETURNS unemployed_users
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM unemployed_users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION unemployed_provision_user(
  p_name TEXT,
  p_referral_code_input TEXT DEFAULT NULL,
  p_signup_source TEXT DEFAULT NULL,
  p_device_info JSONB DEFAULT NULL
) RETURNS unemployed_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth UUID := auth.uid();
  v_email TEXT;
  v_existing unemployed_users;
  v_referrer unemployed_users;
  v_referrer_id UUID;
  v_username TEXT;
  v_code TEXT;
  v_user unemployed_users;
BEGIN
  IF v_auth IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_existing FROM unemployed_users WHERE auth_user_id = v_auth;
  IF FOUND THEN
    RETURN v_existing;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_auth;
  v_username := lower(
    regexp_replace(
      coalesce(nullif(trim(p_name), ''), split_part(coalesce(v_email, ''), '@', 1)),
      '[^a-zA-Z0-9]',
      '',
      'g'
    )
  );
  IF length(v_username) < 3 THEN
    v_username := 'user';
  END IF;
  v_username := v_username || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4);

  v_code := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  INSERT INTO unemployed_users (auth_user_id, name, username, email, referral_code, signup_source, device_info)
  VALUES (
    v_auth,
    coalesce(nullif(trim(p_name), ''), split_part(v_email, '@', 1)),
    v_username,
    coalesce(v_email, ''),
    v_code,
    p_signup_source,
    p_device_info
  )
  RETURNING * INTO v_user;

  PERFORM unemployed_award_points(v_user.id, 'signup', 1, 'signup:' || v_user.id::text, '{}'::jsonb);

  IF p_referral_code_input IS NOT NULL AND length(trim(p_referral_code_input)) > 0 THEN
    SELECT * INTO v_referrer FROM unemployed_users WHERE referral_code = trim(p_referral_code_input) LIMIT 1;
    IF FOUND AND v_referrer.id <> v_user.id THEN
      v_referrer_id := v_referrer.id;
      UPDATE unemployed_users SET referred_by = v_referrer_id WHERE id = v_user.id;
      INSERT INTO unemployed_referrals (referrer_id, referee_id, status, completed_at)
      VALUES (v_referrer_id, v_user.id, 'completed', now())
      ON CONFLICT (referee_id) DO NOTHING;
      UPDATE unemployed_users SET total_referrals = total_referrals + 1 WHERE id = v_referrer_id;
      PERFORM unemployed_award_points(v_referrer_id, 'referral_signup', 1, 'referral:' || v_referrer_id::text || ':' || v_user.id::text, jsonb_build_object('referee_id', v_user.id));
    END IF;
  END IF;

  PERFORM unemployed_check_badges(v_user.id);
  IF v_referrer_id IS NOT NULL THEN
    PERFORM unemployed_check_badges(v_referrer_id);
  END IF;

  RETURN v_user;
END;
$$;

CREATE OR REPLACE FUNCTION unemployed_complete_mcq(p_answers JSONB)
RETURNS unemployed_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user unemployed_users;
BEGIN
  SELECT * INTO v_user FROM unemployed_users WHERE auth_user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_missing';
  END IF;

  INSERT INTO unemployed_mcq_sessions (user_id, answers_json, completed_at)
  VALUES (v_user.id, p_answers, now())
  ON CONFLICT (user_id) DO UPDATE SET answers_json = EXCLUDED.answers_json, completed_at = EXCLUDED.completed_at;

  PERFORM unemployed_award_points(v_user.id, 'survey_completion', 5, 'survey:' || v_user.id::text, p_answers);
  PERFORM unemployed_check_badges(v_user.id);

  SELECT * INTO v_user FROM unemployed_users WHERE id = v_user.id;
  RETURN v_user;
END;
$$;

CREATE OR REPLACE FUNCTION unemployed_claim_daily_activity()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user unemployed_users;
  v_today DATE := (now() AT TIME ZONE 'utc')::date;
BEGIN
  SELECT * INTO v_user FROM unemployed_users WHERE auth_user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  IF v_user.last_daily_reward_at = v_today THEN
    RETURN false;
  END IF;
  UPDATE unemployed_users SET last_daily_reward_at = v_today WHERE id = v_user.id;
  PERFORM unemployed_award_points(v_user.id, 'daily_activity', 1, 'daily:' || v_user.id::text || ':' || v_today::text, '{}'::jsonb);
  PERFORM unemployed_check_badges(v_user.id);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION unemployed_verify_profile_bonus()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user unemployed_users;
BEGIN
  SELECT * INTO v_user FROM unemployed_users WHERE auth_user_id = auth.uid();
  IF NOT FOUND OR NOT v_user.profile_verified THEN
    RETURN false;
  END IF;
  RETURN unemployed_award_points(v_user.id, 'verified_profile', 10, 'verified:' || v_user.id::text, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION unemployed_check_badges(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_refs INT;
  v_has_survey BOOLEAN;
BEGIN
  SELECT total_referrals INTO v_refs FROM unemployed_users WHERE id = p_user_id;
  SELECT EXISTS(SELECT 1 FROM unemployed_mcq_sessions WHERE user_id = p_user_id AND completed_at IS NOT NULL) INTO v_has_survey;

  IF v_has_survey THEN
    INSERT INTO unemployed_user_badges (user_id, badge_id)
    SELECT p_user_id, id FROM unemployed_badges WHERE code = 'builder'
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_refs >= 5 THEN
    INSERT INTO unemployed_user_badges (user_id, badge_id)
    SELECT p_user_id, id FROM unemployed_badges WHERE code = 'recruiter'
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_refs >= 10 THEN
    INSERT INTO unemployed_user_badges (user_id, badge_id)
    SELECT p_user_id, id FROM unemployed_badges WHERE code = 'connector'
    ON CONFLICT DO NOTHING;
  END IF;

  IF EXISTS(SELECT 1 FROM unemployed_points_ledger WHERE user_id = p_user_id AND type = 'daily_activity' LIMIT 3) THEN
    INSERT INTO unemployed_user_badges (user_id, badge_id)
    SELECT p_user_id, id FROM unemployed_badges WHERE code = 'hustler'
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- RLS
ALTER TABLE unemployed_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE unemployed_points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE unemployed_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE unemployed_mcq_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE unemployed_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE unemployed_user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE unemployed_analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY unemployed_users_select_own ON unemployed_users FOR SELECT USING (auth_user_id = auth.uid());
CREATE POLICY unemployed_users_select_public ON unemployed_users FOR SELECT USING (true);
CREATE POLICY unemployed_users_update_own ON unemployed_users FOR UPDATE USING (auth_user_id = auth.uid());

CREATE POLICY unemployed_ledger_select_own ON unemployed_points_ledger FOR SELECT
  USING (user_id IN (SELECT id FROM unemployed_users WHERE auth_user_id = auth.uid()));

CREATE POLICY unemployed_referrals_select ON unemployed_referrals FOR SELECT
  USING (
    referrer_id IN (SELECT id FROM unemployed_users WHERE auth_user_id = auth.uid())
    OR referee_id IN (SELECT id FROM unemployed_users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY unemployed_mcq_select_own ON unemployed_mcq_sessions FOR SELECT
  USING (user_id IN (SELECT id FROM unemployed_users WHERE auth_user_id = auth.uid()));

CREATE POLICY unemployed_badges_public ON unemployed_badges FOR SELECT USING (true);
CREATE POLICY unemployed_user_badges_select ON unemployed_user_badges FOR SELECT USING (true);

CREATE POLICY unemployed_events_insert ON unemployed_analytics_events FOR INSERT WITH CHECK (true);
CREATE POLICY unemployed_events_select_own ON unemployed_analytics_events FOR SELECT
  USING (user_id IN (SELECT id FROM unemployed_users WHERE auth_user_id = auth.uid()));

GRANT EXECUTE ON FUNCTION unemployed_provision_user TO authenticated;
GRANT EXECUTE ON FUNCTION unemployed_complete_mcq TO authenticated;
GRANT EXECUTE ON FUNCTION unemployed_claim_daily_activity TO authenticated;
GRANT EXECUTE ON FUNCTION unemployed_verify_profile_bonus TO authenticated;
GRANT EXECUTE ON FUNCTION unemployed_current_user_row TO authenticated;
