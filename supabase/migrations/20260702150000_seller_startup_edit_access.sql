-- Let founders and linked seller-desk profiles update their startups.

BEGIN;

CREATE OR REPLACE FUNCTION public.startup_owned_by_auth(p_startup_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.startups s
    WHERE s.id = p_startup_id AND s.founder_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.seller_listings sl
    INNER JOIN public.marketplace_profiles mp ON mp.id = sl.seller_profile_id
    WHERE sl.startup_id = p_startup_id
      AND mp.auth_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.startup_owned_by_auth_slug(p_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.startups s
    WHERE s.slug = p_slug AND s.founder_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.startups s
    INNER JOIN public.seller_listings sl ON sl.startup_id = s.id
    INNER JOIN public.marketplace_profiles mp ON mp.id = sl.seller_profile_id
    WHERE s.slug = p_slug
      AND mp.auth_user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS startups_update_own ON public.startups;
CREATE POLICY startups_update_own
  ON public.startups
  FOR UPDATE
  TO authenticated
  USING (
    founder_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.seller_listings sl
      INNER JOIN public.marketplace_profiles mp ON mp.id = sl.seller_profile_id
      WHERE sl.startup_id = startups.id
        AND mp.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    founder_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.seller_listings sl
      INNER JOIN public.marketplace_profiles mp ON mp.id = sl.seller_profile_id
      WHERE sl.startup_id = startups.id
        AND mp.auth_user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.founder_update_startup(
  p_slug text,
  p_title text,
  p_description text DEFAULT '',
  p_industry text DEFAULT 'SaaS',
  p_founded_year integer DEFAULT NULL,
  p_asking_price numeric DEFAULT NULL,
  p_annual_revenue numeric DEFAULT NULL,
  p_profit numeric DEFAULT NULL,
  p_growth_rate numeric DEFAULT NULL,
  p_team_size integer DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_meta jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT public.startup_owned_by_auth_slug(p_slug) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized to edit this listing';
  END IF;
  IF length(trim(p_title)) < 2 THEN
    RAISE EXCEPTION 'Invalid title';
  END IF;

  SELECT id, metadata INTO v_id, v_meta
  FROM public.startups
  WHERE slug = lower(trim(p_slug));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  v_meta := COALESCE(v_meta, '{}'::jsonb) || COALESCE(p_metadata, '{}'::jsonb);

  UPDATE public.startups
  SET
    title = trim(p_title),
    description = coalesce(p_description, ''),
    industry = coalesce(p_industry, industry),
    founded_year = coalesce(p_founded_year, founded_year),
    asking_price = p_asking_price,
    annual_revenue = p_annual_revenue,
    profit = p_profit,
    growth_rate = p_growth_rate,
    team_size = coalesce(p_team_size, team_size),
    metadata = v_meta,
    updated_at = now()
  WHERE id = v_id;

  PERFORM public.append_audit_log(
    'startup', v_id, 'founder_update', NULL,
    jsonb_build_object('slug', p_slug)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.founder_update_startup(
  text, text, text, text, integer, numeric, numeric, numeric, numeric, integer, jsonb
) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
