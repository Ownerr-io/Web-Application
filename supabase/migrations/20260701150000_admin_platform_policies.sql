-- Platform admin RLS helpers: JWT user_metadata.role = 'admin' or users.role = 'admin'

BEGIN;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin',
    false
  )
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_user_id = auth.uid() AND u.role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- users
DROP POLICY IF EXISTS users_admin_manage ON public.users;
CREATE POLICY users_admin_manage ON public.users
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- user_profiles
DROP POLICY IF EXISTS user_profiles_admin_manage ON public.user_profiles;
CREATE POLICY user_profiles_admin_manage ON public.user_profiles
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- referrals
DROP POLICY IF EXISTS referrals_admin_manage ON public.referrals;
CREATE POLICY referrals_admin_manage ON public.referrals
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- wallets + wallet_transactions
DROP POLICY IF EXISTS wallets_admin_manage ON public.wallets;
CREATE POLICY wallets_admin_manage ON public.wallets
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS wallet_transactions_admin_manage ON public.wallet_transactions;
CREATE POLICY wallet_transactions_admin_manage ON public.wallet_transactions
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- marketplace startups
DROP POLICY IF EXISTS startups_admin_manage ON public.startups;
CREATE POLICY startups_admin_manage ON public.startups
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ownerr os listings + submissions
DROP POLICY IF EXISTS listings_admin_manage ON public.listings;
CREATE POLICY listings_admin_manage ON public.listings
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS submissions_admin_manage ON public.submissions;
CREATE POLICY submissions_admin_manage ON public.submissions
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

NOTIFY pgrst, 'reload schema';

COMMIT;
