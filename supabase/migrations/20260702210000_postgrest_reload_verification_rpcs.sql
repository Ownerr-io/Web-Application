-- Ensure PostgREST exposes verification RPCs after automated platform migration
GRANT EXECUTE ON FUNCTION public.founder_begin_identity_verification(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_launch_identity_verification(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_submit_business_email(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
