-- OWNERR enterprise master schema (full modernization)
-- Consolidates platform_users, ownerr_network_*, marketplace_*, founder_*, unemployed_* legacy.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ownerr_prevent_self_referral()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.referrer_user_id = NEW.referred_user_id THEN
    RAISE EXCEPTION 'self_referral_not_allowed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ownerr_resolve_network_users_regclass()
RETURNS regclass
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    to_regclass('public.ownerr_network_users'),
    to_regclass('public.unemployed_users')
  );
$$;

-- Resolve conflicts from orphan remote migration (e.g. 20260611120000) or partial apply
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL
     AND to_regclass('public._legacy_pre_enterprise_users') IS NULL
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'auth_user_id'
     ) THEN
    ALTER TABLE public.users RENAME TO _legacy_pre_enterprise_users;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Master: users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  username text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  avatar_url text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'invited', 'suspended', 'deleted')),
  role text NOT NULL DEFAULT 'member'
    CHECK (role IN ('member', 'admin', 'moderator')),
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  trust_score numeric NOT NULL DEFAULT 0 CHECK (trust_score >= 0),
  reputation_score numeric NOT NULL DEFAULT 0 CHECK (reputation_score >= 0),
  referral_code text NOT NULL,
  referred_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  deleted_at timestamptz,
  CONSTRAINT users_username_unique UNIQUE (username),
  CONSTRAINT users_referral_code_unique UNIQUE (referral_code)
);

CREATE INDEX IF NOT EXISTS users_auth_user_id_idx ON public.users (auth_user_id);
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (lower(email));
CREATE INDEX IF NOT EXISTS users_username_idx ON public.users (lower(username));
CREATE INDEX IF NOT EXISTS users_referral_code_idx ON public.users (referral_code);
CREATE INDEX IF NOT EXISTS users_status_idx ON public.users (status);
CREATE INDEX IF NOT EXISTS users_verification_status_idx ON public.users (verification_status);
CREATE INDEX IF NOT EXISTS users_created_at_idx ON public.users (created_at DESC);
CREATE INDEX IF NOT EXISTS users_referred_by_idx ON public.users (referred_by);

DROP TRIGGER IF EXISTS users_set_updated_at ON public.users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. user_profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  headline text,
  bio text,
  user_type text,
  location text,
  remote_preference text,
  expected_income text,
  experience_level text,
  skill_tags text[] NOT NULL DEFAULT '{}',
  industries text[] NOT NULL DEFAULT '{}',
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  onboarding_completed boolean NOT NULL DEFAULT false,
  profile_completion_score int NOT NULL DEFAULT 0
    CHECK (profile_completion_score >= 0 AND profile_completion_score <= 100),
  visibility text NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'network', 'private')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_profiles_user_type_idx ON public.user_profiles (user_type);
CREATE INDEX IF NOT EXISTS user_profiles_visibility_idx ON public.user_profiles (visibility);
CREATE INDEX IF NOT EXISTS user_profiles_onboarding_idx ON public.user_profiles (onboarding_completed);
CREATE INDEX IF NOT EXISTS user_profiles_completion_idx ON public.user_profiles (profile_completion_score DESC);
CREATE INDEX IF NOT EXISTS user_profiles_discover_idx
  ON public.user_profiles (onboarding_completed, profile_completion_score DESC)
  WHERE onboarding_completed = true;

DROP TRIGGER IF EXISTS user_profiles_set_updated_at ON public.user_profiles;
CREATE TRIGGER user_profiles_set_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. user_products
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  product_slug text NOT NULL
    CHECK (product_slug IN ('ownerr_network', 'marketplace', 'ownerr_os')),
  access_level text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'invited', 'suspended')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, product_slug)
);

CREATE INDEX IF NOT EXISTS user_products_user_id_idx ON public.user_products (user_id);
CREATE INDEX IF NOT EXISTS user_products_product_slug_idx ON public.user_products (product_slug);
CREATE INDEX IF NOT EXISTS user_products_status_idx ON public.user_products (status);

-- ---------------------------------------------------------------------------
-- 4–5. wallets + wallet_transactions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users (id) ON DELETE CASCADE,
  balance bigint NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned bigint NOT NULL DEFAULT 0 CHECK (total_earned >= 0),
  total_spent bigint NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
  locked_balance bigint NOT NULL DEFAULT 0 CHECK (locked_balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wallets_user_id_idx ON public.wallets (user_id);

DROP TRIGGER IF EXISTS wallets_set_updated_at ON public.wallets;
CREATE TRIGGER wallets_set_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Pre-existing wallets (partial/legacy schema) may omit aggregate columns.
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS balance bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_earned bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_spent bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_balance bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.wallets
SET
  balance = COALESCE(balance, 0),
  total_earned = COALESCE(total_earned, 0),
  total_spent = COALESCE(total_spent, 0),
  locked_balance = COALESCE(locked_balance, 0)
WHERE balance IS NULL
   OR total_earned IS NULL
   OR total_spent IS NULL
   OR locked_balance IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'wallets_user_id_key' AND conrelid = 'public.wallets'::regclass
  ) THEN
    ALTER TABLE public.wallets ADD CONSTRAINT wallets_user_id_key UNIQUE (user_id);
  END IF;
EXCEPTION
  WHEN unique_violation THEN
    NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets (id) ON DELETE CASCADE,
  transaction_type text NOT NULL,
  amount bigint NOT NULL,
  source text,
  source_reference text,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wallet_transactions_idempotency UNIQUE (wallet_id, source_reference)
);

-- Pre-existing wallet_transactions (partial/legacy schema) may omit enterprise columns.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'wallet_transactions' AND column_name = 'type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'wallet_transactions' AND column_name = 'transaction_type'
  ) THEN
    ALTER TABLE public.wallet_transactions RENAME COLUMN type TO transaction_type;
  END IF;
END $$;

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS wallet_id uuid REFERENCES public.wallets (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS transaction_type text,
  ADD COLUMN IF NOT EXISTS amount bigint,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_reference text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

UPDATE public.wallet_transactions
SET transaction_type = COALESCE(transaction_type, 'legacy')
WHERE transaction_type IS NULL;

CREATE INDEX IF NOT EXISTS wallet_transactions_wallet_id_idx ON public.wallet_transactions (wallet_id, created_at DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'wallet_transactions' AND column_name = 'transaction_type'
  ) THEN
    CREATE INDEX IF NOT EXISTS wallet_transactions_type_idx ON public.wallet_transactions (transaction_type);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'wallet_transactions_idempotency'
      AND conrelid = 'public.wallet_transactions'::regclass
  ) THEN
    UPDATE public.wallet_transactions
    SET source_reference = 'legacy:' || id::text
    WHERE source_reference IS NULL;

    BEGIN
      ALTER TABLE public.wallet_transactions
        ADD CONSTRAINT wallet_transactions_idempotency UNIQUE (wallet_id, source_reference);
    EXCEPTION
      WHEN unique_violation THEN
        RAISE NOTICE 'wallet_transactions_idempotency not added: duplicate (wallet_id, source_reference) in legacy rows';
    END;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6–7. referrals + referral_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL UNIQUE REFERENCES public.users (id) ON DELETE CASCADE,
  product_slug text NOT NULL DEFAULT 'ownerr_network'
    CHECK (product_slug IN ('ownerr_network', 'marketplace', 'ownerr_os')),
  status text NOT NULL DEFAULT 'pending',
  reward_amount bigint NOT NULL DEFAULT 0,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referrals_no_self CHECK (referrer_user_id <> referred_user_id)
);

CREATE INDEX IF NOT EXISTS referrals_referrer_user_id_idx ON public.referrals (referrer_user_id, status);
CREATE INDEX IF NOT EXISTS referrals_referred_user_id_idx ON public.referrals (referred_user_id);
CREATE INDEX IF NOT EXISTS referrals_product_slug_idx ON public.referrals (product_slug);
CREATE INDEX IF NOT EXISTS referrals_created_at_idx ON public.referrals (created_at DESC);

DROP TRIGGER IF EXISTS referrals_prevent_self ON public.referrals;
CREATE TRIGGER referrals_prevent_self
  BEFORE INSERT OR UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.ownerr_prevent_self_referral();

CREATE TABLE IF NOT EXISTS public.referral_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.referrals (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referral_events_referral_id_idx ON public.referral_events (referral_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 8–9. user_scores + user_badges
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_scores (
  user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS user_scores_leaderboard_idx ON public.user_scores (points DESC, network_score DESC);

CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  badge_slug text NOT NULL,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, badge_slug)
);

CREATE INDEX IF NOT EXISTS user_badges_user_id_idx ON public.user_badges (user_id);

-- ---------------------------------------------------------------------------
-- 10–12. user_events, user_onboarding_sessions, user_answers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  product_slug text
    CHECK (product_slug IS NULL OR product_slug IN ('ownerr_network', 'marketplace', 'ownerr_os')),
  event_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_hash text,
  device_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_events_user_id_idx ON public.user_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_events_product_event_idx ON public.user_events (product_slug, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS user_events_created_at_idx ON public.user_events (created_at DESC);

CREATE TABLE IF NOT EXISTS public.user_onboarding_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  product_slug text NOT NULL
    CHECK (product_slug IN ('ownerr_network', 'marketplace', 'ownerr_os')),
  current_step text,
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_slug)
);

CREATE INDEX IF NOT EXISTS user_onboarding_sessions_user_id_idx ON public.user_onboarding_sessions (user_id);
CREATE INDEX IF NOT EXISTS user_onboarding_sessions_product_idx ON public.user_onboarding_sessions (product_slug);

DROP TRIGGER IF EXISTS user_onboarding_sessions_set_updated_at ON public.user_onboarding_sessions;
CREATE TRIGGER user_onboarding_sessions_set_updated_at
  BEFORE UPDATE ON public.user_onboarding_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.user_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.user_onboarding_sessions (id) ON DELETE CASCADE,
  question_key text NOT NULL,
  answer_value jsonb NOT NULL DEFAULT 'null'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, question_key)
);

CREATE INDEX IF NOT EXISTS user_answers_session_id_idx ON public.user_answers (session_id);

-- ---------------------------------------------------------------------------
-- 13–14. opportunities + opportunity_responses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  opportunity_type text,
  skills_needed text[] NOT NULL DEFAULT '{}',
  budget_range text,
  remote boolean,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'closed', 'archived')),
  visibility text NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'network', 'private')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS opportunities_creator_user_id_idx ON public.opportunities (creator_user_id);
CREATE INDEX IF NOT EXISTS opportunities_status_idx ON public.opportunities (status);
CREATE INDEX IF NOT EXISTS opportunities_visibility_idx ON public.opportunities (visibility);
CREATE INDEX IF NOT EXISTS opportunities_created_at_idx ON public.opportunities (created_at DESC);

DROP TRIGGER IF EXISTS opportunities_set_updated_at ON public.opportunities;
CREATE TRIGGER opportunities_set_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.opportunity_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities (id) ON DELETE CASCADE,
  responder_user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'submitted',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, responder_user_id)
);

CREATE INDEX IF NOT EXISTS opportunity_responses_opportunity_id_idx ON public.opportunity_responses (opportunity_id);
CREATE INDEX IF NOT EXISTS opportunity_responses_responder_user_id_idx ON public.opportunity_responses (responder_user_id);

-- ---------------------------------------------------------------------------
-- 15–16. listings + listing_interests
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  listing_type text NOT NULL DEFAULT 'startup',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  industry text,
  price_range text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived', 'sold')),
  visibility text NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'private', 'unlisted')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listings_owner_user_id_idx ON public.listings (owner_user_id);
CREATE INDEX IF NOT EXISTS listings_status_idx ON public.listings (status);
CREATE INDEX IF NOT EXISTS listings_visibility_idx ON public.listings (visibility);
CREATE INDEX IF NOT EXISTS listings_industry_idx ON public.listings (industry);
CREATE INDEX IF NOT EXISTS listings_created_at_idx ON public.listings (created_at DESC);
CREATE INDEX IF NOT EXISTS listings_search_idx ON public.listings (status, visibility, industry, created_at DESC);

DROP TRIGGER IF EXISTS listings_set_updated_at ON public.listings;
CREATE TRIGGER listings_set_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.listing_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  interested_user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'interested',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, interested_user_id)
);

CREATE INDEX IF NOT EXISTS listing_interests_listing_id_idx ON public.listing_interests (listing_id);
CREATE INDEX IF NOT EXISTS listing_interests_interested_user_id_idx ON public.listing_interests (interested_user_id);

-- ---------------------------------------------------------------------------
-- 17–18. conversations + messages (normalize FKs to users)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.conversations') IS NOT NULL THEN
    ALTER TABLE public.conversations
      ADD COLUMN IF NOT EXISTS buyer_user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS seller_user_id uuid REFERENCES public.users (id) ON DELETE SET NULL;
  ELSE
    CREATE TABLE public.conversations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      startup_id uuid,
      buyer_user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
      seller_user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
      status text NOT NULL DEFAULT 'open',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS conversations_buyer_user_id_idx ON public.conversations (buyer_user_id);
CREATE INDEX IF NOT EXISTS conversations_seller_user_id_idx ON public.conversations (seller_user_id);

DO $$
BEGIN
  IF to_regclass('public.messages') IS NULL THEN
    CREATE TABLE public.messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id uuid NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
      sender_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
      body text NOT NULL DEFAULT '',
      read_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON public.messages (conversation_id);
CREATE INDEX IF NOT EXISTS messages_sender_user_id_idx ON public.messages (sender_user_id);

-- ---------------------------------------------------------------------------
-- 19–20. submissions + submission_referrals
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  title text NOT NULL,
  sector text,
  pitch text NOT NULL DEFAULT '',
  stage text,
  score numeric,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS submissions_founder_user_id_idx ON public.submissions (founder_user_id);
CREATE INDEX IF NOT EXISTS submissions_status_idx ON public.submissions (status);
CREATE INDEX IF NOT EXISTS submissions_created_at_idx ON public.submissions (created_at DESC);

DROP TRIGGER IF EXISTS submissions_set_updated_at ON public.submissions;
CREATE TRIGGER submissions_set_updated_at
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.submission_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions (id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  conversions int NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS submission_referrals_submission_id_idx ON public.submission_referrals (submission_id);
CREATE INDEX IF NOT EXISTS submission_referrals_user_id_idx ON public.submission_referrals (user_id);

-- ---------------------------------------------------------------------------
-- Migration map (legacy network user id → canonical users.id)
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE ownerr_user_id_map (
  legacy_id uuid PRIMARY KEY,
  canonical_id uuid NOT NULL,
  auth_user_id uuid NOT NULL
) ON COMMIT DROP;

-- ---------------------------------------------------------------------------
-- Backfill: users (network users primary)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_src regclass := public.ownerr_resolve_network_users_regclass();
  v_sql text;
BEGIN
  IF v_src IS NULL THEN
  ELSE
    v_sql := format($q$
      INSERT INTO public.users (
        id, auth_user_id, email, username, full_name, avatar_url, status, role,
        verification_status, trust_score, reputation_score, referral_code, referred_by,
        created_at, updated_at, last_login_at, deleted_at
      )
      SELECT
        nu.id,
        nu.auth_user_id,
        coalesce(nullif(nu.email, ''), ''),
        nu.username,
        coalesce(nullif(nu.name, ''), ''),
        nu.profile_image,
        'active',
        'member',
        CASE WHEN nu.profile_verified THEN 'verified' ELSE 'unverified' END,
        0,
        coalesce(nu.points, 0)::numeric,
        nu.referral_code,
        nu.referred_by,
        nu.created_at,
        nu.updated_at,
        NULL,
        NULL
      FROM %s nu
      ON CONFLICT (auth_user_id) DO UPDATE SET
        email = EXCLUDED.email,
        username = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
        verification_status = EXCLUDED.verification_status,
        reputation_score = GREATEST(public.users.reputation_score, EXCLUDED.reputation_score),
        referral_code = EXCLUDED.referral_code,
        referred_by = COALESCE(EXCLUDED.referred_by, public.users.referred_by),
        updated_at = now()
    $q$, v_src);
    EXECUTE v_sql;

    v_sql := format($q$
      INSERT INTO ownerr_user_id_map (legacy_id, canonical_id, auth_user_id)
      SELECT nu.id, u.id, nu.auth_user_id
      FROM %s nu
      JOIN public.users u ON u.auth_user_id = nu.auth_user_id
    $q$, v_src);
    EXECUTE v_sql;
  END IF;
END $$;

-- platform_users → users (skip if table doesn't exist on this DB)
DO $$
BEGIN
  IF to_regclass('public.platform_users') IS NOT NULL THEN
    INSERT INTO public.users (
      auth_user_id, email, username, full_name, avatar_url, status, role,
      verification_status, referral_code, created_at, updated_at
    )
    SELECT
      pu.auth_user_id,
      pu.email,
      lower(regexp_replace(coalesce(nullif(pu.display_name, ''), split_part(pu.email, '@', 1)), '[^a-zA-Z0-9]', '', 'g'))
        || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4),
      coalesce(pu.display_name, split_part(pu.email, '@', 1), 'Member'),
      pu.avatar_url,
      'active', 'member', 'unverified',
      lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
      pu.created_at,
      pu.updated_at
    FROM public.platform_users pu
    WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = pu.auth_user_id)
    ON CONFLICT (auth_user_id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.users.full_name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
      updated_at = now();
  END IF;
END $$;

-- auth.users without any row yet
INSERT INTO public.users (auth_user_id, email, username, full_name, referral_code)
SELECT
  au.id,
  coalesce(au.email, ''),
  'user' || substr(replace(au.id::text, '-', ''), 1, 8),
  coalesce(au.raw_user_meta_data->>'full_name', split_part(coalesce(au.email, 'user'), '@', 1)),
  lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = au.id)
ON CONFLICT (auth_user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Backfill: user_profiles
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.ownerr_network_profiles') IS NOT NULL THEN
    INSERT INTO public.user_profiles (
      user_id, headline, bio, user_type, remote_preference, experience_level, skill_tags,
      onboarding_completed, profile_completion_score, visibility, metadata, created_at, updated_at
    )
    SELECT
      u.id,
      p.display_name,
      p.goals,
      p.user_type,
      p.work_preference,
      p.experience_level,
      coalesce(p.skill_tags, '{}'),
      p.onboarding_completed_at IS NOT NULL,
      coalesce(p.profile_completion_pct, 0),
      'public',
      p.metadata || jsonb_build_object(
        'legacy_ownerr_network_profile_id', p.id::text,
        'availability', p.availability,
        'seriousness_score', p.seriousness_score
      ),
      p.created_at,
      p.updated_at
    FROM public.ownerr_network_profiles p
    JOIN public.users u ON u.auth_user_id = p.auth_user_id
    ON CONFLICT (user_id) DO UPDATE SET
      headline = COALESCE(EXCLUDED.headline, public.user_profiles.headline),
      user_type = COALESCE(EXCLUDED.user_type, public.user_profiles.user_type),
      skill_tags = CASE WHEN cardinality(EXCLUDED.skill_tags) > 0 THEN EXCLUDED.skill_tags ELSE public.user_profiles.skill_tags END,
      onboarding_completed = EXCLUDED.onboarding_completed OR public.user_profiles.onboarding_completed,
      profile_completion_score = GREATEST(EXCLUDED.profile_completion_score, public.user_profiles.profile_completion_score),
      metadata = public.user_profiles.metadata || EXCLUDED.metadata,
      updated_at = now();
  END IF;

  IF to_regclass('public.marketplace_profiles') IS NOT NULL THEN
    INSERT INTO public.user_profiles (user_id, metadata, created_at, updated_at)
    SELECT
      u.id,
      mp.metadata || jsonb_build_object(
        'marketplace_profile_id', mp.id::text,
        'desk_role', mp.desk_role,
        'marketplace_status', mp.status
      ),
      mp.created_at,
      mp.updated_at
    FROM public.marketplace_profiles mp
    JOIN public.users u ON u.auth_user_id = mp.auth_user_id
    ON CONFLICT (user_id) DO UPDATE SET
      metadata = public.user_profiles.metadata || EXCLUDED.metadata,
      updated_at = now();
  END IF;

  IF to_regclass('public.ownerr_profiles') IS NOT NULL THEN
    INSERT INTO public.user_profiles (user_id, metadata, created_at, updated_at)
    SELECT u.id, op.metadata, op.created_at, op.updated_at
    FROM public.ownerr_profiles op
    JOIN public.users u ON u.auth_user_id = op.auth_user_id
    ON CONFLICT (user_id) DO UPDATE SET
      metadata = public.user_profiles.metadata || EXCLUDED.metadata,
      updated_at = now();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Backfill: user_products (from user_app_access)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.user_app_access') IS NOT NULL THEN
    INSERT INTO public.user_products (user_id, product_slug, access_level, joined_at, status, metadata)
    SELECT
      u.id,
      CASE uaa.app_slug WHEN 'unemployed' THEN 'ownerr_network' ELSE uaa.app_slug END,
      uaa.role,
      uaa.created_at,
      uaa.status,
      uaa.metadata || jsonb_build_object('legacy_user_app_access_id', uaa.id::text)
    FROM public.user_app_access uaa
    JOIN public.users u ON u.auth_user_id = uaa.auth_user_id
    WHERE uaa.app_slug IN ('ownerr_os', 'marketplace', 'ownerr_network', 'unemployed')
    ON CONFLICT (user_id, product_slug) DO UPDATE SET
      access_level = EXCLUDED.access_level,
      status = EXCLUDED.status,
      metadata = public.user_products.metadata || EXCLUDED.metadata;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Backfill: wallets + wallet_transactions
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_src regclass := public.ownerr_resolve_network_users_regclass();
BEGIN
  IF v_src IS NOT NULL THEN
    EXECUTE format($q$
      INSERT INTO public.wallets (user_id, balance, total_earned, total_spent, locked_balance, created_at, updated_at)
      SELECT u.id, nu.wallet_balance, nu.total_earned, 0, 0, nu.created_at, nu.updated_at
      FROM %s nu
      JOIN public.users u ON u.id = nu.id
      ON CONFLICT (user_id) DO UPDATE SET
        balance = EXCLUDED.balance,
        total_earned = GREATEST(public.wallets.total_earned, EXCLUDED.total_earned),
        updated_at = now()
    $q$, v_src);
  END IF;
END $$;

INSERT INTO public.wallets (user_id)
SELECT u.id FROM public.users u
WHERE NOT EXISTS (SELECT 1 FROM public.wallets w WHERE w.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;

DO $$
BEGIN
  IF to_regclass('public.ownerr_network_points_ledger') IS NOT NULL THEN
    INSERT INTO public.wallet_transactions (
      wallet_id, transaction_type, amount, source, source_reference, metadata, created_at
    )
    SELECT
      w.id,
      l.type,
      l.amount,
      'ownerr_network',
      l.idempotency_key,
      coalesce(l.metadata, '{}'::jsonb),
      l.created_at
    FROM public.ownerr_network_points_ledger l
    JOIN public.wallets w ON w.user_id = l.user_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.wallet_transactions wt
      WHERE wt.wallet_id = w.id
        AND wt.source_reference IS NOT DISTINCT FROM l.idempotency_key
    );
  ELSIF to_regclass('public.unemployed_points_ledger') IS NOT NULL THEN
    INSERT INTO public.wallet_transactions (
      wallet_id, transaction_type, amount, source, source_reference, metadata, created_at
    )
    SELECT w.id, l.type, l.amount, 'ownerr_network', l.idempotency_key, coalesce(l.metadata, '{}'::jsonb), l.created_at
    FROM public.unemployed_points_ledger l
    JOIN public.wallets w ON w.user_id = l.user_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.wallet_transactions wt
      WHERE wt.wallet_id = w.id
        AND wt.source_reference IS NOT DISTINCT FROM l.idempotency_key
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Backfill: referrals
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.ownerr_network_referrals') IS NOT NULL THEN
    INSERT INTO public.referrals (
      id, referrer_user_id, referred_user_id, product_slug, status, reward_amount, source, created_at
    )
    SELECT
      r.id,
      ur.id,
      ue.id,
      'ownerr_network',
      r.status,
      0,
      'legacy_ownerr_network',
      r.created_at
    FROM public.ownerr_network_referrals r
    JOIN public.users ur ON ur.id = r.referrer_id
    JOIN public.users ue ON ue.id = r.referee_id
    ON CONFLICT (referred_user_id) DO NOTHING;

    INSERT INTO public.referral_events (referral_id, event_type, metadata, created_at)
    SELECT r.id, 'completed', jsonb_build_object('completed_at', r.completed_at), coalesce(r.completed_at, r.created_at)
    FROM public.ownerr_network_referrals r
    WHERE r.completed_at IS NOT NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Backfill: user_scores
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_src regclass := public.ownerr_resolve_network_users_regclass();
BEGIN
  IF v_src IS NOT NULL THEN
    EXECUTE format($q$
      INSERT INTO public.user_scores (
        user_id, points, referrals_score, completion_score, verification_score, activity_score, network_score, updated_at
      )
      SELECT
        u.id,
        coalesce(nu.points, 0),
        coalesce(nu.total_referrals, 0),
        0,
        CASE WHEN nu.profile_verified THEN 10 ELSE 0 END,
        0,
        coalesce(nu.points, 0),
        nu.updated_at
      FROM %s nu
      JOIN public.users u ON u.id = nu.id
      ON CONFLICT (user_id) DO UPDATE SET
        points = EXCLUDED.points,
        referrals_score = EXCLUDED.referrals_score,
        verification_score = EXCLUDED.verification_score,
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
-- Backfill: user_badges
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.ownerr_network_user_badges') IS NOT NULL AND to_regclass('public.ownerr_network_badges') IS NOT NULL THEN
    INSERT INTO public.user_badges (user_id, badge_slug, awarded_at, metadata)
    SELECT u.id, b.code, ub.awarded_at, jsonb_build_object('legacy_badge_id', b.id::text)
    FROM public.ownerr_network_user_badges ub
    JOIN public.ownerr_network_badges b ON b.id = ub.badge_id
    JOIN public.users u ON u.id = ub.user_id
    ON CONFLICT (user_id, badge_slug) DO NOTHING;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Backfill: user_events
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.ownerr_network_analytics_events') IS NOT NULL THEN
    INSERT INTO public.user_events (id, user_id, product_slug, event_type, metadata, created_at)
    SELECT e.id, u.id, 'ownerr_network', e.event_type,
      coalesce(e.payload, '{}'::jsonb) || jsonb_build_object('session_id', e.session_id),
      e.created_at
    FROM public.ownerr_network_analytics_events e
    LEFT JOIN public.users u ON u.id = e.user_id
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Backfill: onboarding + answers
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.ownerr_network_onboarding_sessions') IS NOT NULL THEN
    INSERT INTO public.user_onboarding_sessions (
      id, user_id, product_slug, current_step, status, completed_at, metadata, created_at, updated_at
    )
    SELECT
      s.id,
      u.id,
      'ownerr_network',
      NULL,
      CASE WHEN s.completed_at IS NOT NULL THEN 'completed' ELSE 'in_progress' END,
      s.completed_at,
      jsonb_build_object('legacy_answers_json', s.answers_json),
      coalesce(s.completed_at, now()),
      coalesce(s.completed_at, now())
    FROM public.ownerr_network_onboarding_sessions s
    JOIN public.users u ON u.id = s.user_id
    ON CONFLICT (user_id, product_slug) DO UPDATE SET
      status = EXCLUDED.status,
      completed_at = COALESCE(EXCLUDED.completed_at, public.user_onboarding_sessions.completed_at),
      metadata = public.user_onboarding_sessions.metadata || EXCLUDED.metadata,
      updated_at = now();

    INSERT INTO public.user_answers (session_id, question_key, answer_value, metadata)
    SELECT
      s.id,
      kv.key,
      kv.value,
      '{}'::jsonb
    FROM public.ownerr_network_onboarding_sessions s
    CROSS JOIN LATERAL jsonb_each(coalesce(s.answers_json, '{}'::jsonb)) kv
    ON CONFLICT (session_id, question_key) DO NOTHING;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Backfill: listings from startups
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.startups') IS NOT NULL THEN
    INSERT INTO public.listings (
      id, owner_user_id, listing_type, title, description, industry, price_range, status, visibility, metadata, created_at, updated_at
    )
    SELECT
      s.id,
      u.id,
      'startup',
      s.title,
      s.description,
      s.industry,
      CASE WHEN s.asking_price IS NOT NULL THEN s.asking_price::text || ' ' || coalesce(s.currency, 'USD') ELSE NULL END,
      CASE s.status WHEN 'published' THEN 'published' WHEN 'sold' THEN 'sold' WHEN 'archived' THEN 'archived' ELSE 'draft' END,
      s.visibility,
      s.metadata || jsonb_build_object(
        'legacy_startup_slug', s.slug,
        'founder_handle', s.founder_handle,
        'tagline', s.tagline,
        'stage', s.stage,
        'verified', s.verified
      ),
      s.created_at,
      s.updated_at
    FROM public.startups s
    LEFT JOIN public.users u ON u.auth_user_id = s.founder_user_id
    WHERE u.id IS NOT NULL
    ON CONFLICT (id) DO NOTHING;

    IF to_regclass('public.startup_interests') IS NOT NULL AND to_regclass('public.marketplace_profiles') IS NOT NULL THEN
      INSERT INTO public.listing_interests (listing_id, interested_user_id, status, metadata, created_at)
      SELECT
        si.startup_id,
        u.id,
        si.status,
        jsonb_build_object('legacy_startup_interest_id', si.id::text, 'message', si.message),
        si.created_at
      FROM public.startup_interests si
      JOIN public.marketplace_profiles mp ON mp.id = si.buyer_profile_id
      JOIN public.users u ON u.auth_user_id = mp.auth_user_id
      ON CONFLICT (listing_id, interested_user_id) DO NOTHING;
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Backfill: submissions (founder_submissions)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.founder_submissions') IS NOT NULL THEN
    INSERT INTO public.submissions (
      id, founder_user_id, title, sector, pitch, stage, score, status, metadata, created_at, updated_at
    )
    SELECT
      fs.id,
      u.id,
      fs.startup_name,
      fs.category,
      coalesce(fs.description, fs.tagline),
      NULL,
      NULL,
      'active',
      jsonb_build_object(
        'founder_name', fs.founder_name,
        'tagline', fs.tagline,
        'website', fs.website,
        'social_links', fs.social_links,
        'referral_code', fs.referral_code,
        'referral_link', fs.referral_link,
        'visit_count', fs.visit_count,
        'referral_signup_count', fs.referral_signup_count
      ),
      fs.created_at,
      fs.created_at
    FROM public.founder_submissions fs
    LEFT JOIN public.users u ON u.auth_user_id = fs.auth_user_id
    ON CONFLICT (id) DO UPDATE SET
      founder_user_id = COALESCE(EXCLUDED.founder_user_id, public.submissions.founder_user_id),
      metadata = public.submissions.metadata || EXCLUDED.metadata;

    IF to_regclass('public.founder_referral_events') IS NOT NULL THEN
      INSERT INTO public.submission_referrals (submission_id, user_id, conversions, metadata, created_at)
      SELECT
        fre.founder_id,
        NULL,
        CASE WHEN fre.event_type = 'signup' THEN 1 ELSE 0 END,
        jsonb_build_object('event_type', fre.event_type, 'source_platform', fre.source_platform, 'legacy_event_id', fre.id::text),
        fre.created_at
      FROM public.founder_referral_events fre;
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Normalize conversations → users
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.conversations') IS NOT NULL
     AND to_regclass('public.marketplace_profiles') IS NOT NULL THEN
    UPDATE public.conversations c
    SET buyer_user_id = u.id
    FROM public.marketplace_profiles mp
    JOIN public.users u ON u.auth_user_id = mp.auth_user_id
    WHERE c.buyer_profile_id = mp.id AND c.buyer_user_id IS NULL;

    UPDATE public.conversations c
    SET seller_user_id = u.id
    FROM public.marketplace_profiles mp
    JOIN public.users u ON u.auth_user_id = mp.auth_user_id
    WHERE c.seller_profile_id = mp.id AND c.seller_user_id IS NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- App slug normalization (legacy unemployed → ownerr_network)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.user_app_access') IS NOT NULL THEN
    UPDATE public.user_app_access SET app_slug = 'ownerr_network' WHERE app_slug = 'unemployed';
    ALTER TABLE public.user_app_access DROP CONSTRAINT IF EXISTS user_app_access_app_slug_check;
    ALTER TABLE public.user_app_access ADD CONSTRAINT user_app_access_app_slug_check
      CHECK (app_slug IN ('ownerr_os', 'marketplace', 'ownerr_network'));
  END IF;
  IF to_regclass('public.product_sessions') IS NOT NULL THEN
    UPDATE public.product_sessions SET product = 'ownerr_network' WHERE product = 'unemployed';
    ALTER TABLE public.product_sessions DROP CONSTRAINT IF EXISTS product_sessions_product_check;
    ALTER TABLE public.product_sessions ADD CONSTRAINT product_sessions_product_check
      CHECK (product IN ('ownerr_os', 'marketplace', 'ownerr_network'));
  END IF;
  IF to_regclass('public.platform_users') IS NOT NULL THEN
    UPDATE public.platform_users SET preferred_app_slug = 'ownerr_network' WHERE preferred_app_slug = 'unemployed';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Canonical RPCs (OWNERR Network on master schema)
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'ownerr_network_current_user_row',
        'ownerr_network_provision_user',
        'ownerr_network_complete_onboarding',
        'ownerr_network_complete_mcq',
        'ownerr_network_claim_daily_activity',
        'ownerr_network_verify_profile_bonus',
        'ownerr_network_award_points',
        'ownerr_award_points'
      )
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig::text || ' CASCADE';
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.ownerr_award_points(
  p_user_id uuid,
  p_type text,
  p_amount bigint,
  p_idempotency_key text,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id uuid;
BEGIN
  IF p_amount <= 0 THEN RETURN false; END IF;

  INSERT INTO public.wallet_transactions (wallet_id, transaction_type, amount, source, source_reference, metadata)
  SELECT w.id, p_type, p_amount, 'ownerr_network', p_idempotency_key, p_metadata
  FROM public.wallets w WHERE w.user_id = p_user_id
  ON CONFLICT (wallet_id, source_reference) DO NOTHING
  RETURNING wallet_id INTO v_wallet_id;

  IF v_wallet_id IS NULL THEN RETURN false; END IF;

  UPDATE public.wallets
  SET balance = balance + p_amount, total_earned = total_earned + p_amount, updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.user_scores (user_id, points, network_score, updated_at)
  VALUES (p_user_id, p_amount, p_amount, now())
  ON CONFLICT (user_id) DO UPDATE SET
    points = public.user_scores.points + p_amount,
    network_score = public.user_scores.network_score + p_amount,
    updated_at = now();

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.ownerr_network_current_user_row()
RETURNS SETOF public.users
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.users WHERE auth_user_id = auth.uid() AND deleted_at IS NULL LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.ownerr_network_provision_user(
  p_name text,
  p_referral_code_input text DEFAULT NULL,
  p_signup_source text DEFAULT NULL,
  p_device_info jsonb DEFAULT NULL
) RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth uuid := auth.uid();
  v_email text;
  v_existing public.users;
  v_referrer public.users;
  v_referrer_id uuid;
  v_username text;
  v_code text;
  v_user public.users;
  v_base text;
BEGIN
  IF v_auth IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_existing FROM public.users WHERE auth_user_id = v_auth;
  IF FOUND THEN RETURN v_existing; END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_auth;
  v_base := coalesce(nullif(trim(p_name), ''), split_part(coalesce(v_email, ''), '@', 1));
  v_username := lower(regexp_replace(v_base, '[^a-zA-Z0-9]', '', 'g'));
  IF length(v_username) < 3 THEN v_username := 'user'; END IF;
  v_username := v_username || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4);
  v_code := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  INSERT INTO public.users (auth_user_id, email, username, full_name, referral_code, status, role)
  VALUES (v_auth, coalesce(v_email, ''), v_username, coalesce(nullif(trim(p_name), ''), v_base), v_code, 'active', 'member')
  RETURNING * INTO v_user;

  INSERT INTO public.wallets (user_id) VALUES (v_user.id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_scores (user_id) VALUES (v_user.id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_products (user_id, product_slug, metadata)
  VALUES (v_user.id, 'ownerr_network', jsonb_build_object('signup_source', p_signup_source, 'device_info', p_device_info))
  ON CONFLICT (user_id, product_slug) DO NOTHING;

  PERFORM public.ownerr_award_points(v_user.id, 'signup', 1, 'signup:' || v_user.id::text, '{}'::jsonb);

  IF p_referral_code_input IS NOT NULL AND length(trim(p_referral_code_input)) > 0 THEN
    SELECT * INTO v_referrer FROM public.users WHERE referral_code = trim(p_referral_code_input) LIMIT 1;
    IF FOUND AND v_referrer.id <> v_user.id THEN
      v_referrer_id := v_referrer.id;
      UPDATE public.users SET referred_by = v_referrer_id WHERE id = v_user.id;
      INSERT INTO public.referrals (referrer_user_id, referred_user_id, product_slug, status, reward_amount, source)
      VALUES (v_referrer_id, v_user.id, 'ownerr_network', 'completed', 1, coalesce(p_signup_source, 'provision'))
      ON CONFLICT (referred_user_id) DO NOTHING;
      PERFORM public.ownerr_award_points(v_referrer_id, 'referral', 1, 'referral:' || v_referrer_id::text || ':' || v_user.id::text,
        jsonb_build_object('referred_user_id', v_user.id));
      UPDATE public.user_scores SET referrals_score = referrals_score + 1, updated_at = now() WHERE user_id = v_referrer_id;
    END IF;
  END IF;

  PERFORM public.ownerr_network_check_badges(v_user.id);
  IF v_referrer_id IS NOT NULL THEN PERFORM public.ownerr_network_check_badges(v_referrer_id); END IF;
  RETURN v_user;
END;
$$;

CREATE OR REPLACE FUNCTION public.ownerr_network_complete_onboarding(
  p_name text,
  p_username text,
  p_answers jsonb
) RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user public.users;
  v_session_id uuid;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE auth_user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'profile_missing'; END IF;

  IF nullif(trim(p_name), '') IS NOT NULL THEN
    UPDATE public.users SET full_name = trim(p_name), updated_at = now() WHERE id = v_user.id;
  END IF;
  IF nullif(trim(p_username), '') IS NOT NULL THEN
    UPDATE public.users SET username = lower(trim(p_username)), updated_at = now() WHERE id = v_user.id;
  END IF;

  INSERT INTO public.user_onboarding_sessions (user_id, product_slug, status, completed_at, metadata)
  VALUES (v_user.id, 'ownerr_network', 'completed', now(), jsonb_build_object('answers', p_answers))
  ON CONFLICT (user_id, product_slug) DO UPDATE SET
    status = 'completed',
    completed_at = now(),
    metadata = EXCLUDED.metadata,
    updated_at = now()
  RETURNING id INTO v_session_id;

  INSERT INTO public.user_answers (session_id, question_key, answer_value)
  SELECT v_session_id, kv.key, kv.value
  FROM jsonb_each(coalesce(p_answers, '{}'::jsonb)) kv
  ON CONFLICT (session_id, question_key) DO UPDATE SET answer_value = EXCLUDED.answer_value;

  INSERT INTO public.user_profiles (user_id)
  VALUES (v_user.id)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.user_profiles SET
    headline = coalesce(nullif(trim(p_name), ''), headline, v_user.full_name),
    user_type = coalesce(p_answers->>'describes_you', user_type),
    skill_tags = CASE
      WHEN p_answers ? 'skills' AND jsonb_typeof(p_answers->'skills') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(p_answers->'skills'))
      ELSE skill_tags
    END,
    remote_preference = coalesce(p_answers->>'remote', remote_preference),
    experience_level = coalesce(p_answers->>'experience', experience_level),
    onboarding_completed = true,
    profile_completion_score = 100,
    metadata = metadata || jsonb_build_object('onboarding_answers', p_answers),
    updated_at = now()
  WHERE user_id = v_user.id;

  PERFORM public.ownerr_award_points(v_user.id, 'profile_completed', 5, 'profile:' || v_user.id::text, p_answers);
  PERFORM public.ownerr_network_check_badges(v_user.id);
  SELECT * INTO v_user FROM public.users WHERE id = v_user.id;
  RETURN v_user;
END;
$$;

CREATE OR REPLACE FUNCTION public.ownerr_network_complete_mcq(p_answers jsonb)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.ownerr_network_complete_onboarding(
    coalesce(p_answers->>'name', ''),
    coalesce(p_answers->>'username', ''),
    p_answers
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.ownerr_network_check_badges(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_refs bigint;
BEGIN
  SELECT referrals_score INTO v_refs FROM public.user_scores WHERE user_id = p_user_id;
  IF EXISTS (
    SELECT 1 FROM public.user_onboarding_sessions
    WHERE user_id = p_user_id AND product_slug = 'ownerr_network' AND status = 'completed'
  ) THEN
    INSERT INTO public.user_badges (user_id, badge_slug) VALUES (p_user_id, 'builder') ON CONFLICT DO NOTHING;
  END IF;
  IF coalesce(v_refs, 0) >= 5 THEN
    INSERT INTO public.user_badges (user_id, badge_slug) VALUES (p_user_id, 'recruiter') ON CONFLICT DO NOTHING;
  END IF;
  IF coalesce(v_refs, 0) >= 10 THEN
    INSERT INTO public.user_badges (user_id, badge_slug) VALUES (p_user_id, 'connector') ON CONFLICT DO NOTHING;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.wallet_transactions wt
    JOIN public.wallets w ON w.id = wt.wallet_id
    WHERE w.user_id = p_user_id AND wt.transaction_type = 'daily_activity'
    LIMIT 3
  ) THEN
    INSERT INTO public.user_badges (user_id, badge_slug) VALUES (p_user_id, 'hustler') ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ownerr_award_points TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ownerr_network_current_user_row TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ownerr_network_provision_user TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ownerr_network_complete_onboarding TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ownerr_network_complete_mcq TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ownerr_network_check_badges TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS (canonical tables)
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_onboarding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_own ON public.users;
CREATE POLICY users_select_own ON public.users FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() OR deleted_at IS NULL);

DROP POLICY IF EXISTS users_select_public_directory ON public.users;
CREATE POLICY users_select_public_directory ON public.users FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS users_update_own ON public.users;
CREATE POLICY users_update_own ON public.users FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS user_profiles_select_own ON public.user_profiles;
CREATE POLICY user_profiles_select_own ON public.user_profiles FOR SELECT TO authenticated
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS user_profiles_select_discover ON public.user_profiles;
CREATE POLICY user_profiles_select_discover ON public.user_profiles FOR SELECT TO authenticated
  USING (onboarding_completed = true AND visibility IN ('public', 'network'));

DROP POLICY IF EXISTS user_profiles_upsert_own ON public.user_profiles;
CREATE POLICY user_profiles_upsert_own ON public.user_profiles FOR ALL TO authenticated
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS user_products_select_own ON public.user_products;
CREATE POLICY user_products_select_own ON public.user_products FOR SELECT TO authenticated
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS wallets_select_own ON public.wallets;
CREATE POLICY wallets_select_own ON public.wallets FOR SELECT TO authenticated
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS wallet_transactions_select_own ON public.wallet_transactions;
CREATE POLICY wallet_transactions_select_own ON public.wallet_transactions FOR SELECT TO authenticated
  USING (wallet_id IN (SELECT w.id FROM public.wallets w JOIN public.users u ON u.id = w.user_id WHERE u.auth_user_id = auth.uid()));

DROP POLICY IF EXISTS referrals_select_involved ON public.referrals;
CREATE POLICY referrals_select_involved ON public.referrals FOR SELECT TO authenticated
  USING (
    referrer_user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    OR referred_user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS user_scores_select_public ON public.user_scores;
CREATE POLICY user_scores_select_public ON public.user_scores FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS user_badges_select_public ON public.user_badges;
CREATE POLICY user_badges_select_public ON public.user_badges FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS user_events_insert ON public.user_events;
CREATE POLICY user_events_insert ON public.user_events FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS user_events_select_own ON public.user_events;
CREATE POLICY user_events_select_own ON public.user_events FOR SELECT TO authenticated
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS user_onboarding_select_own ON public.user_onboarding_sessions;
CREATE POLICY user_onboarding_select_own ON public.user_onboarding_sessions FOR SELECT TO authenticated
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS listings_select_public ON public.listings;
CREATE POLICY listings_select_public ON public.listings FOR SELECT TO authenticated
  USING (visibility = 'public' AND status = 'published');

DROP POLICY IF EXISTS submissions_select_public ON public.submissions;
CREATE POLICY submissions_select_public ON public.submissions FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- Archive legacy physical tables (free names for compatibility views)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ownerr_network_users',
    'unemployed_users',
    'ownerr_network_profiles',
    'unemployed_profiles',
    'ownerr_network_onboarding_sessions',
    'unemployed_mcq_sessions',
    'ownerr_network_analytics_events',
    'unemployed_analytics_events',
    'ownerr_network_points_ledger',
    'unemployed_points_ledger',
    'ownerr_network_referrals',
    'unemployed_referrals',
    'ownerr_network_badges',
    'unemployed_badges',
    'ownerr_network_user_badges',
    'unemployed_user_badges',
    'platform_users',
    'ownerr_profiles',
    'marketplace_profiles'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL
       AND to_regclass('public._legacy_' || t) IS NULL
    THEN
      EXECUTE format('ALTER TABLE public.%I RENAME TO %I', t, '_legacy_' || t);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Temporary compatibility views (legacy API surface → canonical)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.ownerr_network_users AS
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
  up.metadata->>'signup_source' AS signup_source,
  up.metadata->'device_info' AS device_info,
  u.created_at,
  u.updated_at
FROM public.users u
LEFT JOIN public.user_scores s ON s.user_id = u.id
LEFT JOIN public.wallets w ON w.user_id = u.id
LEFT JOIN public.user_products up ON up.user_id = u.id AND up.product_slug = 'ownerr_network';

CREATE OR REPLACE VIEW public.ownerr_network_profiles AS
SELECT
  p.user_id AS id,
  u.auth_user_id,
  p.headline AS display_name,
  u.username,
  p.user_type,
  p.skill_tags,
  p.remote_preference AS work_preference,
  p.metadata->>'goals' AS goals,
  p.experience_level,
  p.metadata->>'availability' AS availability,
  p.metadata->>'seriousness_score' AS seriousness_score,
  CASE WHEN p.onboarding_completed THEN now() END AS onboarding_completed_at,
  p.profile_completion_score AS profile_completion_pct,
  p.metadata,
  p.created_at,
  p.updated_at
FROM public.user_profiles p
JOIN public.users u ON u.id = p.user_id;

CREATE OR REPLACE VIEW public.ownerr_network_onboarding_sessions AS
SELECT
  os.id,
  os.user_id,
  coalesce(os.metadata->'legacy_answers_json', os.metadata->'answers', '{}'::jsonb) AS answers_json,
  os.completed_at
FROM public.user_onboarding_sessions os
WHERE os.product_slug = 'ownerr_network';

CREATE OR REPLACE VIEW public.ownerr_network_analytics_events AS
SELECT
  e.id,
  e.user_id,
  e.event_type,
  e.metadata AS payload,
  e.metadata->>'session_id' AS session_id,
  e.created_at
FROM public.user_events e
WHERE e.product_slug = 'ownerr_network';

GRANT SELECT ON public.ownerr_network_users TO authenticated, anon;
GRANT SELECT ON public.ownerr_network_profiles TO authenticated, anon;
GRANT SELECT ON public.ownerr_network_onboarding_sessions TO authenticated, anon;
GRANT INSERT ON public.user_events TO authenticated, anon;

NOTIFY pgrst, 'reload schema';

COMMIT;
