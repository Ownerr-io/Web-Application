-- Resolve or create conversation for a bid so "Open conversation" always lands in chat.

BEGIN;

CREATE OR REPLACE FUNCTION public.marketplace_ensure_conversation_for_bid(p_bid_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bid public.bids%ROWTYPE;
  v_slug text;
  v_buyer_user uuid;
  v_founder uuid;
  v_conv uuid;
  v_seller uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT b.* INTO v_bid FROM public.bids b WHERE b.id = p_bid_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offer not found';
  END IF;

  IF v_bid.conversation_id IS NOT NULL THEN
    RETURN v_bid.conversation_id;
  END IF;

  SELECT mp.auth_user_id INTO v_buyer_user
  FROM public.marketplace_profiles mp
  WHERE mp.id = v_bid.buyer_profile_id;

  SELECT s.founder_user_id, s.slug INTO v_founder, v_slug
  FROM public.startups s
  WHERE s.id = v_bid.startup_id;

  IF auth.uid() <> v_buyer_user AND auth.uid() <> v_founder THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT c.id INTO v_conv
  FROM public.conversations c
  WHERE c.startup_id = v_bid.startup_id
    AND c.buyer_profile_id = v_bid.buyer_profile_id
  LIMIT 1;

  IF v_conv IS NULL THEN
    v_seller := public.marketplace_resolve_seller_profile_for_startup(v_bid.startup_id);
    INSERT INTO public.conversations (startup_id, buyer_profile_id, seller_profile_id, status)
    VALUES (v_bid.startup_id, v_bid.buyer_profile_id, v_seller, 'open')
    RETURNING id INTO v_conv;

    IF coalesce(trim(v_bid.message), '') <> '' AND v_buyer_user IS NOT NULL THEN
      INSERT INTO public.messages (conversation_id, sender_user_id, body)
      SELECT v_conv, v_buyer_user, trim(v_bid.message)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.messages m
        WHERE m.conversation_id = v_conv AND m.body = trim(v_bid.message)
      );
    END IF;
  END IF;

  UPDATE public.bids
  SET conversation_id = v_conv, updated_at = now()
  WHERE id = p_bid_id;

  RETURN v_conv;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketplace_ensure_conversation_for_bid(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
