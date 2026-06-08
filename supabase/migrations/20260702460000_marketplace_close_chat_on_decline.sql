-- Read-only messaging after seller declines an offer: close thread + block new messages at RLS.

CREATE OR REPLACE FUNCTION public.marketplace_decline_offer(
  p_bid_id uuid,
  p_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bid public.bids%ROWTYPE;
  v_buyer_user uuid;
  v_startup_title text;
BEGIN
  SELECT * INTO v_bid FROM public.bids WHERE id = p_bid_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found'; END IF;
  PERFORM public._marketplace_assert_seller_startup(v_bid.startup_id);

  UPDATE public.bids
  SET status = 'declined', message = coalesce(nullif(trim(p_message), ''), message), updated_at = now()
  WHERE id = p_bid_id;

  SELECT mp.auth_user_id INTO v_buyer_user
  FROM public.marketplace_profiles mp WHERE mp.id = v_bid.buyer_profile_id;

  SELECT s.title INTO v_startup_title FROM public.startups s WHERE s.id = v_bid.startup_id;

  UPDATE public.startup_interests si
  SET status = 'closed', updated_at = now()
  WHERE si.startup_id = v_bid.startup_id
    AND si.buyer_profile_id = v_bid.buyer_profile_id;

  UPDATE public.conversations c
  SET status = 'closed'
  WHERE c.startup_id = v_bid.startup_id
    AND c.buyer_profile_id = v_bid.buyer_profile_id
    AND c.status = 'open';

  IF v_bid.conversation_id IS NOT NULL THEN
    UPDATE public.conversations
    SET status = 'closed'
    WHERE id = v_bid.conversation_id AND status = 'open';
  END IF;

  PERFORM public._marketplace_emit_offer_event(
    p_bid_id,
    v_bid.startup_id,
    v_buyer_user,
    'offer_declined',
    jsonb_build_object(
      'amount', v_bid.amount,
      'currency', v_bid.currency,
      'startup_title', coalesce(v_startup_title, '')
    )
  );

  RETURN p_bid_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_submit_offer(
  p_startup_slug text,
  p_amount numeric,
  p_currency text DEFAULT 'USD',
  p_message text DEFAULT NULL,
  p_proof_of_funds text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL,
  p_conversation_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer uuid;
  v_startup record;
  v_bid_id uuid;
  v_founder uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid offer amount';
  END IF;

  v_buyer := public._marketplace_buyer_profile_id();
  IF v_buyer IS NULL THEN
    RAISE EXCEPTION 'Buyer profile required';
  END IF;

  SELECT s.id, s.founder_user_id, s.offers_open, s.title
  INTO v_startup
  FROM public.startups s
  WHERE s.slug = lower(trim(p_startup_slug));

  IF v_startup.id IS NULL THEN
    RAISE EXCEPTION 'Startup not found';
  END IF;
  IF NOT coalesce(v_startup.offers_open, true) THEN
    RAISE EXCEPTION 'This listing is not accepting new offers';
  END IF;

  UPDATE public.conversations c
  SET status = 'open'
  WHERE c.startup_id = v_startup.id
    AND c.buyer_profile_id = v_buyer
    AND c.status = 'closed';

  IF p_conversation_id IS NOT NULL THEN
    UPDATE public.conversations
    SET status = 'open'
    WHERE id = p_conversation_id AND status = 'closed';
  END IF;

  INSERT INTO public.bids (
    startup_id, buyer_profile_id, amount, currency, status, message,
    proof_of_funds, expires_at, conversation_id, last_actor_role
  ) VALUES (
    v_startup.id, v_buyer, p_amount, coalesce(nullif(trim(p_currency), ''), 'USD'),
    'submitted', nullif(trim(p_message), ''),
    nullif(trim(p_proof_of_funds), ''), p_expires_at, p_conversation_id, 'buyer'
  )
  RETURNING id INTO v_bid_id;

  PERFORM public._marketplace_append_bid_version(
    v_bid_id, 'buyer', p_amount, coalesce(nullif(trim(p_currency), ''), 'USD'),
    nullif(trim(p_message), ''), nullif(trim(p_proof_of_funds), '')
  );

  v_founder := v_startup.founder_user_id;
  PERFORM public._marketplace_emit_offer_event(
    v_bid_id, v_startup.id, v_founder, 'new_offer',
    jsonb_build_object('amount', p_amount, 'currency', p_currency, 'startup_title', v_startup.title)
  );

  RETURN v_bid_id;
END;
$$;

DROP POLICY IF EXISTS messages_insert_participants ON public.messages;
CREATE POLICY messages_insert_participants ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_user_id = auth.uid()
    AND conversation_id IN (
      SELECT c.id
      FROM public.conversations c
      JOIN public.marketplace_profiles mp ON mp.auth_user_id = auth.uid()
      WHERE (mp.id = c.buyer_profile_id OR mp.id = c.seller_profile_id)
        AND c.status = 'open'
    )
  );

DROP POLICY IF EXISTS messages_insert_founder_listing ON public.messages;
CREATE POLICY messages_insert_founder_listing ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_user_id = auth.uid()
    AND conversation_id IN (
      SELECT c.id
      FROM public.conversations c
      JOIN public.startups s ON s.id = c.startup_id
      WHERE s.founder_user_id = auth.uid()
        AND c.status = 'open'
    )
  );

GRANT EXECUTE ON FUNCTION public.marketplace_decline_offer(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_submit_offer(text, numeric, text, text, text, timestamptz, uuid) TO authenticated;

-- Backfill: threads for already-declined offers should be read-only.
UPDATE public.conversations c
SET status = 'closed'
FROM public.bids b
WHERE b.status IN ('declined', 'rejected')
  AND c.startup_id = b.startup_id
  AND c.buyer_profile_id = b.buyer_profile_id
  AND c.status = 'open';
