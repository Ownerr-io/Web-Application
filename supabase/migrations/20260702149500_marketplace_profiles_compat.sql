-- Enterprise finalize (20260701130000) may rename marketplace_profiles → _legacy_marketplace_profiles.
-- Trust/marketplace migrations through schema v2 expect public.marketplace_profiles as a real table.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.marketplace_profiles') IS NULL
     AND to_regclass('public._legacy_marketplace_profiles') IS NOT NULL THEN
    ALTER TABLE public._legacy_marketplace_profiles RENAME TO marketplace_profiles;
  ELSIF to_regclass('public.marketplace_profiles') IS NULL
     AND to_regclass('public.marketplace_accounts') IS NOT NULL THEN
    -- Schema v2 physical name; keep marketplace_accounts (see 20260702510000 / 20260702720000).
    NULL;
  ELSIF to_regclass('public.marketplace_profiles') IS NULL THEN
    CREATE TABLE public.marketplace_profiles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      auth_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
      desk_role text,
      status text NOT NULL DEFAULT 'active',
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT marketplace_profiles_desk_role_check CHECK (
        desk_role IS NULL OR desk_role IN ('buyer', 'seller', 'founder')
      ),
      CONSTRAINT marketplace_profiles_status_check CHECK (
        status IN ('active', 'suspended', 'pending')
      )
    );
  END IF;
END $$;

ALTER TABLE public.marketplace_profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS desk_role text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'marketplace_profiles_auth_user_desk_role_key'
      AND conrelid = 'public.marketplace_profiles'::regclass
  ) THEN
    BEGIN
      ALTER TABLE public.marketplace_profiles
        ADD CONSTRAINT marketplace_profiles_auth_user_desk_role_key UNIQUE (auth_user_id, desk_role);
    EXCEPTION
      WHEN unique_violation THEN
        RAISE NOTICE 'marketplace_profiles_auth_user_desk_role_key skipped: duplicate rows';
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS marketplace_profiles_auth_user_id_idx
  ON public.marketplace_profiles (auth_user_id);
CREATE INDEX IF NOT EXISTS marketplace_profiles_desk_role_idx
  ON public.marketplace_profiles (desk_role);

DROP TRIGGER IF EXISTS marketplace_profiles_set_updated_at ON public.marketplace_profiles;
CREATE TRIGGER marketplace_profiles_set_updated_at
  BEFORE UPDATE ON public.marketplace_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.marketplace_profiles ENABLE ROW LEVEL SECURITY;

COMMIT;
