-- Schema v2 phase 0: move legacy tables out of public (data preserved in archive schema).
-- Run before 20260702510000_schema_v2_renames.sql

BEGIN;

CREATE SCHEMA IF NOT EXISTS archive;

COMMENT ON SCHEMA archive IS 'Archived legacy tables; not exposed via PostgREST. Data retained for audit/recovery.';

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname LIKE '_legacy\_%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I SET SCHEMA archive', r.tablename);
    RAISE NOTICE 'Archived table %', r.tablename;
  END LOOP;
END $$;

-- Canonical identity: ensure rows from archived network users exist in public.users (idempotent)
DO $$
BEGIN
  IF to_regclass('archive._legacy_unemployed_users') IS NOT NULL THEN
    INSERT INTO public.users (
      auth_user_id, email, username, full_name, avatar_url, referral_code, created_at, updated_at
    )
    SELECT
      u.auth_user_id,
      u.email,
      CASE
        WHEN EXISTS (SELECT 1 FROM public.users cu WHERE cu.username = u.username)
          THEN u.username || '_arch'
        ELSE u.username
      END,
      u.name,
      u.profile_image,
      u.referral_code,
      u.created_at,
      u.updated_at
    FROM archive._legacy_unemployed_users u
    ON CONFLICT (auth_user_id) DO NOTHING;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.schema_v2_rename_registry (
  physical_name text PRIMARY KEY,
  legacy_name text NOT NULL UNIQUE,
  domain text NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.schema_v2_rename_registry IS 'Maps schema v2 physical table names to legacy PostgREST names (compat views).';

NOTIFY pgrst, 'reload schema';

COMMIT;
