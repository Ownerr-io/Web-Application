-- Supabase PostgREST can return 405 on POST for STABLE RPCs; messaging endpoints must be VOLATILE.

BEGIN;

ALTER FUNCTION public.marketplace_list_conversations(integer, timestamptz, uuid)
  VOLATILE;

ALTER FUNCTION public.marketplace_list_messages(uuid, integer, timestamptz, uuid)
  VOLATILE;

GRANT EXECUTE ON FUNCTION public.marketplace_list_conversations(integer, timestamptz, uuid)
  TO authenticated, anon, service_role;

GRANT EXECUTE ON FUNCTION public.marketplace_list_messages(uuid, integer, timestamptz, uuid)
  TO authenticated, anon, service_role;

GRANT EXECUTE ON FUNCTION public.marketplace_mark_conversation_read(uuid)
  TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
