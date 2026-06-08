-- Supabase installs pgcrypto in the extensions schema; SECURITY DEFINER RPCs
-- with search_path = public cannot resolve pgp_sym_encrypt (PostgREST → 404).

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER FUNCTION public.integration_connect_api_key(uuid, text, text, text)
  SET search_path = public, extensions;

ALTER FUNCTION public.integration_complete_oauth(uuid, text, jsonb)
  SET search_path = public, extensions;

ALTER FUNCTION public.worker_get_connection_secrets(uuid)
  SET search_path = public, extensions;

NOTIFY pgrst, 'reload schema';

COMMIT;
