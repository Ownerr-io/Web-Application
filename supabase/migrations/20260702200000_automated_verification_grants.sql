-- Re-grant after 20260702190000 DROP/CREATE founder_submit_business_email (return type change)
GRANT EXECUTE ON FUNCTION public.founder_submit_business_email(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
