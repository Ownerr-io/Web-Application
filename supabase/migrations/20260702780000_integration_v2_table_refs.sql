-- Schema v2 dropped integration_connections compat view; ON CONFLICT still referenced
-- integration_connections.col → runtime failure when reconnecting a provider.

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
      AND position('integration_connections.' in p.prosrc) > 0
  LOOP
    BEGIN
      def := pg_get_functiondef(r.oid);
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'integration_v2_table_refs: skip % (%)', r.proname, SQLERRM;
        CONTINUE;
    END;

    newdef := def;
    newdef := replace(newdef, 'integration_connections.', 'trust_integrations.');
    newdef := replace(newdef, 'public.integration_connections', 'public.trust_integrations');
    IF newdef IS DISTINCT FROM def THEN
      EXECUTE newdef;
      RAISE NOTICE 'integration_v2_table_refs: updated public.%', r.proname;
    END IF;
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.integration_connect_api_key(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.integration_disconnect(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
