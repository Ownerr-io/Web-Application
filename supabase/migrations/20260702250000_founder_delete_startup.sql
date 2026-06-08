-- Seller-owned listing delete (hard delete; child rows cascade).

BEGIN;

CREATE OR REPLACE FUNCTION public.founder_delete_startup(p_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_title text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT id, title INTO v_id, v_title
  FROM public.startups
  WHERE slug = lower(trim(p_slug));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  IF NOT public.startup_owned_by_auth(v_id) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized to delete this listing';
  END IF;

  PERFORM public.append_audit_log(
    'startup', v_id, 'founder_delete', NULL,
    jsonb_build_object('slug', lower(trim(p_slug)), 'title', v_title)
  );

  DELETE FROM public.startups WHERE id = v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.founder_delete_startup(text) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
