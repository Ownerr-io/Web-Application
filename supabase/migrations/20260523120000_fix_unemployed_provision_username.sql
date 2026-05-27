-- Fix parenthesis bug in unemployed_provision_user username generation
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
  v_base TEXT;
BEGIN
  IF v_auth IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_existing FROM unemployed_users WHERE auth_user_id = v_auth;
  IF FOUND THEN
    RETURN v_existing;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_auth;
  v_base := coalesce(nullif(trim(p_name), ''), split_part(coalesce(v_email, ''), '@', 1));
  v_username := lower(regexp_replace(v_base, '[^a-zA-Z0-9]', '', 'g'));
  IF length(v_username) < 3 THEN
    v_username := 'user';
  END IF;
  v_username := v_username || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4);

  v_code := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  INSERT INTO unemployed_users (auth_user_id, name, username, email, referral_code, signup_source, device_info)
  VALUES (
    v_auth,
    coalesce(nullif(trim(p_name), ''), split_part(coalesce(v_email, ''), '@', 1)),
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
