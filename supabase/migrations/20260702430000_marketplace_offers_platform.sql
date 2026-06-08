-- Marketplace Offers & Bids platform (additive, non-breaking)

BEGIN;

-- ---------------------------------------------------------------------------
-- Startups: offer intake + acquisition lifecycle
-- ---------------------------------------------------------------------------
ALTER TABLE public.startups
  ADD COLUMN IF NOT EXISTS offers_open boolean NOT NULL DEFAULT true;

ALTER TABLE public.startups DROP CONSTRAINT IF EXISTS startups_listing_lifecycle_check;
ALTER TABLE public.startups ADD CONSTRAINT startups_listing_lifecycle_check CHECK (
  listing_lifecycle IN (
    'draft',
    'verification_required',
    'verification_in_progress',
    'verification_failed',
    'verification_review',
    'verified',
    'published',
    'suspended',
    'under_contract'
  )
);

-- ---------------------------------------------------------------------------
-- Bids: extend (do not replace)
-- ---------------------------------------------------------------------------
ALTER TABLE public.bids
  ADD COLUMN IF NOT EXISTS proof_of_funds text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversations (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS acquisition_stage text,
  ADD COLUMN IF NOT EXISTS last_actor_role text,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

ALTER TABLE public.bids DROP CONSTRAINT IF EXISTS bids_status_check;
ALTER TABLE public.bids
  ADD CONSTRAINT bids_status_check CHECK (
    status IN (
      'draft',
      'submitted',
      'under_review',
      'countered',
      'accepted',
      'rejected',
      'declined',
      'withdrawn',
      'expired',
      'superseded',
      'closed_due_to_accepted_offer',
      'due_diligence',
      'closed'
    )
  );

ALTER TABLE public.bids DROP CONSTRAINT IF EXISTS bids_acquisition_stage_check;
ALTER TABLE public.bids
  ADD CONSTRAINT bids_acquisition_stage_check CHECK (
    acquisition_stage IS NULL
    OR acquisition_stage IN (
      'accepted',
      'due_diligence',
      'legal_review',
      'asset_transfer',
      'payment_pending',
      'closed'
    )
  );

CREATE INDEX IF NOT EXISTS bids_conversation_id_idx ON public.bids (conversation_id);
CREATE INDEX IF NOT EXISTS bids_expires_at_idx ON public.bids (expires_at);

-- ---------------------------------------------------------------------------
-- Negotiation history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bid_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id uuid NOT NULL REFERENCES public.bids (id) ON DELETE CASCADE,
  version_number int NOT NULL,
  actor_role text NOT NULL CHECK (actor_role IN ('buyer', 'seller', 'system')),
  actor_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  message text,
  proof_of_funds text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bid_versions_unique UNIQUE (bid_id, version_number)
);

CREATE INDEX IF NOT EXISTS bid_versions_bid_id_idx ON public.bid_versions (bid_id, version_number);

-- ---------------------------------------------------------------------------
-- Post-accept acquisition deal (1 active per startup)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.acquisition_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id uuid NOT NULL REFERENCES public.bids (id) ON DELETE CASCADE,
  startup_id uuid NOT NULL REFERENCES public.startups (id) ON DELETE CASCADE,
  buyer_profile_id uuid NOT NULL REFERENCES public.marketplace_profiles (id) ON DELETE CASCADE,
  seller_profile_id uuid NOT NULL REFERENCES public.marketplace_profiles (id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'accepted' CHECK (
    stage IN (
      'accepted',
      'due_diligence',
      'legal_review',
      'asset_transfer',
      'payment_pending',
      'closed'
    )
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT acquisition_deals_startup_unique UNIQUE (startup_id)
);

CREATE INDEX IF NOT EXISTS acquisition_deals_bid_id_idx ON public.acquisition_deals (bid_id);

DROP TRIGGER IF EXISTS acquisition_deals_set_updated_at ON public.acquisition_deals;
CREATE TRIGGER acquisition_deals_set_updated_at
  BEFORE UPDATE ON public.acquisition_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Offer events (notifications / audit)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketplace_offer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id uuid REFERENCES public.bids (id) ON DELETE CASCADE,
  startup_id uuid REFERENCES public.startups (id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketplace_offer_events_recipient_idx
  ON public.marketplace_offer_events (recipient_user_id, created_at DESC);

ALTER TABLE public.bid_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acquisition_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_offer_events ENABLE ROW LEVEL SECURITY;

-- bid_versions: buyer or seller on parent bid
DROP POLICY IF EXISTS bid_versions_participants ON public.bid_versions;
CREATE POLICY bid_versions_participants ON public.bid_versions
  FOR SELECT TO authenticated
  USING (
    bid_id IN (
      SELECT b.id FROM public.bids b
      JOIN public.marketplace_profiles bp ON bp.id = b.buyer_profile_id
      WHERE bp.auth_user_id = auth.uid()
      UNION
      SELECT b.id FROM public.bids b
      JOIN public.startups s ON s.id = b.startup_id
      WHERE s.founder_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS bid_versions_admin ON public.bid_versions;
CREATE POLICY bid_versions_admin ON public.bid_versions
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- acquisition_deals
DROP POLICY IF EXISTS acquisition_deals_participants ON public.acquisition_deals;
CREATE POLICY acquisition_deals_participants ON public.acquisition_deals
  FOR SELECT TO authenticated
  USING (
    buyer_profile_id IN (SELECT id FROM public.marketplace_profiles WHERE auth_user_id = auth.uid())
    OR startup_id IN (SELECT id FROM public.startups WHERE founder_user_id = auth.uid())
  );

DROP POLICY IF EXISTS acquisition_deals_admin ON public.acquisition_deals;
CREATE POLICY acquisition_deals_admin ON public.acquisition_deals
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- offer events: recipient only
DROP POLICY IF EXISTS marketplace_offer_events_recipient ON public.marketplace_offer_events;
CREATE POLICY marketplace_offer_events_recipient ON public.marketplace_offer_events
  FOR SELECT TO authenticated
  USING (recipient_user_id = auth.uid());

DROP POLICY IF EXISTS marketplace_offer_events_admin ON public.marketplace_offer_events;
CREATE POLICY marketplace_offer_events_admin ON public.marketplace_offer_events
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- sync_listing_lifecycle: preserve under_contract
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_listing_lifecycle(p_startup_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g public.listing_verification_gates%ROWTYPE;
  v_lifecycle text;
  v_failed boolean;
  v_current text;
BEGIN
  PERFORM public.ensure_listing_gates_row(p_startup_id);
  SELECT * INTO g FROM public.listing_verification_gates WHERE startup_id = p_startup_id;
  SELECT listing_lifecycle INTO v_current FROM public.startups WHERE id = p_startup_id;

  IF v_current = 'suspended' THEN
    RETURN 'suspended';
  END IF;

  IF v_current = 'under_contract' THEN
    RETURN 'under_contract';
  END IF;

  IF v_current = 'published' THEN
    IF public.listing_fraud_blocks_publish(g.fraud_risk)
       OR NOT public.listing_mandatory_gates_pass(p_startup_id) THEN
      PERFORM public.unpublish_listing_internal(p_startup_id, 'mandatory_gates_lapsed');
      v_current := 'verification_required';
    ELSE
      RETURN 'published';
    END IF;
  END IF;

  v_failed := g.identity_status = 'failed'
    OR g.domain_status = 'failed'
    OR g.revenue_status = 'failed'
    OR g.business_email_status = 'failed';

  IF v_failed THEN
    v_lifecycle := 'verification_failed';
  ELSIF public.listing_mandatory_gates_pass(p_startup_id) THEN
    v_lifecycle := 'verified';
  ELSIF g.submitted_for_review_at IS NOT NULL
    OR g.identity_status = 'pending'
    OR g.domain_status = 'pending'
    OR g.business_email_status = 'pending'
    OR g.revenue_status IN ('pending', 'partial') THEN
    v_lifecycle := 'verification_in_progress';
  ELSE
    v_lifecycle := COALESCE(NULLIF(v_current, 'published'), 'draft');
  END IF;

  PERFORM public.ownerr_bypass_startup_guard();
  UPDATE public.startups SET listing_lifecycle = v_lifecycle, updated_at = now()
  WHERE id = p_startup_id;

  RETURN v_lifecycle;
END;
$$;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._marketplace_buyer_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.marketplace_profiles
  WHERE auth_user_id = auth.uid() AND desk_role = 'buyer' AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public._marketplace_assert_seller_startup(p_startup_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.startups s WHERE s.id = p_startup_id AND s.founder_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized for this listing';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public._marketplace_emit_offer_event(
  p_bid_id uuid,
  p_startup_id uuid,
  p_recipient uuid,
  p_event_type text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_recipient IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.marketplace_offer_events (bid_id, startup_id, recipient_user_id, event_type, payload)
  VALUES (p_bid_id, p_startup_id, p_recipient, p_event_type, coalesce(p_payload, '{}'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public._marketplace_append_bid_version(
  p_bid_id uuid,
  p_actor_role text,
  p_amount numeric,
  p_currency text,
  p_message text,
  p_proof_of_funds text
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next int;
BEGIN
  SELECT coalesce(max(version_number), 0) + 1 INTO v_next
  FROM public.bid_versions WHERE bid_id = p_bid_id;

  INSERT INTO public.bid_versions (
    bid_id, version_number, actor_role, actor_user_id, amount, currency, message, proof_of_funds
  ) VALUES (
    p_bid_id, v_next, p_actor_role, auth.uid(), p_amount, p_currency, p_message, p_proof_of_funds
  );

  RETURN v_next;
END;
$$;

-- ---------------------------------------------------------------------------
-- Submit offer (buyer)
-- ---------------------------------------------------------------------------
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

-- Counter (seller or buyer on active bid)
CREATE OR REPLACE FUNCTION public.marketplace_counter_offer(
  p_bid_id uuid,
  p_amount numeric,
  p_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bid public.bids%ROWTYPE;
  v_actor text;
  v_buyer_user uuid;
  v_founder uuid;
  v_recipient uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;

  SELECT * INTO v_bid FROM public.bids WHERE id = p_bid_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found'; END IF;

  IF v_bid.status IN ('accepted', 'withdrawn', 'declined', 'rejected', 'expired', 'superseded', 'closed_due_to_accepted_offer', 'closed') THEN
    RAISE EXCEPTION 'Offer is no longer negotiable';
  END IF;

  SELECT mp.auth_user_id INTO v_buyer_user
  FROM public.marketplace_profiles mp WHERE mp.id = v_bid.buyer_profile_id;

  SELECT s.founder_user_id INTO v_founder FROM public.startups s WHERE s.id = v_bid.startup_id;

  IF auth.uid() = v_founder THEN
    v_actor := 'seller';
    v_recipient := v_buyer_user;
    PERFORM public._marketplace_assert_seller_startup(v_bid.startup_id);
  ELSIF auth.uid() = v_buyer_user THEN
    v_actor := 'buyer';
    v_recipient := v_founder;
  ELSE
    RAISE EXCEPTION 'Not authorized';
  END IF;

  PERFORM public._marketplace_append_bid_version(
    p_bid_id, v_actor, p_amount, v_bid.currency, nullif(trim(p_message), ''), v_bid.proof_of_funds
  );

  UPDATE public.bids
  SET amount = p_amount,
      message = coalesce(nullif(trim(p_message), ''), message),
      status = 'countered',
      last_actor_role = v_actor,
      updated_at = now()
  WHERE id = p_bid_id;

  PERFORM public._marketplace_emit_offer_event(
    p_bid_id, v_bid.startup_id, v_recipient, 'counter_offer',
    jsonb_build_object('amount', p_amount, 'actor', v_actor)
  );

  RETURN p_bid_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_accept_counter(p_bid_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bid public.bids%ROWTYPE;
  v_buyer_user uuid;
  v_founder uuid;
BEGIN
  SELECT b.* INTO v_bid FROM public.bids b WHERE b.id = p_bid_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found'; END IF;

  SELECT mp.auth_user_id INTO v_buyer_user FROM public.marketplace_profiles mp WHERE mp.id = v_bid.buyer_profile_id;
  IF auth.uid() <> v_buyer_user THEN RAISE EXCEPTION 'Buyer only'; END IF;
  IF v_bid.status <> 'countered' OR v_bid.last_actor_role <> 'seller' THEN
    RAISE EXCEPTION 'No seller counter to accept';
  END IF;

  UPDATE public.bids SET status = 'under_review', updated_at = now() WHERE id = p_bid_id;

  SELECT s.founder_user_id INTO v_founder FROM public.startups s WHERE s.id = v_bid.startup_id;
  PERFORM public._marketplace_emit_offer_event(
    p_bid_id, v_bid.startup_id, v_founder, 'counter_accepted', jsonb_build_object('amount', v_bid.amount)
  );

  RETURN p_bid_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_accept_offer(p_bid_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bid public.bids%ROWTYPE;
  v_startup record;
  v_buyer_user uuid;
  v_seller_profile uuid;
BEGIN
  SELECT b.* INTO v_bid FROM public.bids b WHERE b.id = p_bid_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found'; END IF;

  PERFORM public._marketplace_assert_seller_startup(v_bid.startup_id);

  IF v_bid.status NOT IN ('submitted', 'under_review', 'countered') THEN
    RAISE EXCEPTION 'Offer cannot be accepted in status %', v_bid.status;
  END IF;

  SELECT s.id, s.founder_user_id INTO v_startup FROM public.startups s WHERE s.id = v_bid.startup_id;

  v_seller_profile := public.marketplace_resolve_seller_profile_for_startup(v_bid.startup_id);

  UPDATE public.bids
  SET status = 'accepted',
      acquisition_stage = 'accepted',
      accepted_at = now(),
      updated_at = now()
  WHERE id = p_bid_id;

  UPDATE public.bids
  SET status = 'superseded', updated_at = now()
  WHERE startup_id = v_bid.startup_id
    AND id <> p_bid_id
    AND status IN ('submitted', 'under_review', 'countered', 'draft');

  UPDATE public.bids
  SET status = 'closed_due_to_accepted_offer', updated_at = now()
  WHERE startup_id = v_bid.startup_id
    AND id <> p_bid_id
    AND status NOT IN ('withdrawn', 'declined', 'rejected', 'expired', 'accepted', 'superseded', 'closed');

  UPDATE public.startups
  SET listing_lifecycle = 'under_contract', offers_open = false, updated_at = now()
  WHERE id = v_bid.startup_id;

  INSERT INTO public.acquisition_deals (bid_id, startup_id, buyer_profile_id, seller_profile_id, stage)
  VALUES (p_bid_id, v_bid.startup_id, v_bid.buyer_profile_id, v_seller_profile, 'accepted')
  ON CONFLICT (startup_id) DO UPDATE
  SET bid_id = EXCLUDED.bid_id, stage = 'accepted', updated_at = now();

  SELECT mp.auth_user_id INTO v_buyer_user FROM public.marketplace_profiles mp WHERE mp.id = v_bid.buyer_profile_id;

  PERFORM public._marketplace_emit_offer_event(
    p_bid_id, v_bid.startup_id, v_buyer_user, 'offer_accepted',
    jsonb_build_object('amount', v_bid.amount)
  );

  PERFORM public._marketplace_emit_offer_event(
    p_bid_id, v_bid.startup_id, v_buyer_user, 'due_diligence_started', '{}'::jsonb
  );

  RETURN p_bid_id;
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
BEGIN
  SELECT * INTO v_bid FROM public.bids WHERE id = p_bid_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found'; END IF;
  PERFORM public._marketplace_assert_seller_startup(v_bid.startup_id);

  UPDATE public.bids
  SET status = 'declined', message = coalesce(nullif(trim(p_message), ''), message), updated_at = now()
  WHERE id = p_bid_id;

  SELECT mp.auth_user_id INTO v_buyer_user FROM public.marketplace_profiles mp WHERE mp.id = v_bid.buyer_profile_id;
  PERFORM public._marketplace_emit_offer_event(
    p_bid_id, v_bid.startup_id, v_buyer_user, 'offer_declined', '{}'::jsonb
  );

  RETURN p_bid_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_withdraw_offer(p_bid_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bid public.bids%ROWTYPE;
  v_buyer_user uuid;
  v_founder uuid;
BEGIN
  SELECT * INTO v_bid FROM public.bids WHERE id = p_bid_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found'; END IF;

  SELECT mp.auth_user_id INTO v_buyer_user FROM public.marketplace_profiles mp WHERE mp.id = v_bid.buyer_profile_id;
  IF auth.uid() <> v_buyer_user THEN RAISE EXCEPTION 'Buyer only'; END IF;

  UPDATE public.bids SET status = 'withdrawn', updated_at = now() WHERE id = p_bid_id;

  SELECT s.founder_user_id INTO v_founder FROM public.startups s WHERE s.id = v_bid.startup_id;
  PERFORM public._marketplace_emit_offer_event(
    p_bid_id, v_bid.startup_id, v_founder, 'offer_withdrawn', '{}'::jsonb
  );

  RETURN p_bid_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_advance_acquisition_stage(
  p_bid_id uuid,
  p_stage text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bid public.bids%ROWTYPE;
  v_buyer_user uuid;
  v_founder uuid;
BEGIN
  IF p_stage NOT IN ('due_diligence', 'legal_review', 'asset_transfer', 'payment_pending', 'closed') THEN
    RAISE EXCEPTION 'Invalid stage';
  END IF;

  SELECT * INTO v_bid FROM public.bids WHERE id = p_bid_id FOR UPDATE;
  IF NOT FOUND OR v_bid.status <> 'accepted' THEN
    RAISE EXCEPTION 'Accepted offer required';
  END IF;

  SELECT mp.auth_user_id INTO v_buyer_user FROM public.marketplace_profiles mp WHERE mp.id = v_bid.buyer_profile_id;
  SELECT s.founder_user_id INTO v_founder FROM public.startups s WHERE s.id = v_bid.startup_id;

  IF auth.uid() <> v_founder AND auth.uid() <> v_buyer_user THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.bids SET acquisition_stage = p_stage, updated_at = now() WHERE id = p_bid_id;
  UPDATE public.acquisition_deals SET stage = p_stage, updated_at = now() WHERE bid_id = p_bid_id;

  IF p_stage = 'closed' THEN
    UPDATE public.bids SET status = 'closed' WHERE id = p_bid_id;
    PERFORM public._marketplace_emit_offer_event(
      p_bid_id, v_bid.startup_id, v_buyer_user, 'deal_closed', '{}'::jsonb
    );
    PERFORM public._marketplace_emit_offer_event(
      p_bid_id, v_bid.startup_id, v_founder, 'deal_closed', '{}'::jsonb
    );
  END IF;

  RETURN p_bid_id;
END;
$$;

-- JSON list helpers
CREATE OR REPLACE FUNCTION public.marketplace_list_offers_buyer()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer uuid;
  v_result jsonb;
BEGIN
  v_buyer := public._marketplace_buyer_profile_id();
  IF v_buyer IS NULL THEN RETURN '[]'::jsonb; END IF;

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
    LEFT JOIN public.acquisition_deals ad ON ad.bid_id = b.id
    LEFT JOIN public.trust_scores ts ON ts.startup_id = s.id
    WHERE b.buyer_profile_id = v_buyer
  ) sub;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_list_offers_seller()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RETURN '[]'::jsonb; END IF;

  SELECT coalesce(jsonb_agg(g ORDER BY (g->>'latestActivity') DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'startupId', s.id,
      'startupSlug', s.slug,
      'startupTitle', s.title,
      'listingLifecycle', s.listing_lifecycle,
      'offersOpen', s.offers_open,
      'offerCount', count(b.*),
      'highestOffer', max(b.amount) FILTER (WHERE b.status IN ('submitted','under_review','countered')),
      'latestActivity', max(b.updated_at),
      'offers', (
        SELECT coalesce(jsonb_agg(
          jsonb_build_object(
            'id', b2.id,
            'buyerName', coalesce(mp.metadata->>'display_name', 'Buyer'),
            'buyerAuthUserId', mp.auth_user_id,
            'amount', b2.amount,
            'currency', b2.currency,
            'status', CASE WHEN b2.status = 'rejected' THEN 'declined' ELSE b2.status END,
            'message', b2.message,
            'proofOfFunds', b2.proof_of_funds,
            'expiresAt', b2.expires_at,
            'conversationId', b2.conversation_id,
            'acquisitionStage', coalesce(ad2.stage, b2.acquisition_stage),
            'lastActorRole', b2.last_actor_role,
            'createdAt', b2.created_at,
            'updatedAt', b2.updated_at,
            'acceptedAt', b2.accepted_at
          ) ORDER BY b2.updated_at DESC
        ), '[]'::jsonb)
        FROM public.bids b2
        JOIN public.marketplace_profiles mp ON mp.id = b2.buyer_profile_id
        LEFT JOIN public.acquisition_deals ad2 ON ad2.bid_id = b2.id
        WHERE b2.startup_id = s.id
      )
    ) AS g
    FROM public.startups s
    LEFT JOIN public.bids b ON b.startup_id = s.id
    WHERE s.founder_user_id = auth.uid()
    GROUP BY s.id, s.slug, s.title, s.listing_lifecycle, s.offers_open
    HAVING count(b.id) > 0
  ) sub;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_get_bid_detail(p_bid_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bid public.bids%ROWTYPE;
  v_buyer_user uuid;
  v_founder uuid;
  v_versions jsonb;
BEGIN
  SELECT * INTO v_bid FROM public.bids WHERE id = p_bid_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT mp.auth_user_id INTO v_buyer_user FROM public.marketplace_profiles mp WHERE mp.id = v_bid.buyer_profile_id;
  SELECT s.founder_user_id INTO v_founder FROM public.startups s WHERE s.id = v_bid.startup_id;

  IF auth.uid() <> v_buyer_user AND auth.uid() <> v_founder AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'versionNumber', bv.version_number,
      'actorRole', bv.actor_role,
      'actorUserId', bv.actor_user_id,
      'amount', bv.amount,
      'currency', bv.currency,
      'message', bv.message,
      'proofOfFunds', bv.proof_of_funds,
      'createdAt', bv.created_at
    ) ORDER BY bv.version_number ASC
  ), '[]'::jsonb)
  INTO v_versions
  FROM public.bid_versions bv WHERE bv.bid_id = p_bid_id;

  RETURN jsonb_build_object(
    'bid', jsonb_build_object(
      'id', v_bid.id,
      'startupId', v_bid.startup_id,
      'amount', v_bid.amount,
      'currency', v_bid.currency,
      'status', CASE WHEN v_bid.status = 'rejected' THEN 'declined' ELSE v_bid.status END,
      'message', v_bid.message,
      'conversationId', v_bid.conversation_id,
      'acquisitionStage', v_bid.acquisition_stage,
      'lastActorRole', v_bid.last_actor_role,
      'createdAt', v_bid.created_at,
      'updatedAt', v_bid.updated_at
    ),
    'versions', v_versions
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_marketplace_offers_dashboard(
  p_status text DEFAULT NULL,
  p_startup_slug text DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows jsonb;
  v_metrics jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT jsonb_build_object(
    'total', count(*),
    'accepted', count(*) FILTER (WHERE b.status = 'accepted'),
    'declined', count(*) FILTER (WHERE b.status IN ('declined', 'rejected')),
    'countered', count(*) FILTER (WHERE b.status = 'countered'),
    'dueDiligence', count(*) FILTER (WHERE coalesce(b.acquisition_stage, ad.stage) = 'due_diligence'),
    'closed', count(*) FILTER (WHERE b.status = 'closed' OR ad.stage = 'closed')
  )
  INTO v_metrics
  FROM public.bids b
  LEFT JOIN public.acquisition_deals ad ON ad.bid_id = b.id
  JOIN public.startups s ON s.id = b.startup_id
  WHERE (p_status IS NULL OR b.status = p_status OR (p_status = 'declined' AND b.status = 'rejected'))
    AND (p_startup_slug IS NULL OR s.slug = lower(trim(p_startup_slug)))
    AND (p_from IS NULL OR b.created_at >= p_from)
    AND (p_to IS NULL OR b.created_at <= p_to);

  SELECT coalesce(jsonb_agg(row ORDER BY (row->>'createdAt') DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id', b.id,
      'startupSlug', s.slug,
      'startupTitle', s.title,
      'sellerEmail', (SELECT u.email FROM auth.users u WHERE u.id = s.founder_user_id),
      'buyerName', coalesce(mp.metadata->>'display_name', mp.metadata->>'email', 'Buyer'),
      'amount', b.amount,
      'currency', b.currency,
      'status', CASE WHEN b.status = 'rejected' THEN 'declined' ELSE b.status END,
      'acquisitionStage', coalesce(ad.stage, b.acquisition_stage),
      'createdAt', b.created_at,
      'updatedAt', b.updated_at
    ) AS row
    FROM public.bids b
    JOIN public.startups s ON s.id = b.startup_id
    JOIN public.marketplace_profiles mp ON mp.id = b.buyer_profile_id
    LEFT JOIN public.acquisition_deals ad ON ad.bid_id = b.id
    WHERE (p_status IS NULL OR b.status = p_status OR (p_status = 'declined' AND b.status = 'rejected'))
      AND (p_startup_slug IS NULL OR s.slug = lower(trim(p_startup_slug)))
      AND (p_from IS NULL OR b.created_at >= p_from)
      AND (p_to IS NULL OR b.created_at <= p_to)
    LIMIT 500
  ) sub;

  RETURN jsonb_build_object('metrics', v_metrics, 'offers', v_rows);
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketplace_submit_offer(text, numeric, text, text, text, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_counter_offer(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_accept_counter(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_accept_offer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_decline_offer(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_withdraw_offer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_advance_acquisition_stage(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_list_offers_buyer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_list_offers_seller() TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_get_bid_detail(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_marketplace_offers_dashboard(text, text, timestamptz, timestamptz) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
