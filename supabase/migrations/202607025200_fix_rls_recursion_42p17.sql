-- Fix PostgREST 500 / SQLSTATE 42P17 (infinite recursion in RLS policies).
-- Caused by FORCE RLS + users <-> user_profiles circular policy checks and
-- security_invoker views (ownerr_network_*) joining RLS-protected tables.

BEGIN;

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  SELECT u.id
  INTO v_id
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
    AND u.deleted_at IS NULL
  LIMIT 1;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_profile_is_network_visible(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles p
    WHERE p.user_id = p_user_id
      AND p.onboarding_completed = true
      AND p.visibility IN ('public', 'network')
  )
  INTO v_ok;
  RETURN coalesce(v_ok, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin boolean;
BEGIN
  IF coalesce((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin', false) THEN
    RETURN true;
  END IF;
  PERFORM set_config('row_security', 'off', true);
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.role = 'admin'
  )
  INTO v_admin;
  RETURN coalesce(v_admin, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_profile_is_network_visible(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- users: no direct subquery to user_profiles in policy
DROP POLICY IF EXISTS users_select_network_directory ON public.users;

CREATE POLICY users_select_network_directory ON public.users
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      auth_user_id = auth.uid()
      OR public.user_profile_is_network_visible(id)
    )
  );

-- user_profiles: drop legacy policies that subquery users (recursion)
DROP POLICY IF EXISTS user_profiles_select ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_own ON public.user_profiles;

CREATE POLICY user_profiles_own ON public.user_profiles
  FOR ALL TO authenticated
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- wallets / products: use current_user_id() not users subquery
DROP POLICY IF EXISTS user_products_select_own ON public.user_products;
CREATE POLICY user_products_select_own ON public.user_products
  FOR SELECT TO authenticated
  USING (user_id = public.current_user_id());

DROP POLICY IF EXISTS wallets_select_own ON public.wallets;
CREATE POLICY wallets_select_own ON public.wallets
  FOR SELECT TO authenticated
  USING (user_id = public.current_user_id());

DROP POLICY IF EXISTS wallet_transactions_select_own ON public.wallet_transactions;
CREATE POLICY wallet_transactions_select_own ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING (
    wallet_id IN (
      SELECT w.id FROM public.wallets w WHERE w.user_id = public.current_user_id()
    )
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
