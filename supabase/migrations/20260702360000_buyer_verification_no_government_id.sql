-- Buyers: profile + LinkedIn only (no government ID / Stripe Identity).

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
  v_is_buyer boolean;
BEGIN
  v_desk := public.marketplace_desk_role_for_person(p_desk_role);
  v_is_buyer := v_desk = 'buyer';

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
    verification_status = CASE
      WHEN verification_status = 'verified' THEN 'verified'
      WHEN v_is_buyer THEN 'verified'
      ELSE 'pending'
    END,
    verification_level = CASE
      WHEN v_is_buyer THEN GREATEST(verification_level, 1)
      ELSE GREATEST(verification_level, 1)
    END,
    verified_at = CASE
      WHEN v_is_buyer THEN COALESCE(verified_at, now())
      ELSE verified_at
    END,
    updated_at = now()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
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
DECLARE
  v_desk text;
BEGIN
  v_desk := public.marketplace_desk_role_for_person(p_desk_role);
  IF v_desk = 'buyer' THEN
    RAISE EXCEPTION 'Government ID verification is not required for buyer profiles';
  END IF;

  -- delegate to existing body: re-run full function from v2 migration logic inline
  -- (call replaced in next statement block)
  RETURN public._begin_person_identity_verification_seller(p_desk_role, p_id_document_type);
END;
$$;

-- Seller-only identity session (extracted from original begin_person_identity_verification)
CREATE OR REPLACE FUNCTION public._begin_person_identity_verification_seller(
  p_desk_role text,
  p_id_document_type text DEFAULT 'passport'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.person_verification_profiles%ROWTYPE;
  v_session_id uuid := gen_random_uuid();
  v_doc text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  v_doc := lower(trim(p_id_document_type));
  IF v_doc NOT IN ('passport', 'national_id', 'driver_license') THEN
    RAISE EXCEPTION 'Invalid document type';
  END IF;

  PERFORM public.submit_person_verification_profile(p_desk_role);
  SELECT pvp.* INTO v_row
  FROM public.person_verification_profiles pvp
  JOIN public.marketplace_profiles mp ON mp.id = pvp.marketplace_profile_id
  WHERE mp.auth_user_id = auth.uid()
    AND mp.desk_role = public.marketplace_desk_role_for_person(p_desk_role);

  UPDATE public.person_verification_profiles SET
    id_document_type = v_doc,
    identity_provider = 'stripe_identity',
    updated_at = now()
  WHERE id = v_row.id;

  INSERT INTO public.identity_verification_sessions (
    id, person_verification_profile_id, auth_user_id, provider, status
  ) VALUES (
    v_session_id, v_row.id, auth.uid(), 'stripe_identity', 'pending'
  );

  RETURN jsonb_build_object(
    'session_id', v_session_id,
    'person_profile_id', v_row.id,
    'provider', 'stripe_identity',
    'status', 'pending'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public._begin_person_identity_verification_seller(text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
