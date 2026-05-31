-- Platform admin is determined only by public.users.role (no JWT/env allowlists).

BEGIN;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.deleted_at IS NULL
      AND u.role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
