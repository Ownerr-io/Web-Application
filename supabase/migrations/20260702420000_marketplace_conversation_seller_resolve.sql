-- Resolve seller profile for listings (seller_listings link, founder profile, or auto-create)
-- and bootstrap buyer↔founder conversations when expressing interest.

BEGIN;

CREATE OR REPLACE FUNCTION public.marketplace_resolve_seller_profile_for_startup(p_startup_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller uuid;
  v_founder uuid;
  v_email text;
  v_name text;
BEGIN
  IF p_startup_id IS NULL THEN
    RAISE EXCEPTION 'Startup id required';
  END IF;

  SELECT sl.seller_profile_id INTO v_seller
  FROM public.seller_listings sl
  WHERE sl.startup_id = p_startup_id
  ORDER BY sl.updated_at DESC NULLS LAST
  LIMIT 1;
  IF v_seller IS NOT NULL THEN
    RETURN v_seller;
  END IF;

  SELECT s.founder_user_id INTO v_founder
  FROM public.startups s
  WHERE s.id = p_startup_id;
  IF v_founder IS NULL THEN
    RAISE EXCEPTION 'Startup not found';
  END IF;

  SELECT mp.id INTO v_seller
  FROM public.marketplace_profiles mp
  WHERE mp.auth_user_id = v_founder
    AND mp.desk_role IN ('seller', 'founder')
    AND mp.status = 'active'
  ORDER BY
    CASE mp.desk_role WHEN 'seller' THEN 0 WHEN 'founder' THEN 1 ELSE 2 END,
    mp.updated_at DESC NULLS LAST
  LIMIT 1;
  IF v_seller IS NOT NULL THEN
    INSERT INTO public.seller_listings (startup_id, seller_profile_id, status)
    VALUES (p_startup_id, v_seller, 'active')
    ON CONFLICT (startup_id, seller_profile_id) DO NOTHING;
    RETURN v_seller;
  END IF;

  SELECT u.email,
    coalesce(
      u.raw_user_meta_data ->> 'full_name',
      u.raw_user_meta_data ->> 'name',
      split_part(u.email, '@', 1)
    )
  INTO v_email, v_name
  FROM auth.users u
  WHERE u.id = v_founder;

  INSERT INTO public.marketplace_profiles (auth_user_id, desk_role, status, metadata)
  VALUES (
    v_founder,
    'seller',
    'active',
    jsonb_build_object(
      'email', v_email,
      'display_name', coalesce(v_name, 'Seller')
    )
  )
  ON CONFLICT ON CONSTRAINT marketplace_profiles_auth_user_desk_role_key
  DO UPDATE SET status = 'active', updated_at = now()
  RETURNING id INTO v_seller;

  IF v_seller IS NULL THEN
    SELECT mp.id INTO v_seller
    FROM public.marketplace_profiles mp
    WHERE mp.auth_user_id = v_founder AND mp.desk_role = 'seller'
    LIMIT 1;
  END IF;

  IF v_seller IS NULL THEN
    RAISE EXCEPTION 'Could not resolve seller profile for listing';
  END IF;

  INSERT INTO public.seller_listings (startup_id, seller_profile_id, status)
  VALUES (p_startup_id, v_seller, 'active')
  ON CONFLICT (startup_id, seller_profile_id) DO NOTHING;

  RETURN v_seller;
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_bootstrap_conversation(
  p_startup_slug text,
  p_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_startup_id uuid;
  v_buyer_profile_id uuid;
  v_seller_profile_id uuid;
  v_conversation_id uuid;
  v_body text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT s.id INTO v_startup_id
  FROM public.startups s
  WHERE s.slug = lower(trim(p_startup_slug));
  IF v_startup_id IS NULL THEN
    RAISE EXCEPTION 'Startup not found';
  END IF;

  SELECT mp.id INTO v_buyer_profile_id
  FROM public.marketplace_profiles mp
  WHERE mp.auth_user_id = auth.uid()
    AND mp.desk_role = 'buyer'
    AND mp.status = 'active'
  LIMIT 1;
  IF v_buyer_profile_id IS NULL THEN
    RAISE EXCEPTION 'Buyer profile required';
  END IF;

  v_seller_profile_id := public.marketplace_resolve_seller_profile_for_startup(v_startup_id);

  SELECT c.id INTO v_conversation_id
  FROM public.conversations c
  WHERE c.startup_id = v_startup_id
    AND c.buyer_profile_id = v_buyer_profile_id
    AND c.seller_profile_id = v_seller_profile_id;

  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (startup_id, buyer_profile_id, seller_profile_id, status)
    VALUES (v_startup_id, v_buyer_profile_id, v_seller_profile_id, 'open')
    RETURNING id INTO v_conversation_id;
  END IF;

  v_body := nullif(trim(coalesce(p_message, '')), '');
  IF v_body IS NOT NULL THEN
    INSERT INTO public.messages (conversation_id, sender_user_id, body)
    SELECT v_conversation_id, auth.uid(), v_body
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.messages m
      WHERE m.conversation_id = v_conversation_id
        AND m.sender_user_id = auth.uid()
        AND m.body = v_body
    );
  END IF;

  RETURN v_conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_repair_buyer_interest_conversations()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_slug text;
  v_count int := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  FOR v_row IN
    SELECT si.message, st.slug
    FROM public.startup_interests si
    JOIN public.marketplace_profiles bp ON bp.id = si.buyer_profile_id
    JOIN public.startups st ON st.id = si.startup_id
    LEFT JOIN public.conversations c
      ON c.startup_id = si.startup_id AND c.buyer_profile_id = si.buyer_profile_id
    WHERE bp.auth_user_id = auth.uid()
      AND si.status <> 'withdrawn'
      AND c.id IS NULL
      AND length(trim(coalesce(si.message, ''))) >= 1
  LOOP
    v_slug := v_row.slug;
    PERFORM public.marketplace_bootstrap_conversation(v_slug, v_row.message);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketplace_resolve_seller_profile_for_startup(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_bootstrap_conversation(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_repair_buyer_interest_conversations() TO authenticated;

DROP POLICY IF EXISTS conversations_select_founder_listing ON public.conversations;
CREATE POLICY conversations_select_founder_listing
  ON public.conversations FOR SELECT TO authenticated
  USING (
    startup_id IN (
      SELECT s.id FROM public.startups s WHERE s.founder_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS messages_select_founder_listing ON public.messages;
CREATE POLICY messages_select_founder_listing
  ON public.messages FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT c.id
      FROM public.conversations c
      JOIN public.startups s ON s.id = c.startup_id
      WHERE s.founder_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS messages_insert_founder_listing ON public.messages;
CREATE POLICY messages_insert_founder_listing
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_user_id = auth.uid()
    AND conversation_id IN (
      SELECT c.id
      FROM public.conversations c
      JOIN public.startups s ON s.id = c.startup_id
      WHERE s.founder_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS messages_update_founder_listing ON public.messages;
CREATE POLICY messages_update_founder_listing
  ON public.messages FOR UPDATE TO authenticated
  USING (
    conversation_id IN (
      SELECT c.id
      FROM public.conversations c
      JOIN public.startups s ON s.id = c.startup_id
      WHERE s.founder_user_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
