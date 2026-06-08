-- Re-apply schema v2 physical renames when a later compat migration left legacy table names
-- (e.g. marketplace_profiles) while the app expects marketplace_accounts (PostgREST PGRST205).

BEGIN;

DO $r$ BEGIN
  IF to_regclass('public.startups') IS NOT NULL
     AND to_regclass('public.marketplace_companies') IS NULL THEN
    ALTER TABLE public.startups RENAME TO marketplace_companies;
  END IF;
END $r$;

DO $r$
DECLARE
  v_kind "char";
BEGIN
  IF to_regclass('public.marketplace_profiles') IS NULL THEN
    RETURN;
  END IF;
  SELECT c.relkind INTO v_kind
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'marketplace_profiles';
  IF v_kind = 'v' AND to_regclass('public.marketplace_accounts') IS NOT NULL THEN
    DROP VIEW public.marketplace_profiles;
    RETURN;
  END IF;
  IF v_kind = 'r'
     AND to_regclass('public.marketplace_accounts') IS NULL THEN
    ALTER TABLE public.marketplace_profiles RENAME TO marketplace_accounts;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.startup_media') IS NOT NULL
     AND to_regclass('public.marketplace_company_media') IS NULL THEN
    ALTER TABLE public.startup_media RENAME TO marketplace_company_media;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.startup_metrics') IS NOT NULL
     AND to_regclass('public.marketplace_company_metrics') IS NULL THEN
    ALTER TABLE public.startup_metrics RENAME TO marketplace_company_metrics;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.startup_interests') IS NOT NULL
     AND to_regclass('public.marketplace_buyer_interests') IS NULL THEN
    ALTER TABLE public.startup_interests RENAME TO marketplace_buyer_interests;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.bids') IS NOT NULL
     AND to_regclass('public.marketplace_offers') IS NULL THEN
    ALTER TABLE public.bids RENAME TO marketplace_offers;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.bid_versions') IS NOT NULL
     AND to_regclass('public.marketplace_offer_revisions') IS NULL THEN
    ALTER TABLE public.bid_versions RENAME TO marketplace_offer_revisions;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.conversations') IS NOT NULL
     AND to_regclass('public.marketplace_conversations') IS NULL THEN
    ALTER TABLE public.conversations RENAME TO marketplace_conversations;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.messages') IS NOT NULL
     AND to_regclass('public.marketplace_messages') IS NULL THEN
    ALTER TABLE public.messages RENAME TO marketplace_messages;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.seller_listings') IS NOT NULL
     AND to_regclass('public.marketplace_seller_publications') IS NULL THEN
    ALTER TABLE public.seller_listings RENAME TO marketplace_seller_publications;
  END IF;
END $r$;

ALTER TABLE public.marketplace_accounts
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS desk_role text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF to_regclass('public.marketplace_accounts') IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'marketplace_accounts_auth_user_desk_role_key'
      AND conrelid = 'public.marketplace_accounts'::regclass
  ) THEN
    BEGIN
      ALTER TABLE public.marketplace_accounts
        ADD CONSTRAINT marketplace_accounts_auth_user_desk_role_key
        UNIQUE (auth_user_id, desk_role);
    EXCEPTION
      WHEN unique_violation THEN
        RAISE NOTICE 'marketplace_accounts_auth_user_desk_role_key skipped: duplicate rows';
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS marketplace_accounts_auth_user_id_idx
  ON public.marketplace_accounts (auth_user_id);
CREATE INDEX IF NOT EXISTS marketplace_accounts_desk_role_idx
  ON public.marketplace_accounts (auth_user_id, desk_role);

DROP TRIGGER IF EXISTS marketplace_accounts_set_updated_at ON public.marketplace_accounts;
CREATE TRIGGER marketplace_accounts_set_updated_at
  BEFORE UPDATE ON public.marketplace_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.marketplace_accounts ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';

COMMIT;
