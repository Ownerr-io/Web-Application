-- Founders: profile + LinkedIn only (no government ID). Gates use person verified at level 1.

BEGIN;

CREATE OR REPLACE FUNCTION public.submit_person_verification_profile(p_desk_role text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.person_verification_profiles%ROWTYPE;
  v_desk text;
BEGIN
  v_desk := public.marketplace_desk_role_for_person(p_desk_role);

  PERFORM public.get_or_create_person_verification_profile(p_desk_role);
  SELECT pvp.* INTO v_row
  FROM public.person_verification_profiles pvp
  JOIN public.marketplace_profiles mp ON mp.id = pvp.marketplace_profile_id
  WHERE mp.auth_user_id = auth.uid()
    AND mp.desk_role = v_desk;

  IF v_row.full_name IS NULL OR length(trim(v_row.full_name)) < 2 THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;
  IF v_row.country_code IS NULL OR length(trim(v_row.country_code)) < 2 THEN
    RAISE EXCEPTION 'Country is required';
  END IF;
  IF v_row.linkedin_url IS NULL OR v_row.linkedin_url !~* '^https?://' THEN
    RAISE EXCEPTION 'Valid LinkedIn URL is required';
  END IF;

  UPDATE public.person_verification_profiles SET
    verification_status = 'verified',
    verification_level = GREATEST(verification_level, 1),
    verified_at = COALESCE(verified_at, now()),
    updated_at = now()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  IF v_desk = 'seller' THEN
    PERFORM public.refresh_listing_gates_for_founder(auth.uid());
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.founder_person_verified_for_auth(p_auth_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.person_verification_profiles pvp
    JOIN public.marketplace_profiles mp ON mp.id = pvp.marketplace_profile_id
    WHERE mp.auth_user_id = p_auth_user_id
      AND mp.desk_role IN ('seller', 'founder')
      AND mp.status = 'active'
      AND pvp.verification_status = 'verified'
      AND pvp.verification_level >= 1
  );
$$;

CREATE OR REPLACE FUNCTION public.begin_person_identity_verification(
  p_desk_role text,
  p_id_document_type text DEFAULT 'passport'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Government ID verification is not used. Complete person verification from your profile instead.';
END;
$$;

GRANT SELECT, UPDATE, INSERT ON public.business_email_launch_tokens TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
