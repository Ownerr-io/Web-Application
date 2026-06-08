-- PostgREST/marketplace RPCs call api_guard('endpoint') with one argument.
-- Both api_guard(text) and api_guard(text, uuid) match → "function is not unique" → HTTP 400.

BEGIN;

DROP FUNCTION IF EXISTS public.api_guard(text);

GRANT EXECUTE ON FUNCTION public.api_guard(text, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
