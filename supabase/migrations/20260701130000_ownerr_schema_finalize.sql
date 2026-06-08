-- OWNERR schema finalization: ensure all canonical tables exist, backfill, archive legacy.
-- Safe to re-run (idempotent).

BEGIN;

-- Ensure pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Helper trigger function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ---------------------------------------------------------------------------
-- 1. users (canonical identity)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  username text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  avatar_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','invited','suspended','deleted')),
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin','moderator')),
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified','pending','verified','rejected')),
  trust_score numeric NOT NULL DEFAULT 0 CHECK (trust_score >= 0),
  reputation_score numeric NOT NULL DEFAULT 0 CHECK (reputation_score >= 0),
  referral_code text NOT NULL DEFAULT '',
  referred_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  deleted_at timestamptz
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='users_username_unique' AND conrelid='public.users'::regclass) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_username_unique UNIQUE (username);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='users_referral_code_unique' AND conrelid='public.users'::regclass) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_referral_code_unique UNIQUE (referral_code);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS users_auth_user_id_idx ON public.users (auth_user_id);
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (lower(email));
CREATE INDEX IF NOT EXISTS users_username_idx ON public.users (lower(username));
CREATE INDEX IF NOT EXISTS users_referral_code_idx ON public.users (referral_code);
CREATE INDEX IF NOT EXISTS users_status_idx ON public.users (status);
CREATE INDEX IF NOT EXISTS users_created_at_idx ON public.users (created_at DESC);

DROP TRIGGER IF EXISTS users_set_updated_at ON public.users;
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. user_profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  headline text,
  bio text,
  user_type text,
  location text,
  remote_preference text,
  expected_income text,
  experience_level text,
  skill_tags text[] NOT NULL DEFAULT '{}',
  industries text[] NOT NULL DEFAULT '{}',
  social_links jsonb NOT NULL DEFAULT '{}',
  onboarding_completed boolean NOT NULL DEFAULT false,
  profile_completion_score int NOT NULL DEFAULT 0
    CHECK (profile_completion_score >= 0 AND profile_completion_score <= 100),
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','network','private')),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_profiles_user_type_idx ON public.user_profiles (user_type);
CREATE INDEX IF NOT EXISTS user_profiles_onboarding_idx ON public.user_profiles (onboarding_completed);
CREATE INDEX IF NOT EXISTS user_profiles_completion_idx ON public.user_profiles (profile_completion_score DESC);

DROP TRIGGER IF EXISTS user_profiles_set_updated_at ON public.user_profiles;
CREATE TRIGGER user_profiles_set_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. user_products
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_slug text NOT NULL CHECK (product_slug IN ('ownerr_network','marketplace','ownerr_os')),
  access_level text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','invited','suspended')),
  metadata jsonb NOT NULL DEFAULT '{}',
  UNIQUE (user_id, product_slug)
);

CREATE INDEX IF NOT EXISTS user_products_user_id_idx ON public.user_products (user_id);
CREATE INDEX IF NOT EXISTS user_products_product_slug_idx ON public.user_products (product_slug);

-- ---------------------------------------------------------------------------
-- 4–5. wallets + wallet_transactions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  balance bigint NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned bigint NOT NULL DEFAULT 0 CHECK (total_earned >= 0),
  total_spent bigint NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
  locked_balance bigint NOT NULL DEFAULT 0 CHECK (locked_balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS wallets_set_updated_at ON public.wallets;
CREATE TRIGGER wallets_set_updated_at BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  transaction_type text NOT NULL,
  amount bigint NOT NULL,
  source text,
  source_reference text,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='wallet_transactions_idempotency' AND conrelid='public.wallet_transactions'::regclass) THEN
    ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_idempotency UNIQUE (wallet_id, source_reference);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS wallet_transactions_wallet_id_idx ON public.wallet_transactions (wallet_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 6–7. referrals + referral_events
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ownerr_prevent_self_referral()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.referrer_user_id = NEW.referred_user_id THEN
    RAISE EXCEPTION 'self_referral_not_allowed';
  END IF;
  RETURN NEW;
END; $$;

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  product_slug text NOT NULL DEFAULT 'ownerr_network'
    CHECK (product_slug IN ('ownerr_network','marketplace','ownerr_os')),
  status text NOT NULL DEFAULT 'pending',
  reward_amount bigint NOT NULL DEFAULT 0,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referrals_no_self CHECK (referrer_user_id <> referred_user_id)
);

CREATE INDEX IF NOT EXISTS referrals_referrer_user_id_idx ON public.referrals (referrer_user_id, status);
CREATE INDEX IF NOT EXISTS referrals_referred_user_id_idx ON public.referrals (referred_user_id);

DROP TRIGGER IF EXISTS referrals_prevent_self ON public.referrals;
CREATE TRIGGER referrals_prevent_self BEFORE INSERT OR UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.ownerr_prevent_self_referral();

CREATE TABLE IF NOT EXISTS public.referral_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 8–9. user_scores + user_badges
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_scores (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  points bigint NOT NULL DEFAULT 0 CHECK (points >= 0),
  referrals_score bigint NOT NULL DEFAULT 0,
  completion_score bigint NOT NULL DEFAULT 0,
  verification_score bigint NOT NULL DEFAULT 0,
  activity_score bigint NOT NULL DEFAULT 0,
  network_score bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_scores_points_idx ON public.user_scores (points DESC);
CREATE INDEX IF NOT EXISTS user_scores_network_score_idx ON public.user_scores (network_score DESC);

CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  badge_slug text NOT NULL,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}',
  UNIQUE (user_id, badge_slug)
);

CREATE INDEX IF NOT EXISTS user_badges_user_id_idx ON public.user_badges (user_id);

-- ---------------------------------------------------------------------------
-- 10–12. user_events, user_onboarding_sessions, user_answers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  product_slug text CHECK (product_slug IS NULL OR product_slug IN ('ownerr_network','marketplace','ownerr_os')),
  event_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}',
  ip_hash text,
  device_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_events_user_id_idx ON public.user_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_events_product_event_idx ON public.user_events (product_slug, event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS public.user_onboarding_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_slug text NOT NULL CHECK (product_slug IN ('ownerr_network','marketplace','ownerr_os')),
  current_step text,
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress','completed','abandoned')),
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_slug)
);

DROP TRIGGER IF EXISTS user_onboarding_sessions_set_updated_at ON public.user_onboarding_sessions;
CREATE TRIGGER user_onboarding_sessions_set_updated_at BEFORE UPDATE ON public.user_onboarding_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.user_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.user_onboarding_sessions(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  answer_value jsonb NOT NULL DEFAULT 'null',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, question_key)
);

-- ---------------------------------------------------------------------------
-- 13–14. opportunities + opportunity_responses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  opportunity_type text,
  skills_needed text[] NOT NULL DEFAULT '{}',
  budget_range text,
  remote boolean,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','closed','archived')),
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','network','private')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS opportunities_set_updated_at ON public.opportunities;
CREATE TRIGGER opportunities_set_updated_at BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.opportunity_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  responder_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'submitted',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, responder_user_id)
);

-- ---------------------------------------------------------------------------
-- 15–16. listings + listing_interests
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  listing_type text NOT NULL DEFAULT 'startup',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  industry text,
  price_range text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived','sold')),
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private','unlisted')),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS listings_set_updated_at ON public.listings;
CREATE TRIGGER listings_set_updated_at BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.listing_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  interested_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'interested',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, interested_user_id)
);

-- ---------------------------------------------------------------------------
-- 17–20. conversations (add FK cols), submissions, submission_referrals
-- ---------------------------------------------------------------------------
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS buyer_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS seller_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  sector text,
  pitch text NOT NULL DEFAULT '',
  stage text,
  score numeric,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS submissions_set_updated_at ON public.submissions;
CREATE TRIGGER submissions_set_updated_at BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.submission_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  conversions int NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Backfill: users from unemployed_users (canonical source)
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_src regclass;
BEGIN
  v_src := COALESCE(
    to_regclass('public.ownerr_network_users'),
    to_regclass('public.unemployed_users')
  );
  IF v_src IS NOT NULL THEN
    EXECUTE format($q$
      INSERT INTO public.users (
        id, auth_user_id, email, username, full_name, avatar_url,
        status, role, verification_status, reputation_score,
        referral_code, referred_by, created_at, updated_at
      )
      SELECT
        nu.id, nu.auth_user_id,
        coalesce(nullif(nu.email,''),''),
        nu.username,
        coalesce(nullif(nu.name,''),''),
        nu.profile_image,
        'active', 'member',
        CASE WHEN nu.profile_verified THEN 'verified' ELSE 'unverified' END,
        coalesce(nu.points,0)::numeric,
        nu.referral_code,
        nu.referred_by,
        nu.created_at, nu.updated_at
      FROM %s nu
      ON CONFLICT (auth_user_id) DO UPDATE SET
        email = EXCLUDED.email,
        username = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
        reputation_score = GREATEST(public.users.reputation_score, EXCLUDED.reputation_score),
        referral_code = CASE WHEN length(public.users.referral_code) > 0 THEN public.users.referral_code ELSE EXCLUDED.referral_code END,
        updated_at = now()
    $q$, v_src);
  END IF;
END $$;

-- Backfill from platform_users (if still exists)
DO $$
BEGIN
  IF to_regclass('public.platform_users') IS NOT NULL THEN
    INSERT INTO public.users (auth_user_id, email, username, full_name, avatar_url, status, role, verification_status, referral_code, created_at, updated_at)
    SELECT
      pu.auth_user_id, pu.email,
      'user' || substr(replace(pu.auth_user_id::text,'-',''),1,8),
      coalesce(pu.display_name, split_part(pu.email,'@',1), 'Member'),
      pu.avatar_url, 'active', 'member', 'unverified',
      lower(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
      pu.created_at, pu.updated_at
    FROM public.platform_users pu
    WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = pu.auth_user_id)
    ON CONFLICT (auth_user_id) DO NOTHING;
  END IF;
END $$;

-- Fill in any remaining auth.users not yet in users
INSERT INTO public.users (auth_user_id, email, username, full_name, referral_code)
SELECT
  au.id,
  coalesce(au.email,''),
  'user' || substr(replace(au.id::text,'-',''),1,8),
  coalesce(au.raw_user_meta_data->>'full_name', split_part(coalesce(au.email,'user'),'@',1)),
  lower(substr(replace(gen_random_uuid()::text,'-',''),1,10))
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = au.id)
ON CONFLICT (auth_user_id) DO NOTHING;

-- Ensure unique referral codes for any blanks
UPDATE public.users
SET referral_code = lower(substr(replace(gen_random_uuid()::text,'-',''),1,10))
WHERE referral_code = '' OR referral_code IS NULL;

-- ---------------------------------------------------------------------------
-- Backfill: wallets from legacy points
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_src regclass;
BEGIN
  v_src := COALESCE(to_regclass('public.ownerr_network_users'), to_regclass('public.unemployed_users'));
  IF v_src IS NOT NULL THEN
    EXECUTE format($q$
      INSERT INTO public.wallets (user_id, balance, total_earned)
      SELECT u.id, coalesce(nu.wallet_balance,0), coalesce(nu.total_earned,0)
      FROM %s nu
      JOIN public.users u ON u.id = nu.id
      ON CONFLICT (user_id) DO UPDATE SET
        balance = GREATEST(public.wallets.balance, EXCLUDED.balance),
        total_earned = GREATEST(public.wallets.total_earned, EXCLUDED.total_earned),
        updated_at = now()
    $q$, v_src);
  END IF;
END $$;

INSERT INTO public.wallets (user_id)
SELECT u.id FROM public.users u
WHERE NOT EXISTS (SELECT 1 FROM public.wallets w WHERE w.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;

-- Backfill wallet_transactions from legacy points ledger
DO $$
DECLARE v_ledger regclass;
BEGIN
  v_ledger := COALESCE(to_regclass('public.ownerr_network_points_ledger'), to_regclass('public.unemployed_points_ledger'));
  IF v_ledger IS NOT NULL THEN
    EXECUTE format($q$
      INSERT INTO public.wallet_transactions (wallet_id, transaction_type, amount, source, source_reference, metadata, created_at)
      SELECT w.id, l.type, l.amount, 'ownerr_network', l.idempotency_key, coalesce(l.metadata,'{}'), l.created_at
      FROM %s l
      JOIN public.wallets w ON w.user_id = l.user_id
      ON CONFLICT (wallet_id, source_reference) DO NOTHING
    $q$, v_ledger);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Backfill: user_scores
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_src regclass;
BEGIN
  v_src := COALESCE(to_regclass('public.ownerr_network_users'), to_regclass('public.unemployed_users'));
  IF v_src IS NOT NULL THEN
    EXECUTE format($q$
      INSERT INTO public.user_scores (user_id, points, referrals_score, verification_score, network_score, updated_at)
      SELECT
        u.id,
        coalesce(nu.points,0),
        coalesce(nu.total_referrals,0),
        CASE WHEN nu.profile_verified THEN 10 ELSE 0 END,
        coalesce(nu.points,0),
        nu.updated_at
      FROM %s nu
      JOIN public.users u ON u.id = nu.id
      ON CONFLICT (user_id) DO UPDATE SET
        points = EXCLUDED.points,
        referrals_score = EXCLUDED.referrals_score,
        network_score = EXCLUDED.network_score,
        updated_at = now()
    $q$, v_src);
  END IF;
END $$;

INSERT INTO public.user_scores (user_id)
SELECT u.id FROM public.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_scores s WHERE s.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Backfill: user_profiles from network profiles
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.ownerr_network_profiles') IS NOT NULL THEN
    INSERT INTO public.user_profiles (
      user_id, headline, user_type, remote_preference, experience_level,
      skill_tags, onboarding_completed, profile_completion_score, visibility, metadata, created_at, updated_at
    )
    SELECT
      u.id, p.display_name, p.user_type, p.work_preference, p.experience_level,
      coalesce(p.skill_tags,'{}'),
      p.onboarding_completed_at IS NOT NULL,
      coalesce(p.profile_completion_pct,0),
      'public', p.metadata, p.created_at, p.updated_at
    FROM public.ownerr_network_profiles p
    JOIN public.users u ON u.auth_user_id = p.auth_user_id
    ON CONFLICT (user_id) DO UPDATE SET
      headline = COALESCE(EXCLUDED.headline, public.user_profiles.headline),
      user_type = COALESCE(EXCLUDED.user_type, public.user_profiles.user_type),
      onboarding_completed = EXCLUDED.onboarding_completed OR public.user_profiles.onboarding_completed,
      profile_completion_score = GREATEST(EXCLUDED.profile_completion_score, public.user_profiles.profile_completion_score),
      updated_at = now();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Backfill: user_onboarding_sessions from legacy
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_sessions regclass;
BEGIN
  v_sessions := COALESCE(
    to_regclass('public.ownerr_network_onboarding_sessions'),
    to_regclass('public.unemployed_mcq_sessions')
  );
  IF v_sessions IS NOT NULL THEN
    EXECUTE format($q$
      INSERT INTO public.user_onboarding_sessions (id, user_id, product_slug, status, completed_at, metadata, created_at, updated_at)
      SELECT
        s.id, u.id, 'ownerr_network',
        CASE WHEN s.completed_at IS NOT NULL THEN 'completed' ELSE 'in_progress' END,
        s.completed_at,
        jsonb_build_object('answers', s.answers_json),
        coalesce(s.completed_at, now()), coalesce(s.completed_at, now())
      FROM %s s
      JOIN public.users u ON u.id = s.user_id
      ON CONFLICT (user_id, product_slug) DO UPDATE SET
        status = EXCLUDED.status,
        completed_at = COALESCE(EXCLUDED.completed_at, public.user_onboarding_sessions.completed_at),
        metadata = public.user_onboarding_sessions.metadata || EXCLUDED.metadata,
        updated_at = now()
    $q$, v_sessions);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Backfill: user_badges from legacy
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_ub regclass; v_b regclass;
BEGIN
  v_ub := COALESCE(to_regclass('public.ownerr_network_user_badges'), to_regclass('public.unemployed_user_badges'));
  v_b  := COALESCE(to_regclass('public.ownerr_network_badges'), to_regclass('public.unemployed_badges'));
  IF v_ub IS NOT NULL AND v_b IS NOT NULL THEN
    EXECUTE format($q$
      INSERT INTO public.user_badges (user_id, badge_slug, awarded_at)
      SELECT u.id, b.code, ub.awarded_at
      FROM %s ub
      JOIN %s b ON b.id = ub.badge_id
      JOIN public.users u ON u.id = ub.user_id
      ON CONFLICT (user_id, badge_slug) DO NOTHING
    $q$, v_ub, v_b);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Backfill: referrals from legacy
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_ref regclass;
BEGIN
  v_ref := COALESCE(to_regclass('public.ownerr_network_referrals'), to_regclass('public.unemployed_referrals'));
  IF v_ref IS NOT NULL THEN
    EXECUTE format($q$
      INSERT INTO public.referrals (id, referrer_user_id, referred_user_id, product_slug, status, created_at)
      SELECT r.id, ur.id, ue.id, 'ownerr_network', r.status, r.created_at
      FROM %s r
      JOIN public.users ur ON ur.id = r.referrer_id
      JOIN public.users ue ON ue.id = r.referee_id
      ON CONFLICT (referred_user_id) DO NOTHING
    $q$, v_ref);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Backfill: user_products from user_app_access
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.user_app_access') IS NOT NULL THEN
    INSERT INTO public.user_products (user_id, product_slug, access_level, joined_at, status)
    SELECT
      u.id,
      CASE uaa.app_slug WHEN 'unemployed' THEN 'ownerr_network' ELSE uaa.app_slug END,
      uaa.role, uaa.created_at, uaa.status
    FROM public.user_app_access uaa
    JOIN public.users u ON u.auth_user_id = uaa.auth_user_id
    WHERE uaa.app_slug IN ('ownerr_os','marketplace','ownerr_network','unemployed')
    ON CONFLICT (user_id, product_slug) DO NOTHING;
  END IF;
END $$;

-- Ensure every user has an ownerr_network product row
INSERT INTO public.user_products (user_id, product_slug)
SELECT u.id, 'ownerr_network' FROM public.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_products up WHERE up.user_id = u.id AND up.product_slug = 'ownerr_network'
)
ON CONFLICT (user_id, product_slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Backfill: user_events from legacy analytics
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_ev regclass;
BEGIN
  v_ev := COALESCE(to_regclass('public.ownerr_network_analytics_events'), to_regclass('public.unemployed_analytics_events'));
  IF v_ev IS NOT NULL THEN
    EXECUTE format($q$
      INSERT INTO public.user_events (id, user_id, product_slug, event_type, metadata, created_at)
      SELECT e.id, u.id, 'ownerr_network', e.event_type, coalesce(e.payload,'{}'), e.created_at
      FROM %s e
      LEFT JOIN public.users u ON u.id = e.user_id
      ON CONFLICT (id) DO NOTHING
    $q$, v_ev);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Backfill: submissions from founder_submissions
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.founder_submissions') IS NOT NULL THEN
    INSERT INTO public.submissions (id, founder_user_id, title, sector, pitch, status, metadata, created_at, updated_at)
    SELECT
      fs.id, u.id, fs.startup_name, fs.category,
      coalesce(fs.description, fs.tagline, ''),
      'active',
      jsonb_build_object(
        'founder_name', fs.founder_name, 'tagline', fs.tagline,
        'website', fs.website, 'referral_code', fs.referral_code,
        'visit_count', fs.visit_count, 'referral_signup_count', fs.referral_signup_count
      ),
      fs.created_at, fs.created_at
    FROM public.founder_submissions fs
    LEFT JOIN public.users u ON u.auth_user_id = fs.auth_user_id
    ON CONFLICT (id) DO UPDATE SET
      founder_user_id = COALESCE(EXCLUDED.founder_user_id, public.submissions.founder_user_id),
      updated_at = now();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Backfill: listings from startups
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.startups') IS NOT NULL THEN
    INSERT INTO public.listings (id, owner_user_id, listing_type, title, description, industry, price_range, status, visibility, metadata, created_at, updated_at)
    SELECT
      s.id, u.id, 'startup', s.title, s.description, s.industry,
      CASE WHEN s.asking_price IS NOT NULL THEN s.asking_price::text || ' ' || coalesce(s.currency,'USD') END,
      CASE s.status WHEN 'published' THEN 'published' WHEN 'sold' THEN 'sold' WHEN 'archived' THEN 'archived' ELSE 'draft' END,
      s.visibility,
      s.metadata || jsonb_build_object('startup_slug', s.slug, 'tagline', s.tagline, 'verified', s.verified),
      s.created_at, s.updated_at
    FROM public.startups s
    JOIN public.users u ON u.auth_user_id = s.founder_user_id
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Archive legacy tables → _legacy_*
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'unemployed_analytics_events',
    'unemployed_user_badges',
    'unemployed_mcq_sessions',
    'unemployed_points_ledger',
    'unemployed_referrals',
    'unemployed_profiles',
    'unemployed_badges',
    'unemployed_users',
    'ownerr_network_analytics_events',
    'ownerr_network_user_badges',
    'ownerr_network_onboarding_sessions',
    'ownerr_network_points_ledger',
    'ownerr_network_referrals',
    'ownerr_network_profiles',
    'ownerr_network_badges',
    'ownerr_network_users',
    'ownerr_profiles',
    'platform_users'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL
       AND to_regclass('public._legacy_' || t) IS NULL
    THEN
      EXECUTE format('ALTER TABLE public.%I RENAME TO %I', t, '_legacy_' || t);
    END IF;
  END LOOP;
END $$;

-- marketplace_profiles: rename if it still exists and has no remaining FK dependents
DO $$
DECLARE v_oid oid;
BEGIN
  SELECT to_regclass('public.marketplace_profiles')::oid INTO v_oid;
  IF v_oid IS NOT NULL
     AND to_regclass('public._legacy_marketplace_profiles') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE confrelid = v_oid AND contype = 'f')
  THEN
    ALTER TABLE public.marketplace_profiles RENAME TO _legacy_marketplace_profiles;
  END IF;
END $$;

-- Marketplace desk FKs and RPCs still use public.marketplace_profiles until schema v2 (202607025100).
DO $$
BEGIN
  IF to_regclass('public.marketplace_profiles') IS NULL
     AND to_regclass('public._legacy_marketplace_profiles') IS NOT NULL THEN
    ALTER TABLE public._legacy_marketplace_profiles RENAME TO marketplace_profiles;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Compatibility views (client code uses ownerr_network_* names)
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.ownerr_network_users CASCADE;
DROP VIEW IF EXISTS public.ownerr_network_profiles CASCADE;
DROP VIEW IF EXISTS public.ownerr_network_onboarding_sessions CASCADE;
DROP VIEW IF EXISTS public.ownerr_network_analytics_events CASCADE;

CREATE VIEW public.ownerr_network_users AS
SELECT
  u.id,
  u.auth_user_id,
  u.full_name AS name,
  u.username,
  u.email,
  u.avatar_url AS profile_image,
  u.referral_code,
  u.referred_by,
  coalesce(s.points, 0) AS points,
  coalesce(w.balance, 0) AS wallet_balance,
  coalesce(w.total_earned, 0) AS total_earned,
  coalesce(s.referrals_score, 0)::int AS total_referrals,
  NULL::int AS leaderboard_rank,
  'free'::text AS subscription_status,
  (u.verification_status = 'verified') AS profile_verified,
  NULL::date AS last_daily_reward_at,
  u.created_at,
  u.updated_at
FROM public.users u
LEFT JOIN public.user_scores s ON s.user_id = u.id
LEFT JOIN public.wallets w ON w.user_id = u.id;

CREATE VIEW public.ownerr_network_profiles AS
SELECT
  p.user_id AS id,
  u.auth_user_id,
  p.headline AS display_name,
  u.username,
  p.user_type,
  p.skill_tags,
  p.remote_preference AS work_preference,
  p.experience_level,
  p.onboarding_completed,
  CASE WHEN p.onboarding_completed THEN p.updated_at END AS onboarding_completed_at,
  p.profile_completion_score AS profile_completion_pct,
  p.metadata,
  p.created_at,
  p.updated_at
FROM public.user_profiles p
JOIN public.users u ON u.id = p.user_id;

CREATE VIEW public.ownerr_network_onboarding_sessions AS
SELECT
  os.id,
  os.user_id,
  coalesce(os.metadata->'answers', os.metadata->'legacy_answers_json', '{}') AS answers_json,
  os.completed_at
FROM public.user_onboarding_sessions os
WHERE os.product_slug = 'ownerr_network';

CREATE VIEW public.ownerr_network_analytics_events AS
SELECT
  e.id,
  e.user_id,
  e.event_type,
  e.metadata AS payload,
  e.created_at
FROM public.user_events e
WHERE e.product_slug = 'ownerr_network';

-- ---------------------------------------------------------------------------
-- Grant view access
-- ---------------------------------------------------------------------------
GRANT SELECT ON public.ownerr_network_users TO authenticated, anon;
GRANT SELECT ON public.ownerr_network_profiles TO authenticated, anon;
GRANT SELECT ON public.ownerr_network_onboarding_sessions TO authenticated, anon;
GRANT INSERT ON public.user_events TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_onboarding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_all ON public.users;
CREATE POLICY users_select_all ON public.users FOR SELECT TO authenticated USING (deleted_at IS NULL);
DROP POLICY IF EXISTS users_update_own ON public.users;
CREATE POLICY users_update_own ON public.users FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS user_profiles_select ON public.user_profiles;
CREATE POLICY user_profiles_select ON public.user_profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS user_profiles_own ON public.user_profiles;
CREATE POLICY user_profiles_own ON public.user_profiles FOR ALL TO authenticated
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS user_products_select_own ON public.user_products;
CREATE POLICY user_products_select_own ON public.user_products FOR SELECT TO authenticated
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS wallets_select_own ON public.wallets;
CREATE POLICY wallets_select_own ON public.wallets FOR SELECT TO authenticated
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS user_scores_select_public ON public.user_scores;
CREATE POLICY user_scores_select_public ON public.user_scores FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS user_badges_select_public ON public.user_badges;
CREATE POLICY user_badges_select_public ON public.user_badges FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS user_events_insert ON public.user_events;
CREATE POLICY user_events_insert ON public.user_events FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS listings_select_public ON public.listings;
CREATE POLICY listings_select_public ON public.listings FOR SELECT TO authenticated
  USING (visibility = 'public' AND status = 'published');

DROP POLICY IF EXISTS submissions_select_public ON public.submissions;
CREATE POLICY submissions_select_public ON public.submissions FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- Core RPCs on canonical schema
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'ownerr_network_current_user_row',
        'ownerr_network_provision_user',
        'ownerr_network_complete_onboarding',
        'ownerr_network_complete_mcq',
        'ownerr_network_claim_daily_activity',
        'ownerr_network_verify_profile_bonus',
        'ownerr_network_award_points',
        'ownerr_network_check_badges',
        'ownerr_award_points'
      )
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig::text || ' CASCADE';
  END LOOP;
END $$;

CREATE FUNCTION public.ownerr_award_points(
  p_user_id uuid, p_type text, p_amount bigint,
  p_idempotency_key text, p_metadata jsonb DEFAULT '{}'
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_wallet_id uuid;
BEGIN
  IF p_amount <= 0 THEN RETURN false; END IF;
  INSERT INTO public.wallet_transactions (wallet_id, transaction_type, amount, source, source_reference, metadata)
  SELECT w.id, p_type, p_amount, 'ownerr_network', p_idempotency_key, p_metadata
  FROM public.wallets w WHERE w.user_id = p_user_id
  ON CONFLICT (wallet_id, source_reference) DO NOTHING
  RETURNING wallet_id INTO v_wallet_id;
  IF v_wallet_id IS NULL THEN RETURN false; END IF;
  UPDATE public.wallets SET balance=balance+p_amount, total_earned=total_earned+p_amount, updated_at=now()
  WHERE user_id=p_user_id;
  INSERT INTO public.user_scores (user_id, points, network_score, updated_at)
  VALUES (p_user_id, p_amount, p_amount, now())
  ON CONFLICT (user_id) DO UPDATE SET
    points=public.user_scores.points+p_amount,
    network_score=public.user_scores.network_score+p_amount,
    updated_at=now();
  RETURN true;
END; $$;

CREATE FUNCTION public.ownerr_network_current_user_row()
RETURNS SETOF public.users
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.users WHERE auth_user_id = auth.uid() AND deleted_at IS NULL LIMIT 1;
$$;

CREATE FUNCTION public.ownerr_network_provision_user(
  p_name text, p_referral_code_input text DEFAULT NULL,
  p_signup_source text DEFAULT NULL, p_device_info jsonb DEFAULT NULL
) RETURNS public.users
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_auth uuid := auth.uid();
  v_email text; v_existing public.users; v_referrer public.users;
  v_referrer_id uuid; v_username text; v_code text; v_user public.users;
BEGIN
  IF v_auth IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_existing FROM public.users WHERE auth_user_id = v_auth;
  IF FOUND THEN RETURN v_existing; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_auth;
  v_username := lower(regexp_replace(coalesce(nullif(trim(p_name),''), split_part(coalesce(v_email,''),'@',1)), '[^a-zA-Z0-9]','','g'));
  IF length(v_username) < 3 THEN v_username := 'user'; END IF;
  v_username := v_username || substr(replace(gen_random_uuid()::text,'-',''),1,4);
  v_code := lower(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  INSERT INTO public.users (auth_user_id, email, username, full_name, referral_code, status, role)
  VALUES (v_auth, coalesce(v_email,''), v_username, coalesce(nullif(trim(p_name),''), split_part(coalesce(v_email,'user'),'@',1)), v_code, 'active','member')
  RETURNING * INTO v_user;
  INSERT INTO public.wallets (user_id) VALUES (v_user.id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_scores (user_id) VALUES (v_user.id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_products (user_id, product_slug, metadata)
  VALUES (v_user.id, 'ownerr_network', jsonb_build_object('signup_source', p_signup_source))
  ON CONFLICT (user_id, product_slug) DO NOTHING;
  PERFORM public.ownerr_award_points(v_user.id, 'signup', 1, 'signup:'||v_user.id::text, '{}');
  IF p_referral_code_input IS NOT NULL AND length(trim(p_referral_code_input)) > 0 THEN
    SELECT * INTO v_referrer FROM public.users WHERE referral_code = trim(p_referral_code_input) LIMIT 1;
    IF FOUND AND v_referrer.id <> v_user.id THEN
      v_referrer_id := v_referrer.id;
      UPDATE public.users SET referred_by = v_referrer_id WHERE id = v_user.id;
      INSERT INTO public.referrals (referrer_user_id, referred_user_id, product_slug, status, source)
      VALUES (v_referrer_id, v_user.id, 'ownerr_network', 'completed', coalesce(p_signup_source,'provision'))
      ON CONFLICT (referred_user_id) DO NOTHING;
      PERFORM public.ownerr_award_points(v_referrer_id, 'referral', 1, 'referral:'||v_referrer_id::text||':'||v_user.id::text, jsonb_build_object('referred_user_id', v_user.id));
      UPDATE public.user_scores SET referrals_score=referrals_score+1, updated_at=now() WHERE user_id=v_referrer_id;
    END IF;
  END IF;
  PERFORM public.ownerr_network_check_badges(v_user.id);
  RETURN v_user;
END; $$;

CREATE FUNCTION public.ownerr_network_complete_onboarding(
  p_name text, p_username text, p_answers jsonb
) RETURNS public.users
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user public.users; v_session_id uuid;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE auth_user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'profile_missing'; END IF;
  IF nullif(trim(p_name),'') IS NOT NULL THEN
    UPDATE public.users SET full_name=trim(p_name), updated_at=now() WHERE id=v_user.id;
  END IF;
  IF nullif(trim(p_username),'') IS NOT NULL THEN
    UPDATE public.users SET username=lower(trim(p_username)), updated_at=now() WHERE id=v_user.id;
  END IF;
  INSERT INTO public.user_onboarding_sessions (user_id, product_slug, status, completed_at, metadata)
  VALUES (v_user.id, 'ownerr_network', 'completed', now(), jsonb_build_object('answers', p_answers))
  ON CONFLICT (user_id, product_slug) DO UPDATE SET
    status='completed', completed_at=now(),
    metadata=EXCLUDED.metadata, updated_at=now()
  RETURNING id INTO v_session_id;
  INSERT INTO public.user_answers (session_id, question_key, answer_value)
  SELECT v_session_id, kv.key, kv.value FROM jsonb_each(coalesce(p_answers,'{}')) kv
  ON CONFLICT (session_id, question_key) DO UPDATE SET answer_value=EXCLUDED.answer_value;
  INSERT INTO public.user_profiles (user_id) VALUES (v_user.id) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.user_profiles SET
    headline = coalesce(nullif(trim(p_name),''), headline, v_user.full_name),
    user_type = coalesce(p_answers->>'describes_you', user_type),
    skill_tags = CASE WHEN p_answers ? 'skills' AND jsonb_typeof(p_answers->'skills')='array'
      THEN ARRAY(SELECT jsonb_array_elements_text(p_answers->'skills')) ELSE skill_tags END,
    remote_preference = coalesce(p_answers->>'remote', remote_preference),
    experience_level = coalesce(p_answers->>'experience', experience_level),
    onboarding_completed = true,
    profile_completion_score = 100,
    metadata = metadata || jsonb_build_object('onboarding_answers', p_answers),
    updated_at = now()
  WHERE user_id = v_user.id;
  PERFORM public.ownerr_award_points(v_user.id, 'profile_completed', 5, 'profile:'||v_user.id::text, p_answers);
  PERFORM public.ownerr_network_check_badges(v_user.id);
  SELECT * INTO v_user FROM public.users WHERE id = v_user.id;
  RETURN v_user;
END; $$;

CREATE FUNCTION public.ownerr_network_complete_mcq(p_answers jsonb)
RETURNS public.users
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN public.ownerr_network_complete_onboarding(
    coalesce(p_answers->>'name',''),
    coalesce(p_answers->>'username',''),
    p_answers
  );
END; $$;

CREATE FUNCTION public.ownerr_network_check_badges(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_refs bigint;
BEGIN
  SELECT referrals_score INTO v_refs FROM public.user_scores WHERE user_id=p_user_id;
  IF EXISTS (SELECT 1 FROM public.user_onboarding_sessions
             WHERE user_id=p_user_id AND product_slug='ownerr_network' AND status='completed') THEN
    INSERT INTO public.user_badges (user_id, badge_slug) VALUES (p_user_id,'builder') ON CONFLICT DO NOTHING;
  END IF;
  IF coalesce(v_refs,0) >= 5 THEN
    INSERT INTO public.user_badges (user_id, badge_slug) VALUES (p_user_id,'recruiter') ON CONFLICT DO NOTHING;
  END IF;
  IF coalesce(v_refs,0) >= 10 THEN
    INSERT INTO public.user_badges (user_id, badge_slug) VALUES (p_user_id,'connector') ON CONFLICT DO NOTHING;
  END IF;
  IF EXISTS (SELECT 1 FROM public.wallet_transactions wt JOIN public.wallets w ON w.id=wt.wallet_id
             WHERE w.user_id=p_user_id AND wt.transaction_type='daily_activity' LIMIT 3) THEN
    INSERT INTO public.user_badges (user_id, badge_slug) VALUES (p_user_id,'hustler') ON CONFLICT DO NOTHING;
  END IF;
END; $$;

CREATE FUNCTION public.ownerr_network_claim_daily_activity()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user public.users; v_today date := (now() AT TIME ZONE 'utc')::date;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE auth_user_id=auth.uid();
  IF NOT FOUND THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.wallet_transactions wt JOIN public.wallets w ON w.id=wt.wallet_id
             WHERE w.user_id=v_user.id AND wt.source_reference='daily:'||v_user.id::text||':'||v_today::text) THEN
    RETURN false;
  END IF;
  PERFORM public.ownerr_award_points(v_user.id,'daily_activity',1,'daily:'||v_user.id::text||':'||v_today::text,'{}');
  PERFORM public.ownerr_network_check_badges(v_user.id);
  RETURN true;
END; $$;

GRANT EXECUTE ON FUNCTION public.ownerr_award_points TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ownerr_network_current_user_row TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ownerr_network_provision_user TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ownerr_network_complete_onboarding TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ownerr_network_complete_mcq TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ownerr_network_check_badges TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ownerr_network_claim_daily_activity TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
