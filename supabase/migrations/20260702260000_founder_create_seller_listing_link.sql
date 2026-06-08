-- Link new founder startups to seller desk (seller_listings) when a seller profile exists.

BEGIN;

CREATE OR REPLACE FUNCTION public.founder_create_startup(
  p_slug text,
  p_title text,
  p_description text DEFAULT '',
  p_industry text DEFAULT 'SaaS',
  p_founded_year integer DEFAULT NULL,
  p_currency text DEFAULT 'USD'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
  v_seller_profile_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF length(trim(p_slug)) < 2 OR length(trim(p_title)) < 2 THEN
    RAISE EXCEPTION 'Invalid slug or title';
  END IF;

  INSERT INTO public.startups (
    id, slug, founder_user_id, title, description, industry,
    founded_year, currency, visibility, status, verified, listing_lifecycle, metadata
  ) VALUES (
    v_id, lower(trim(p_slug)), auth.uid(), trim(p_title), coalesce(p_description, ''),
    p_industry, p_founded_year, coalesce(p_currency, 'USD'),
    'unlisted', 'draft', false, 'draft', '{}'::jsonb
  );

  PERFORM public.ensure_listing_gates_row(v_id);

  INSERT INTO public.trust_scores (startup_id, score, level)
  VALUES (v_id, 0, 'unverified')
  ON CONFLICT (startup_id) DO NOTHING;

  SELECT mp.id INTO v_seller_profile_id
  FROM public.marketplace_profiles mp
  WHERE mp.auth_user_id = auth.uid()
    AND mp.desk_role IN ('seller', 'founder')
  ORDER BY mp.updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_seller_profile_id IS NOT NULL THEN
    INSERT INTO public.seller_listings (startup_id, seller_profile_id, status)
    VALUES (v_id, v_seller_profile_id, 'draft')
    ON CONFLICT (startup_id, seller_profile_id) DO NOTHING;
  END IF;

  PERFORM public.append_audit_log('startup', v_id, 'founder_create', NULL,
    jsonb_build_object('slug', p_slug, 'listing_lifecycle', 'draft'));

  RETURN v_id;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
