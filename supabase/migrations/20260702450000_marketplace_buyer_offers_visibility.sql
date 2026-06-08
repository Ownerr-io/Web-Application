-- Buyer offer visibility: list by auth user (not only active buyer desk row),
-- sync interest on decline, richer decline notifications.

CREATE OR REPLACE FUNCTION public.marketplace_list_offers_buyer()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT coalesce(jsonb_agg(row ORDER BY (row->>'updatedAt') DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', b.id,
      'startupId', b.startup_id,
      'startupSlug', s.slug,
      'startupTitle', s.title,
      'amount', b.amount,
      'currency', b.currency,
      'status', CASE WHEN b.status = 'rejected' THEN 'declined' ELSE b.status END,
      'message', b.message,
      'proofOfFunds', b.proof_of_funds,
      'expiresAt', b.expires_at,
      'conversationId', b.conversation_id,
      'acquisitionStage', coalesce(ad.stage, b.acquisition_stage),
      'lastActorRole', b.last_actor_role,
      'createdAt', b.created_at,
      'updatedAt', b.updated_at,
      'acceptedAt', b.accepted_at,
      'trustScore', ts.score,
      'listingLifecycle', s.listing_lifecycle,
      'offersOpen', s.offers_open
    ) AS row
    FROM public.bids b
    JOIN public.startups s ON s.id = b.startup_id
    JOIN public.marketplace_profiles mp ON mp.id = b.buyer_profile_id
    LEFT JOIN public.acquisition_deals ad ON ad.bid_id = b.id
    LEFT JOIN public.trust_scores ts ON ts.startup_id = s.id
    WHERE mp.auth_user_id = auth.uid()
  ) sub;

  RETURN v_result;
END;
$$;

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

-- Align RLS with listing RPC: any marketplace profile owned by the user.
DROP POLICY IF EXISTS bids_select_buyer ON public.bids;
CREATE POLICY bids_select_buyer ON public.bids
  FOR SELECT TO authenticated
  USING (
    buyer_profile_id IN (
      SELECT mp.id FROM public.marketplace_profiles mp
      WHERE mp.auth_user_id = auth.uid()
    )
  );

GRANT EXECUTE ON FUNCTION public.marketplace_list_offers_buyer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_decline_offer(uuid, text) TO authenticated;
