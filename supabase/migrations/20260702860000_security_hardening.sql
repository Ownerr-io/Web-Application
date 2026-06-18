-- Production security hardening: authoritative admin check, audit index.

BEGIN;

-- TD-01 (reassert): platform admin from public.users.role only — never JWT user_metadata.
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
  PERFORM set_config('row_security', 'off', true);
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.deleted_at IS NULL
      AND u.role = 'admin'
  )
  INTO v_admin;
  RETURN coalesce(v_admin, false);
END;
$$;

COMMENT ON FUNCTION public.is_platform_admin() IS
  'Authoritative admin flag: public.users.role = admin only. Do not use auth.jwt() user_metadata for authorization.';

CREATE INDEX IF NOT EXISTS sys_audit_logs_action_created_idx
  ON public.sys_audit_logs (action, created_at DESC);

COMMIT;
