-- Schema v2: launch token table is sys_sync_worker_launch_tokens; consume still queried
-- sync_worker_launch_tokens (view dropped) → browser /v1/process-jobs always 401.

BEGIN;

DO $$
DECLARE
  r record;
  def text;
  newdef text;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND (
        position('sync_worker_launch_tokens' in p.prosrc) > 0
        OR position('platform_internal_config' in p.prosrc) > 0
        OR position('identity_launch_tokens' in p.prosrc) > 0
        OR position('business_email_launch_tokens' in p.prosrc) > 0
      )
  LOOP
    BEGIN
      def := pg_get_functiondef(r.oid);
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'sync_worker_v2_table_refs: skip % (%)', r.proname, SQLERRM;
        CONTINUE;
    END;

    newdef := def;
    newdef := replace(newdef, 'public.sync_worker_launch_tokens', 'public.sys_sync_worker_launch_tokens');
    newdef := replace(newdef, 'sync_worker_launch_tokens', 'sys_sync_worker_launch_tokens');
    newdef := replace(newdef, 'public.platform_internal_config', 'public.sys_platform_config');
    newdef := replace(newdef, 'platform_internal_config', 'sys_platform_config');
    newdef := replace(newdef, 'public.identity_launch_tokens', 'public.sys_identity_launch_tokens');
    newdef := replace(newdef, 'identity_launch_tokens', 'sys_identity_launch_tokens');
    newdef := replace(newdef, 'public.business_email_launch_tokens', 'public.sys_business_email_launch_tokens');
    newdef := replace(newdef, 'business_email_launch_tokens', 'sys_business_email_launch_tokens');
    -- Undo double sys_ prefix if any function was already partially migrated
    newdef := replace(newdef, 'sys_sys_', 'sys_');

    IF newdef IS DISTINCT FROM def THEN
      EXECUTE newdef;
      RAISE NOTICE 'sync_worker_v2_table_refs: updated public.%', r.proname;
    END IF;
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.consume_sync_worker_launch_token(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.founder_invoke_sync_worker(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
