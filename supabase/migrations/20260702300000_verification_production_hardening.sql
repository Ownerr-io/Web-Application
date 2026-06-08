-- Production verification hardening: ownership, buyer protection, auto-unpublish,
-- revalidation, fraud levels, startup column guards, job retries, trust unification.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ownerr_bypass_startup_guard()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('ownerr.bypass_startup_guard', 'on', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.startup_buyer_accessible(p_startup_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.startups s
    WHERE s.id = p_startup_id
      AND s.listing_lifecycle = 'published'
      AND s.visibility = 'public'
      AND s.status = 'published'
  );
$$;

CREATE OR REPLACE FUNCTION public.listing_fraud_blocks_publish(p_fraud_risk text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(p_fraud_risk, 'clear') IN ('high', 'high_risk');
$$;

-- ---------------------------------------------------------------------------
-- Protect sensitive startup columns from direct PostgREST updates
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_startups_protect_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('ownerr.bypass_startup_guard', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF NEW.founder_user_id IS DISTINCT FROM OLD.founder_user_id THEN
    RAISE EXCEPTION 'founder_user_id is immutable via direct update';
  END IF;
  IF NEW.listing_lifecycle IS DISTINCT FROM OLD.listing_lifecycle THEN
    RAISE EXCEPTION 'listing_lifecycle must be changed via verification RPCs';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'status must be changed via verification RPCs';
  END IF;
  IF NEW.visibility IS DISTINCT FROM OLD.visibility THEN
    RAISE EXCEPTION 'visibility must be changed via verification RPCs';
  END IF;
  IF NEW.verified IS DISTINCT FROM OLD.verified THEN
    RAISE EXCEPTION 'verified flag is system-managed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS startups_protect_sensitive_columns ON public.startups;
CREATE TRIGGER startups_protect_sensitive_columns
  BEFORE UPDATE ON public.startups
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_startups_protect_sensitive_columns();

-- ---------------------------------------------------------------------------
-- seller_listings: only founders (or admin) may attach desks to a startup
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS seller_listings_all_seller ON public.seller_listings;

DROP POLICY IF EXISTS seller_listings_select_linked ON public.seller_listings;
CREATE POLICY seller_listings_select_linked ON public.seller_listings
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR seller_profile_id IN (
      SELECT mp.id FROM public.marketplace_profiles mp
      WHERE mp.auth_user_id = auth.uid()
    )
    OR startup_id IN (
      SELECT s.id FROM public.startups s WHERE s.founder_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS seller_listings_insert_founder ON public.seller_listings;
CREATE POLICY seller_listings_insert_founder ON public.seller_listings
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.startups s
      WHERE s.id = startup_id AND s.founder_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS seller_listings_update_founder ON public.seller_listings;
CREATE POLICY seller_listings_update_founder ON public.seller_listings
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.startups s
      WHERE s.id = startup_id AND s.founder_user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.startups s
      WHERE s.id = startup_id AND s.founder_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS seller_listings_delete_founder ON public.seller_listings;
CREATE POLICY seller_listings_delete_founder ON public.seller_listings
  FOR DELETE TO authenticated
  USING (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.startups s
      WHERE s.id = startup_id AND s.founder_user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.founder_link_seller_desk(
  p_startup_id uuid,
  p_seller_profile_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.startups s
    WHERE s.id = p_startup_id AND s.founder_user_id = auth.uid()
  ) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only the listing founder may link seller desks';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.marketplace_profiles mp
    WHERE mp.id = p_seller_profile_id AND mp.desk_role IN ('seller', 'founder')
  ) THEN
    RAISE EXCEPTION 'Invalid seller profile';
  END IF;

  INSERT INTO public.seller_listings (id, startup_id, seller_profile_id, status)
  VALUES (v_id, p_startup_id, p_seller_profile_id, 'draft')
  ON CONFLICT ON CONSTRAINT seller_listings_unique DO UPDATE SET status = 'draft', updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.founder_link_seller_desk(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Public catalog RLS aligned with listing_lifecycle
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS startups_select_public ON public.startups;
CREATE POLICY startups_select_public ON public.startups
  FOR SELECT
  USING (
    visibility = 'public'
    AND status = 'published'
    AND listing_lifecycle = 'published'
  );

DROP POLICY IF EXISTS startup_media_public ON public.startup_media;
CREATE POLICY startup_media_public ON public.startup_media
  FOR SELECT
  USING (public.startup_buyer_accessible(startup_id));

DROP POLICY IF EXISTS startup_metrics_public ON public.startup_metrics;
CREATE POLICY startup_metrics_public ON public.startup_metrics
  FOR SELECT
  USING (public.startup_buyer_accessible(startup_id));

-- ---------------------------------------------------------------------------
-- Buyer protection: interests, bids, conversations
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS startup_interests_insert_buyer ON public.startup_interests;
CREATE POLICY startup_interests_insert_buyer ON public.startup_interests
  FOR INSERT TO authenticated
  WITH CHECK (
    buyer_profile_id IN (
      SELECT mp.id FROM public.marketplace_profiles mp
      WHERE mp.auth_user_id = auth.uid() AND mp.desk_role = 'buyer'
    )
    AND public.startup_buyer_accessible(startup_id)
  );

DROP POLICY IF EXISTS bids_insert_buyer ON public.bids;
CREATE POLICY bids_insert_buyer ON public.bids
  FOR INSERT TO authenticated
  WITH CHECK (
    buyer_profile_id IN (
      SELECT mp.id FROM public.marketplace_profiles mp
      WHERE mp.auth_user_id = auth.uid() AND mp.desk_role = 'buyer'
    )
    AND public.startup_buyer_accessible(startup_id)
  );

DROP POLICY IF EXISTS conversations_insert_participants ON public.conversations;
CREATE POLICY conversations_insert_participants ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.startup_buyer_accessible(startup_id)
    AND (
      buyer_profile_id IN (
        SELECT id FROM public.marketplace_profiles WHERE auth_user_id = auth.uid()
      )
      OR seller_profile_id IN (
        SELECT id FROM public.marketplace_profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Fraud risk levels: clear | low | medium | high (legacy high_risk/warning mapped)
-- ---------------------------------------------------------------------------
UPDATE public.listing_verification_gates SET fraud_risk = 'medium' WHERE fraud_risk = 'warning';
UPDATE public.listing_verification_gates SET fraud_risk = 'high' WHERE fraud_risk = 'high_risk';

ALTER TABLE public.listing_verification_gates DROP CONSTRAINT IF EXISTS listing_verification_gates_fraud_risk_check;
ALTER TABLE public.listing_verification_gates ADD CONSTRAINT listing_verification_gates_fraud_risk_check CHECK (
  fraud_risk IN ('clear', 'low', 'medium', 'high', 'warning', 'high_risk')
);

-- ---------------------------------------------------------------------------
-- Unpublish + guarded publish
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.unpublish_listing_internal(
  p_startup_id uuid,
  p_reason text DEFAULT 'verification_lapsed'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ownerr_bypass_startup_guard();

  UPDATE public.startups SET
    listing_lifecycle = 'verification_required',
    status = 'draft',
    visibility = 'unlisted',
    updated_at = now()
  WHERE id = p_startup_id
    AND listing_lifecycle = 'published';

  PERFORM public.append_audit_log(
    'startup', p_startup_id, 'auto_unpublish', NULL,
    jsonb_build_object('reason', p_reason)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_listing_internal(
  p_startup_id uuid,
  p_actor text DEFAULT 'system'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT listing_lifecycle FROM public.startups WHERE id = p_startup_id) = 'suspended' THEN
    RETURN;
  END IF;

  PERFORM public.ownerr_bypass_startup_guard();

  UPDATE public.startups SET
    listing_lifecycle = 'published',
    status = 'published',
    visibility = 'public',
    updated_at = now()
  WHERE id = p_startup_id;

  UPDATE public.listing_verification_gates SET
    published_at = COALESCE(published_at, now()),
    updated_at = now()
  WHERE startup_id = p_startup_id;

  PERFORM public.append_audit_log('startup', p_startup_id, 'auto_publish', NULL,
    jsonb_build_object('actor', p_actor));
END;
$$;

CREATE OR REPLACE FUNCTION public.try_auto_publish_listing(p_startup_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g public.listing_verification_gates%ROWTYPE;
BEGIN
  SELECT * INTO g FROM public.listing_verification_gates WHERE startup_id = p_startup_id;
  IF NOT FOUND THEN RETURN false; END IF;

  IF public.listing_fraud_blocks_publish(g.fraud_risk) THEN
    RETURN false;
  END IF;

  IF NOT public.listing_mandatory_gates_pass(p_startup_id) THEN
    RETURN false;
  END IF;

  IF (SELECT listing_lifecycle FROM public.startups WHERE id = p_startup_id) = 'published' THEN
    RETURN true;
  END IF;

  PERFORM public.publish_listing_internal(p_startup_id, 'auto_publish');
  RETURN true;
END;
$$;

-- ---------------------------------------------------------------------------
-- Lifecycle: auto-unpublish when mandatory gates fail on published listings
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
    OR g.business_email_status = 'failed'
    OR g.revenue_status = 'failed';

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
-- Expanded fraud engine
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.run_listing_fraud_engine(p_startup_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g public.listing_verification_gates%ROWTYPE;
  s public.startups%ROWTYPE;
  v_risk text := 'clear';
  v_domain text;
  v_email_domain text;
  v_fail_count integer;
  v_prev_mrr numeric;
BEGIN
  SELECT * INTO g FROM public.listing_verification_gates WHERE startup_id = p_startup_id;
  SELECT * INTO s FROM public.startups WHERE id = p_startup_id;
  IF NOT FOUND THEN RETURN 'clear'; END IF;

  DELETE FROM public.listing_fraud_signals
  WHERE startup_id = p_startup_id
    AND signal_type IN (
      'business_email_domain_mismatch',
      'duplicate_verified_domain',
      'duplicate_registration_number',
      'revenue_form_mismatch',
      'registration_ocr_low_confidence',
      'disposable_email_attempt',
      'country_mismatch',
      'verification_churn',
      'repeated_verification_failures',
      'impossible_revenue_jump'
    );

  v_domain := lower(COALESCE(g.verified_domain, ''));
  v_email_domain := lower(split_part(COALESCE(g.business_email, ''), '@', 2));

  IF v_domain <> '' AND v_email_domain <> '' AND v_email_domain <> v_domain THEN
    INSERT INTO public.listing_fraud_signals (startup_id, signal_type, severity, payload)
    VALUES (p_startup_id, 'business_email_domain_mismatch', 'high',
      jsonb_build_object('verified_domain', v_domain, 'email_domain', v_email_domain));
    v_risk := 'high';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.startups s2
    JOIN public.listing_verification_gates g2 ON g2.startup_id = s2.id
    WHERE s2.id <> p_startup_id
      AND g2.verified_domain IS NOT NULL
      AND lower(g2.verified_domain) = v_domain
      AND v_domain <> ''
      AND s2.listing_lifecycle = 'published'
  ) THEN
    INSERT INTO public.listing_fraud_signals (startup_id, signal_type, severity, payload)
    VALUES (p_startup_id, 'duplicate_verified_domain', 'medium', jsonb_build_object('domain', v_domain));
    v_risk := CASE WHEN v_risk = 'high' THEN v_risk ELSE 'medium' END;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.business_registration_documents d
    JOIN public.business_registration_documents d2
      ON d2.extracted_registration_number = d.extracted_registration_number
    WHERE d.startup_id = p_startup_id
      AND d.extracted_registration_number IS NOT NULL
      AND d2.startup_id <> p_startup_id
  ) THEN
    INSERT INTO public.listing_fraud_signals (startup_id, signal_type, severity, payload)
    VALUES (p_startup_id, 'duplicate_registration_number', 'high', '{}'::jsonb);
    v_risk := 'high';
  END IF;

  IF g.verified_mrr IS NOT NULL AND s.annual_revenue IS NOT NULL AND g.verified_mrr > 0 THEN
    IF abs(g.verified_mrr - (s.annual_revenue / 12.0)) / g.verified_mrr > 0.5 THEN
      INSERT INTO public.listing_fraud_signals (startup_id, signal_type, severity, payload)
      VALUES (p_startup_id, 'revenue_form_mismatch', 'medium',
        jsonb_build_object('verified_mrr', g.verified_mrr, 'form_implied_mrr', s.annual_revenue / 12.0));
      v_risk := CASE WHEN v_risk = 'high' THEN v_risk ELSE 'medium' END;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.business_email_verifications be
    JOIN public.platform_disposable_email_domains d ON d.domain = be.email_domain
    WHERE be.startup_id = p_startup_id
      AND be.created_at > now() - interval '30 days'
  ) THEN
    INSERT INTO public.listing_fraud_signals (startup_id, signal_type, severity, payload)
    VALUES (p_startup_id, 'disposable_email_attempt', 'high', '{}'::jsonb);
    v_risk := 'high';
  END IF;

  IF g.verified_domain IS NOT NULL AND s.metadata ? 'incorporation_country' THEN
    IF lower(COALESCE(s.metadata->>'incorporation_country', '')) <> ''
       AND NOT EXISTS (
         SELECT 1 FROM public.business_registration_documents d
         WHERE d.startup_id = p_startup_id
           AND d.extracted_country IS NOT NULL
           AND lower(d.extracted_country) = lower(s.metadata->>'incorporation_country')
       )
       AND EXISTS (
         SELECT 1 FROM public.business_registration_documents d
         WHERE d.startup_id = p_startup_id AND d.extracted_country IS NOT NULL
       ) THEN
      INSERT INTO public.listing_fraud_signals (startup_id, signal_type, severity, payload)
      VALUES (p_startup_id, 'country_mismatch', 'medium', jsonb_build_object('metadata_country', s.metadata->>'incorporation_country'));
      v_risk := CASE WHEN v_risk = 'high' THEN v_risk ELSE 'medium' END;
    END IF;
  END IF;

  SELECT count(*) INTO v_fail_count
  FROM public.verification_results r
  WHERE r.startup_id = p_startup_id
    AND r.status = 'fail'
    AND r.computed_at > now() - interval '7 days';

  IF v_fail_count >= 5 THEN
    INSERT INTO public.listing_fraud_signals (startup_id, signal_type, severity, payload)
    VALUES (p_startup_id, 'repeated_verification_failures', 'medium', jsonb_build_object('fail_count_7d', v_fail_count));
    v_risk := CASE WHEN v_risk = 'high' THEN v_risk ELSE 'medium' END;
  END IF;

  IF (
    SELECT count(*) FROM public.business_email_verifications be
    WHERE be.startup_id = p_startup_id AND be.created_at > now() - interval '14 days'
  ) >= 4 THEN
    INSERT INTO public.listing_fraud_signals (startup_id, signal_type, severity, payload)
    VALUES (p_startup_id, 'verification_churn', 'low', jsonb_build_object('window', '14d'));
    v_risk := CASE WHEN v_risk IN ('high', 'medium') THEN v_risk ELSE 'low' END;
  END IF;

  SELECT COALESCE(SUM(m.mrr), 0) INTO v_prev_mrr
  FROM public.financial_metrics m
  WHERE m.startup_id = p_startup_id
    AND m.period_start = (
      SELECT MAX(m2.period_start)
      FROM public.financial_metrics m2
      WHERE m2.startup_id = p_startup_id
        AND m2.period_start < date_trunc('month', current_date)::date
    );

  IF v_prev_mrr IS NOT NULL AND g.verified_mrr IS NOT NULL AND v_prev_mrr > 0 THEN
    IF g.verified_mrr / v_prev_mrr > 5 OR v_prev_mrr / NULLIF(g.verified_mrr, 0) > 5 THEN
      INSERT INTO public.listing_fraud_signals (startup_id, signal_type, severity, payload)
      VALUES (p_startup_id, 'impossible_revenue_jump', 'medium',
        jsonb_build_object('previous_mrr', v_prev_mrr, 'current_mrr', g.verified_mrr));
      v_risk := CASE WHEN v_risk = 'high' THEN v_risk ELSE 'medium' END;
    END IF;
  END IF;

  UPDATE public.listing_verification_gates SET fraud_risk = v_risk, updated_at = now()
  WHERE startup_id = p_startup_id;

  IF v_risk IN ('medium', 'high', 'warning', 'high_risk') THEN
    INSERT INTO public.admin_listing_reviews (startup_id, review_type, status, notes)
    SELECT p_startup_id, 'fraud', 'open', 'Automated fraud engine: ' || v_risk
    WHERE NOT EXISTS (
      SELECT 1 FROM public.admin_listing_reviews
      WHERE startup_id = p_startup_id AND review_type = 'fraud' AND status IN ('open', 'in_progress')
    );
  END IF;

  RETURN v_risk;
END;
$$;

-- ---------------------------------------------------------------------------
-- Gate refresh: evidence expiry, active revenue connection, clear stale MRR
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_listing_gates_from_evidence(p_startup_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain_pass boolean := false;
  v_domain_pending boolean := false;
  v_latest_domain_status text;
  v_rev_pass boolean := false;
  v_mrr numeric := 0;
  v_arr numeric := 0;
  v_domain text;
  v_identity public.identity_verification_sessions%ROWTYPE;
  v_email public.business_email_verifications%ROWTYPE;
  v_reg_approved boolean := false;
  v_revenue_connection_active boolean := false;
  v_identity_verified boolean := false;
  v_email_verified boolean := false;
BEGIN
  PERFORM public.ensure_listing_gates_row(p_startup_id);

  SELECT EXISTS (
    SELECT 1 FROM public.verification_results r
    WHERE r.startup_id = p_startup_id AND r.dimension = 'domain'
      AND r.status = 'pass'
      AND (r.valid_until IS NULL OR r.valid_until > now())
  ) AND NOT EXISTS (
    SELECT 1 FROM public.domain_verification_challenges c
    WHERE c.startup_id = p_startup_id
      AND c.status = 'pending'
      AND c.expires_at <= now()
  ) INTO v_domain_pass;

  SELECT EXISTS (
    SELECT 1 FROM public.domain_verification_challenges c
    WHERE c.startup_id = p_startup_id
      AND c.status = 'pending'
      AND c.expires_at > now()
  ) INTO v_domain_pending;

  SELECT r.status INTO v_latest_domain_status
  FROM public.verification_results r
  WHERE r.startup_id = p_startup_id AND r.dimension = 'domain'
  ORDER BY r.computed_at DESC
  LIMIT 1;

  SELECT EXISTS (
    SELECT 1 FROM public.integration_connections ic
    JOIN public.verification_providers vp ON vp.id = ic.provider_id
    WHERE ic.startup_id = p_startup_id
      AND ic.status IN ('connected', 'pending')
      AND vp.category = 'revenue'
  ) INTO v_revenue_connection_active;

  SELECT EXISTS (
    SELECT 1 FROM public.verification_results r
    WHERE r.startup_id = p_startup_id AND r.dimension = 'revenue'
      AND r.status = 'pass'
      AND (r.valid_until IS NULL OR r.valid_until > now())
  ) AND v_revenue_connection_active INTO v_rev_pass;

  IF v_rev_pass THEN
    SELECT COALESCE(SUM(mrr), 0), COALESCE(SUM(arr), 0)
    INTO v_mrr, v_arr
    FROM public.financial_metrics
    WHERE startup_id = p_startup_id;
  ELSE
    v_mrr := 0;
    v_arr := 0;
  END IF;

  SELECT domain INTO v_domain
  FROM public.domain_verification_challenges
  WHERE startup_id = p_startup_id AND status = 'verified'
  ORDER BY verified_at DESC NULLS LAST
  LIMIT 1;

  SELECT * INTO v_identity
  FROM public.identity_verification_sessions
  WHERE startup_id = p_startup_id
  ORDER BY created_at DESC
  LIMIT 1;

  v_identity_verified := v_identity.id IS NOT NULL
    AND v_identity.status = 'verified'
    AND v_identity.verified_at IS NOT NULL
    AND v_identity.verified_at > now() - interval '365 days';

  SELECT * INTO v_email
  FROM public.business_email_verifications
  WHERE startup_id = p_startup_id AND status = 'verified'
  ORDER BY verified_at DESC NULLS LAST
  LIMIT 1;

  IF v_email.id IS NULL THEN
    SELECT * INTO v_email
    FROM public.business_email_verifications
    WHERE startup_id = p_startup_id
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  v_email_verified := v_email.id IS NOT NULL
    AND v_email.status = 'verified'
    AND v_email.verified_at IS NOT NULL
    AND v_email.verified_at > now() - interval '90 days';

  IF v_email.id IS NOT NULL AND v_email.status = 'verified'
     AND v_email.verified_at IS NOT NULL
     AND v_email.verified_at <= now() - interval '90 days' THEN
    UPDATE public.business_email_verifications SET status = 'expired', updated_at = now()
    WHERE id = v_email.id;
    v_email_verified := false;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.business_registration_documents d
    WHERE d.startup_id = p_startup_id AND d.status = 'approved'
  ) INTO v_reg_approved;

  UPDATE public.listing_verification_gates g SET
    domain_status = CASE
      WHEN v_domain_pass THEN 'verified'
      WHEN v_domain_pending THEN 'pending'
      WHEN v_latest_domain_status = 'fail' THEN 'failed'
      ELSE 'pending'
    END,
    domain_verified_at = CASE WHEN v_domain_pass THEN COALESCE(g.domain_verified_at, now()) ELSE NULL END,
    verified_domain = CASE WHEN v_domain_pass THEN COALESCE(v_domain, g.verified_domain) ELSE NULL END,
    revenue_status = CASE
      WHEN v_rev_pass AND v_mrr > 0 THEN 'verified'
      WHEN v_rev_pass THEN 'partial'
      WHEN NOT v_revenue_connection_active AND g.revenue_status = 'verified' THEN 'pending'
      WHEN EXISTS (
        SELECT 1 FROM public.verification_results r
        WHERE r.startup_id = p_startup_id AND r.dimension = 'revenue' AND r.status = 'fail'
      ) THEN 'failed'
      ELSE COALESCE(g.revenue_status, 'pending')
    END,
    revenue_verified_at = CASE
      WHEN v_rev_pass AND v_mrr > 0 THEN COALESCE(g.revenue_verified_at, now()) ELSE NULL END,
    verified_mrr = CASE WHEN v_rev_pass AND v_mrr > 0 THEN v_mrr ELSE 0 END,
    verified_arr = CASE WHEN v_rev_pass AND v_mrr > 0 THEN v_arr ELSE 0 END,
    identity_status = CASE
      WHEN v_identity.id IS NULL THEN COALESCE(g.identity_status, 'pending')
      WHEN v_identity_verified THEN 'verified'
      WHEN v_identity.status = 'failed' THEN 'failed'
      WHEN v_identity.status = 'verified' AND NOT v_identity_verified THEN 'pending'
      ELSE 'pending'
    END,
    identity_verified_at = CASE
      WHEN v_identity_verified THEN COALESCE(v_identity.verified_at, now())
      ELSE NULL
    END,
    business_email_status = CASE
      WHEN v_email_verified THEN 'verified'
      WHEN v_email.id IS NOT NULL AND v_email.status = 'failed' THEN 'failed'
      WHEN v_email.id IS NOT NULL THEN 'pending'
      ELSE COALESCE(g.business_email_status, 'pending')
    END,
    business_email = CASE WHEN v_email_verified THEN COALESCE(v_email.email, g.business_email) ELSE g.business_email END,
    business_email_verified_at = CASE
      WHEN v_email_verified THEN COALESCE(v_email.verified_at, now())
      ELSE NULL
    END,
    registration_status = CASE
      WHEN v_reg_approved THEN 'verified'
      ELSE 'not_required'
    END,
    registration_verified_at = CASE WHEN v_reg_approved THEN COALESCE(g.registration_verified_at, now()) ELSE NULL END,
    updated_at = now()
  WHERE g.startup_id = p_startup_id;

  PERFORM public.run_listing_fraud_engine(p_startup_id);
  PERFORM public.sync_listing_lifecycle(p_startup_id);
  PERFORM public.recompute_listing_trust_v2(p_startup_id);
  PERFORM public.try_auto_publish_listing(p_startup_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- Trust: single evidence-based model (listing gates v2)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recompute_startup_trust(p_startup_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.recompute_listing_trust_v2(p_startup_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- Sync job retries + stale claim recovery
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_integration_sync_job(p_worker_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.integration_sync_jobs%ROWTYPE;
BEGIN
  UPDATE public.integration_sync_jobs
  SET status = 'pending', updated_at = now()
  WHERE status = 'claimed'
    AND updated_at < now() - interval '15 minutes';

  SELECT * INTO v_job
  FROM public.integration_sync_jobs
  WHERE status = 'pending' AND run_after <= now()
  ORDER BY created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE public.integration_sync_jobs
  SET status = 'claimed', updated_at = now(),
      payload = payload || jsonb_build_object('worker', p_worker_id)
  WHERE id = v_job.id;

  RETURN jsonb_build_object(
    'job_id', v_job.id,
    'connection_id', v_job.connection_id,
    'job_type', v_job.job_type,
    'payload', v_job.payload
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_integration_sync_job(
  p_job_id uuid,
  p_success boolean,
  p_records_written integer DEFAULT 0,
  p_error text DEFAULT NULL,
  p_sync_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.integration_sync_jobs%ROWTYPE;
  v_attempts integer;
  v_max integer;
  v_backoff interval;
BEGIN
  SELECT * INTO v_job FROM public.integration_sync_jobs WHERE id = p_job_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_attempts := v_job.attempts + 1;
  v_max := COALESCE(v_job.max_attempts, 5);

  IF p_success THEN
    UPDATE public.integration_sync_jobs
    SET status = 'completed', attempts = v_attempts, last_error = NULL, updated_at = now()
    WHERE id = p_job_id;
  ELSIF v_attempts < v_max THEN
    v_backoff := (power(2, LEAST(v_attempts, 6))::text || ' minutes')::interval;
    UPDATE public.integration_sync_jobs
    SET status = 'pending',
        attempts = v_attempts,
        last_error = p_error,
        run_after = now() + v_backoff,
        updated_at = now()
    WHERE id = p_job_id;
  ELSE
    UPDATE public.integration_sync_jobs
    SET status = 'dead', attempts = v_attempts, last_error = p_error, updated_at = now()
    WHERE id = p_job_id;
  END IF;

  UPDATE public.integration_syncs isync
  SET status = CASE WHEN p_success THEN 'succeeded' WHEN v_attempts >= v_max THEN 'failed' ELSE 'queued' END,
      finished_at = CASE WHEN p_success OR v_attempts >= v_max THEN now() ELSE finished_at END,
      records_written = CASE WHEN p_success THEN p_records_written ELSE records_written END,
      error_message = p_error,
      payload = p_sync_payload
  FROM (
    SELECT isync_inner.id FROM public.integration_syncs isync_inner
    WHERE isync_inner.connection_id = v_job.connection_id
      AND isync_inner.status IN ('queued', 'running')
    ORDER BY isync_inner.created_at DESC
    LIMIT 1
  ) latest
  WHERE isync.id = latest.id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Periodic revalidation sweep (invoke from sync-worker cron)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.run_verification_revalidation_sweep(p_limit integer DEFAULT 200)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_domain_conn uuid;
  v_count integer := 0;
  v_refreshed integer := 0;
BEGIN
  FOR r IN
    SELECT s.id AS startup_id
    FROM public.startups s
    WHERE s.listing_lifecycle IN ('published', 'verified', 'verification_in_progress', 'verification_required')
    ORDER BY s.updated_at ASC
    LIMIT p_limit
  LOOP
    v_count := v_count + 1;

    UPDATE public.verification_results vr
    SET valid_until = now()
    WHERE vr.startup_id = r.startup_id
      AND vr.dimension = 'domain'
      AND vr.status = 'pass'
      AND vr.computed_at < now() - interval '30 days'
      AND (vr.valid_until IS NULL OR vr.valid_until > now());

    UPDATE public.verification_results vr
    SET valid_until = now()
    WHERE vr.startup_id = r.startup_id
      AND vr.dimension = 'revenue'
      AND vr.status = 'pass'
      AND vr.computed_at < now() - interval '24 hours'
      AND (vr.valid_until IS NULL OR vr.valid_until > now());

    FOR v_domain_conn IN
      SELECT ic.id
      FROM public.integration_connections ic
      JOIN public.verification_providers vp ON vp.id = ic.provider_id
      WHERE ic.startup_id = r.startup_id
        AND vp.category = 'revenue'
        AND ic.status IN ('connected', 'pending')
        AND (ic.last_sync_at IS NULL OR ic.last_sync_at < now() - interval '24 hours')
    LOOP
      PERFORM public.enqueue_integration_sync(
        v_domain_conn, 'sync', jsonb_build_object('sync_type', 'incremental', 'reason', 'revalidation')
      );
    END LOOP;

    PERFORM public.refresh_listing_gates_from_evidence(r.startup_id);
    v_refreshed := v_refreshed + 1;
  END LOOP;

  RETURN jsonb_build_object('scanned', v_count, 'refreshed', v_refreshed);
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_verification_revalidation_sweep(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.fail_registration_document(
  p_document_id uuid,
  p_error text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_startup_id uuid;
BEGIN
  SELECT startup_id INTO v_startup_id
  FROM public.business_registration_documents WHERE id = p_document_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Document not found'; END IF;

  UPDATE public.business_registration_documents SET
    status = 'failed',
    ocr_payload = jsonb_build_object('error', p_error)
  WHERE id = p_document_id;

  INSERT INTO public.listing_fraud_signals (startup_id, signal_type, severity, payload)
  VALUES (v_startup_id, 'registration_ocr_failed', 'medium', jsonb_build_object('error', p_error));

  PERFORM public.refresh_listing_gates_from_evidence(v_startup_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fail_registration_document(uuid, text) TO service_role;

-- founder_update_startup uses guard for non-sensitive columns only
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
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.startup_owned_by_auth_slug(p_slug) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized to edit this listing';
  END IF;
  IF length(trim(p_title)) < 2 THEN RAISE EXCEPTION 'Invalid title'; END IF;

  SELECT id, metadata INTO v_id, v_meta
  FROM public.startups WHERE slug = lower(trim(p_slug));
  IF NOT FOUND THEN RAISE EXCEPTION 'Listing not found'; END IF;

  v_meta := COALESCE(v_meta, '{}'::jsonb) || COALESCE(p_metadata, '{}'::jsonb);

  PERFORM public.ownerr_bypass_startup_guard();

  UPDATE public.startups SET
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

  PERFORM public.append_audit_log('startup', v_id, 'founder_update', NULL, jsonb_build_object('slug', p_slug));
  PERFORM public.run_listing_fraud_engine(v_id);
  PERFORM public.refresh_listing_gates_from_evidence(v_id);
END;
$$;

ALTER TABLE public.business_email_verifications DROP CONSTRAINT IF EXISTS business_email_verifications_status_check;
ALTER TABLE public.business_email_verifications ADD CONSTRAINT business_email_verifications_status_check CHECK (
  status IN ('pending', 'verified', 'failed', 'manual_review', 'expired')
);

DROP POLICY IF EXISTS startups_select_own ON public.startups;
CREATE POLICY startups_select_own ON public.startups
  FOR SELECT TO authenticated
  USING (
    public.startup_owned_by_auth(id)
    OR public.is_platform_admin()
  );

CREATE OR REPLACE FUNCTION public.recompute_listing_trust_v2(p_startup_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g public.listing_verification_gates%ROWTYPE;
  v_score numeric := 0;
  v_level text;
  v_breakdown jsonb := '{}'::jsonb;
  v_history numeric := 0;
  v_fraud numeric := 0;
BEGIN
  SELECT * INTO g FROM public.listing_verification_gates WHERE startup_id = p_startup_id;
  IF NOT FOUND THEN
    PERFORM public.ensure_listing_gates_row(p_startup_id);
    SELECT * INTO g FROM public.listing_verification_gates WHERE startup_id = p_startup_id;
  END IF;

  IF g.identity_status = 'verified' THEN
    v_score := v_score + 20;
    v_breakdown := v_breakdown || jsonb_build_object('identity', 20);
  END IF;
  IF g.domain_status = 'verified' THEN
    v_score := v_score + 20;
    v_breakdown := v_breakdown || jsonb_build_object('domain', 20);
  END IF;
  IF g.business_email_status = 'verified' THEN
    v_score := v_score + 15;
    v_breakdown := v_breakdown || jsonb_build_object('business_email', 15);
  END IF;
  IF g.revenue_status = 'verified' AND COALESCE(g.verified_mrr, 0) > 0 THEN
    v_score := v_score + 30;
    v_breakdown := v_breakdown || jsonb_build_object('revenue', 30);
  END IF;
  IF g.registration_status = 'verified' THEN
    v_score := v_score + 15;
    v_breakdown := v_breakdown || jsonb_build_object('registration', 15);
  END IF;

  SELECT LEAST(10, GREATEST(0,
    EXTRACT(EPOCH FROM (now() - u.created_at)) / (86400.0 * 365) * 5
  )) INTO v_history
  FROM public.startups s
  JOIN auth.users u ON u.id = s.founder_user_id
  WHERE s.id = p_startup_id;

  SELECT COUNT(*) * 2 INTO v_fraud
  FROM public.listing_fraud_signals fs
  WHERE fs.startup_id = p_startup_id
    AND fs.severity IN ('high', 'medium')
    AND fs.created_at > now() - interval '90 days';

  v_score := v_score + COALESCE(v_history, 0) - COALESCE(v_fraud, 0);
  v_score := GREATEST(0, LEAST(100, v_score));

  v_level := CASE
    WHEN v_score >= 85 THEN 'elite'
    WHEN v_score >= 70 THEN 'trusted'
    WHEN v_score >= 45 THEN 'verified'
    WHEN v_score >= 25 THEN 'basic'
    ELSE 'unverified'
  END;

  INSERT INTO public.trust_scores (startup_id, score, level, breakdown, computed_at)
  VALUES (p_startup_id, v_score, v_level, v_breakdown, now())
  ON CONFLICT (startup_id) DO UPDATE SET
    score = EXCLUDED.score,
    level = EXCLUDED.level,
    breakdown = EXCLUDED.breakdown,
    computed_at = now();

  INSERT INTO public.trust_score_history (startup_id, score, level, breakdown, trigger)
  VALUES (p_startup_id, v_score, v_level, v_breakdown, 'listing_trust_v2');

  PERFORM public.ownerr_bypass_startup_guard();
  UPDATE public.startups SET verified = public.listing_mandatory_gates_pass(p_startup_id)
  WHERE id = p_startup_id;

  RETURN jsonb_build_object('score', v_score, 'level', v_level, 'breakdown', v_breakdown);
END;
$$;

CREATE OR REPLACE FUNCTION public.domain_verification_apply_result(
  p_challenge_id uuid,
  p_pass boolean,
  p_evidence jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ch public.domain_verification_challenges%ROWTYPE;
  v_provider_id uuid;
BEGIN
  SELECT * INTO v_ch FROM public.domain_verification_challenges WHERE id = p_challenge_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Challenge not found'; END IF;

  IF v_ch.status = 'verified' AND NOT p_pass THEN
    RETURN;
  END IF;
  IF v_ch.expires_at <= now() AND NOT p_pass THEN
    RETURN;
  END IF;

  UPDATE public.domain_verification_challenges
  SET status = CASE WHEN p_pass THEN 'verified' ELSE 'pending' END,
      verified_at = CASE WHEN p_pass THEN now() ELSE NULL END
  WHERE id = p_challenge_id;

  SELECT id INTO v_provider_id FROM public.verification_providers WHERE slug = 'domain';

  INSERT INTO public.verification_results (
    startup_id, provider_id, dimension, status, summary, evidence_ref, valid_from, valid_until
  ) VALUES (
    v_ch.startup_id,
    v_provider_id,
    'domain',
    CASE WHEN p_pass THEN 'pass' ELSE 'fail' END,
    jsonb_build_object('domain', v_ch.domain, 'method', v_ch.method, 'host', v_ch.host),
    p_evidence,
    CASE WHEN p_pass THEN now() ELSE NULL END,
    CASE WHEN p_pass THEN now() + interval '30 days' ELSE NULL END
  );

  PERFORM public.refresh_listing_gates_from_evidence(v_ch.startup_id);
END;
$$;

DROP POLICY IF EXISTS trust_scores_public ON public.trust_scores;
CREATE POLICY trust_scores_public ON public.trust_scores
  FOR SELECT TO anon, authenticated
  USING (public.startup_buyer_accessible(startup_id));

ALTER TABLE public.business_registration_documents DROP CONSTRAINT IF EXISTS business_registration_documents_status_check;
ALTER TABLE public.business_registration_documents ADD CONSTRAINT business_registration_documents_status_check CHECK (
  status IN ('pending', 'approved', 'rejected', 'failed')
);

DROP POLICY IF EXISTS listing_gates_public ON public.listing_verification_gates;
CREATE POLICY listing_gates_public ON public.listing_verification_gates
  FOR SELECT TO anon, authenticated
  USING (public.startup_buyer_accessible(startup_id));

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
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF length(trim(p_slug)) < 2 OR length(trim(p_title)) < 2 THEN
    RAISE EXCEPTION 'Invalid slug or title';
  END IF;

  PERFORM public.ownerr_bypass_startup_guard();

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
