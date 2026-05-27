-- Repair: ensure Ownerr Network RPCs exist and refresh PostgREST schema cache.
-- Fixes PGRST202 / HTTP 404 on /rpc/ownerr_network_current_user_row after rename migration.

DO $$
BEGIN
  IF to_regclass('public.ownerr_network_users') IS NULL AND to_regclass('public.unemployed_users') IS NOT NULL THEN
    ALTER TABLE public.unemployed_users RENAME TO ownerr_network_users;
  END IF;
END $$;

DROP FUNCTION IF EXISTS ownerr_network_current_user_row();

CREATE FUNCTION ownerr_network_current_user_row()
RETURNS SETOF ownerr_network_users
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM ownerr_network_users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION ownerr_network_current_user_row() TO authenticated;
GRANT EXECUTE ON FUNCTION ownerr_network_current_user_row() TO service_role;

NOTIFY pgrst, 'reload schema';
