-- Verification-first listings — Phase 1: lifecycle, gates, publish block, trust v2, admin queue RPCs
-- See docs/architecture/verification-first-listings.md

BEGIN;

-- ---------------------------------------------------------------------------
-- Lifecycle on startups
-- ---------------------------------------------------------------------------
ALTER TABLE public.startups
  ADD COLUMN IF NOT EXISTS listing_lifecycle text NOT NULL DEFAULT 'draft';

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
    'suspended'
  )
);

CREATE INDEX IF NOT EXISTS startups_listing_lifecycle_idx
  ON public.startups (listing_lifecycle);

-- ---------------------------------------------------------------------------
-- Gate row (1:1)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listing_verification_gates (
  startup_id uuid PRIMARY KEY REFERENCES public.startups (id) ON DELETE CASCADE,
  identity_status text NOT NULL DEFAULT 'pending' CHECK (
    identity_status IN ('pending', 'verified', 'rejected')
  ),
  identity_verified_at timestamptz,
  domain_status text NOT NULL DEFAULT 'pending' CHECK (
    domain_status IN ('pending', 'verified', 'failed')
  ),
  domain_verified_at timestamptz,
  verified_domain text,
  business_email_status text NOT NULL DEFAULT 'pending' CHECK (
    business_email_status IN ('pending', 'verified', 'failed', 'manual_review')
  ),
  business_email_verified_at timestamptz,
  business_email text,
  revenue_status text NOT NULL DEFAULT 'pending' CHECK (
    revenue_status IN ('pending', 'verified', 'failed', 'partial')
  ),
  revenue_verified_at timestamptz,
  verified_mrr numeric,
  verified_arr numeric,
  registration_status text NOT NULL DEFAULT 'pending' CHECK (
    registration_status IN ('pending', 'verified', 'rejected')
  ),
  registration_verified_at timestamptz,
  banking_status text NOT NULL DEFAULT 'not_required' CHECK (
    banking_status IN ('not_required', 'pending', 'verified', 'rejected')
  ),
  submitted_for_review_at timestamptz,
  published_at timestamptz,
  suspended_at timestamptz,
  suspension_reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS listing_verification_gates_set_updated_at ON public.listing_verification_gates;
CREATE TRIGGER listing_verification_gates_set_updated_at
  BEFORE UPDATE ON public.listing_verification_gates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Founder identity submissions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.founder_identity_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startups (id) ON DELETE CASCADE,
  auth_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  legal_name text NOT NULL,
  id_document_storage_path text NOT NULL,
  selfie_storage_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS founder_identity_verifications_startup_idx
  ON public.founder_identity_verifications (startup_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Business email verification
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startups (id) ON DELETE CASCADE,
  email text NOT NULL,
  email_domain text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'verified', 'failed', 'manual_review')
  ),
  requires_manual_review boolean NOT NULL DEFAULT false,
  verification_token_hash text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS business_email_verifications_startup_idx
  ON public.business_email_verifications (startup_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Business registration documents
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_registration_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startups (id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (
    doc_type IN (
      'certificate_of_incorporation',
      'llc_registration',
      'gst_registration',
      'business_license',
      'other'
    )
  ),
  storage_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'rejected')
  ),
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS business_registration_documents_startup_idx
  ON public.business_registration_documents (startup_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Fraud signals + admin reviews
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listing_fraud_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startups (id) ON DELETE CASCADE,
  signal_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listing_fraud_signals_startup_idx
  ON public.listing_fraud_signals (startup_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.admin_listing_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startups (id) ON DELETE CASCADE,
  review_type text NOT NULL CHECK (
    review_type IN ('identity', 'business_email', 'registration', 'publish', 'appeal', 'fraud')
  ),
  status text NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'in_progress', 'approved', 'rejected', 'closed')
  ),
  assignee uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  notes text,
  appeal_of uuid REFERENCES public.admin_listing_reviews (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_listing_reviews_queue_idx
  ON public.admin_listing_reviews (status, review_type, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.listing_verification_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_identity_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_registration_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_fraud_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_listing_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS listing_gates_founder ON public.listing_verification_gates;
CREATE POLICY listing_gates_founder ON public.listing_verification_gates
  FOR SELECT TO authenticated
  USING (public.startup_owned_by_auth(startup_id) OR public.is_platform_admin());

DROP POLICY IF EXISTS listing_gates_admin ON public.listing_verification_gates;
CREATE POLICY listing_gates_admin ON public.listing_verification_gates
  FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS founder_identity_own ON public.founder_identity_verifications;
CREATE POLICY founder_identity_own ON public.founder_identity_verifications
  FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR public.startup_owned_by_auth(startup_id)
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS founder_identity_insert ON public.founder_identity_verifications;
CREATE POLICY founder_identity_insert ON public.founder_identity_verifications
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_user_id = auth.uid()
    AND public.startup_owned_by_auth(startup_id)
  );

DROP POLICY IF EXISTS founder_identity_admin ON public.founder_identity_verifications;
CREATE POLICY founder_identity_admin ON public.founder_identity_verifications
  FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS business_email_founder ON public.business_email_verifications;
CREATE POLICY business_email_founder ON public.business_email_verifications
  FOR SELECT TO authenticated
  USING (public.startup_owned_by_auth(startup_id) OR public.is_platform_admin());

DROP POLICY IF EXISTS business_email_insert ON public.business_email_verifications;
CREATE POLICY business_email_insert ON public.business_email_verifications
  FOR INSERT TO authenticated
  WITH CHECK (public.startup_owned_by_auth(startup_id));

DROP POLICY IF EXISTS business_email_admin ON public.business_email_verifications;
CREATE POLICY business_email_admin ON public.business_email_verifications
  FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS registration_docs_founder ON public.business_registration_documents;
CREATE POLICY registration_docs_founder ON public.business_registration_documents
  FOR SELECT TO authenticated
  USING (public.startup_owned_by_auth(startup_id) OR public.is_platform_admin());

DROP POLICY IF EXISTS registration_docs_insert ON public.business_registration_documents;
CREATE POLICY registration_docs_insert ON public.business_registration_documents
  FOR INSERT TO authenticated
  WITH CHECK (public.startup_owned_by_auth(startup_id));

DROP POLICY IF EXISTS registration_docs_admin ON public.business_registration_documents;
CREATE POLICY registration_docs_admin ON public.business_registration_documents
  FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS fraud_signals_admin ON public.listing_fraud_signals;
CREATE POLICY fraud_signals_admin ON public.listing_fraud_signals
  FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS admin_reviews_admin ON public.admin_listing_reviews;
CREATE POLICY admin_reviews_admin ON public.admin_listing_reviews
  FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.listing_mandatory_gates_pass(p_startup_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.listing_verification_gates g
    WHERE g.startup_id = p_startup_id
      AND g.identity_status = 'verified'
      AND g.domain_status = 'verified'
      AND g.business_email_status = 'verified'
      AND g.revenue_status = 'verified'
      AND g.registration_status = 'verified'
  );
$$;

CREATE OR REPLACE FUNCTION public.ensure_listing_gates_row(p_startup_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.listing_verification_gates (startup_id)
  VALUES (p_startup_id)
  ON CONFLICT (startup_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_listing_gates_from_evidence(p_startup_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain_pass boolean := false;
  v_rev_pass boolean := false;
  v_mrr numeric := 0;
  v_arr numeric := 0;
  v_domain text;
  v_identity public.founder_identity_verifications%ROWTYPE;
  v_email public.business_email_verifications%ROWTYPE;
  v_reg_approved boolean := false;
BEGIN
  PERFORM public.ensure_listing_gates_row(p_startup_id);

  SELECT EXISTS (
    SELECT 1 FROM public.verification_results r
    WHERE r.startup_id = p_startup_id AND r.dimension = 'domain'
      AND r.status = 'pass'
      AND (r.valid_until IS NULL OR r.valid_until > now())
  ) INTO v_domain_pass;

  SELECT EXISTS (
    SELECT 1 FROM public.verification_results r
    WHERE r.startup_id = p_startup_id AND r.dimension = 'revenue'
      AND r.status = 'pass'
      AND (r.valid_until IS NULL OR r.valid_until > now())
  ) INTO v_rev_pass;

  SELECT COALESCE(SUM(mrr), 0), COALESCE(SUM(arr), 0)
  INTO v_mrr, v_arr
  FROM public.financial_metrics
  WHERE startup_id = p_startup_id;

  SELECT domain INTO v_domain
  FROM public.domain_verification_challenges
  WHERE startup_id = p_startup_id AND status = 'verified'
  ORDER BY verified_at DESC NULLS LAST
  LIMIT 1;

  SELECT * INTO v_identity
  FROM public.founder_identity_verifications
  WHERE startup_id = p_startup_id
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT * INTO v_email
  FROM public.business_email_verifications
  WHERE startup_id = p_startup_id
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT EXISTS (
    SELECT 1 FROM public.business_registration_documents d
    WHERE d.startup_id = p_startup_id AND d.status = 'approved'
  ) INTO v_reg_approved;

  UPDATE public.listing_verification_gates g SET
    domain_status = CASE
      WHEN v_domain_pass THEN 'verified'
      WHEN EXISTS (
        SELECT 1 FROM public.verification_results r
        WHERE r.startup_id = p_startup_id AND r.dimension = 'domain' AND r.status = 'fail'
      ) THEN 'failed'
      ELSE g.domain_status
    END,
    domain_verified_at = CASE WHEN v_domain_pass THEN now() ELSE g.domain_verified_at END,
    verified_domain = COALESCE(v_domain, g.verified_domain),
    revenue_status = CASE
      WHEN v_rev_pass AND v_mrr > 0 THEN 'verified'
      WHEN v_rev_pass THEN 'partial'
      WHEN EXISTS (
        SELECT 1 FROM public.verification_results r
        WHERE r.startup_id = p_startup_id AND r.dimension = 'revenue' AND r.status = 'fail'
      ) THEN 'failed'
      ELSE g.revenue_status
    END,
    revenue_verified_at = CASE
      WHEN v_rev_pass AND v_mrr > 0 THEN now() ELSE g.revenue_verified_at
    END,
    verified_mrr = CASE WHEN v_rev_pass THEN v_mrr ELSE g.verified_mrr END,
    verified_arr = CASE WHEN v_rev_pass THEN v_arr ELSE g.verified_arr END,
    identity_status = CASE
      WHEN v_identity.id IS NULL THEN g.identity_status
      WHEN v_identity.status = 'verified' THEN 'verified'
      WHEN v_identity.status = 'rejected' THEN 'rejected'
      ELSE 'pending'
    END,
    identity_verified_at = CASE
      WHEN v_identity.status = 'verified' THEN COALESCE(v_identity.reviewed_at, now())
      ELSE g.identity_verified_at
    END,
    business_email_status = CASE
      WHEN v_email.id IS NULL THEN g.business_email_status
      WHEN v_email.status = 'verified' THEN 'verified'
      WHEN v_email.status = 'manual_review' THEN 'manual_review'
      WHEN v_email.status = 'failed' THEN 'failed'
      ELSE 'pending'
    END,
    business_email = COALESCE(v_email.email, g.business_email),
    business_email_verified_at = CASE
      WHEN v_email.status = 'verified' THEN COALESCE(v_email.verified_at, now())
      ELSE g.business_email_verified_at
    END,
    registration_status = CASE
      WHEN v_reg_approved THEN 'verified'
      WHEN EXISTS (
        SELECT 1 FROM public.business_registration_documents d
        WHERE d.startup_id = p_startup_id AND d.status = 'rejected'
      ) THEN 'rejected'
      ELSE g.registration_status
    END,
    registration_verified_at = CASE WHEN v_reg_approved THEN now() ELSE g.registration_verified_at END,
    updated_at = now()
  WHERE g.startup_id = p_startup_id;

  PERFORM public.sync_listing_lifecycle(p_startup_id);
  PERFORM public.recompute_listing_trust_v2(p_startup_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_listing_lifecycle(p_startup_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g public.listing_verification_gates%ROWTYPE;
  v_lifecycle text;
  v_any_pending boolean;
  v_failed boolean;
  v_all_pass boolean;
BEGIN
  PERFORM public.ensure_listing_gates_row(p_startup_id);
  SELECT * INTO g FROM public.listing_verification_gates WHERE startup_id = p_startup_id;

  IF (SELECT listing_lifecycle FROM public.startups WHERE id = p_startup_id) = 'suspended' THEN
    RETURN 'suspended';
  END IF;

  v_all_pass := public.listing_mandatory_gates_pass(p_startup_id);

  v_failed := g.identity_status = 'rejected'
    OR g.domain_status = 'failed'
    OR g.business_email_status = 'failed'
    OR g.revenue_status = 'failed'
    OR g.registration_status = 'rejected';

  v_any_pending := g.identity_status = 'pending'
    OR g.domain_status = 'pending'
    OR g.business_email_status IN ('pending', 'manual_review')
    OR g.revenue_status IN ('pending', 'partial')
    OR g.registration_status = 'pending';

  IF v_all_pass THEN
    v_lifecycle := CASE
      WHEN (SELECT listing_lifecycle FROM public.startups WHERE id = p_startup_id) = 'published'
        THEN 'published'
      ELSE 'verified'
    END;
  ELSIF v_failed THEN
    v_lifecycle := 'verification_failed';
  ELSIF g.business_email_status = 'manual_review'
    OR g.registration_status = 'pending'
    OR g.identity_status = 'pending' THEN
    IF g.submitted_for_review_at IS NOT NULL AND NOT v_any_pending THEN
      v_lifecycle := 'verification_review';
    ELSE
      v_lifecycle := 'verification_in_progress';
    END IF;
  ELSIF g.submitted_for_review_at IS NOT NULL THEN
    v_lifecycle := 'verification_in_progress';
  ELSE
    v_lifecycle := COALESCE(
      (SELECT listing_lifecycle FROM public.startups WHERE id = p_startup_id),
      'draft'
    );
    IF v_lifecycle = 'published' THEN
      v_lifecycle := 'verification_required';
    END IF;
  END IF;

  UPDATE public.startups SET listing_lifecycle = v_lifecycle, updated_at = now()
  WHERE id = p_startup_id;

  RETURN v_lifecycle;
END;
$$;

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
  IF g.revenue_status = 'verified' AND COALESCE(g.verified_mrr, 0) > 0 THEN
    v_score := v_score + 30;
    v_breakdown := v_breakdown || jsonb_build_object('revenue', 30);
  END IF;
  IF g.registration_status = 'verified' THEN
    v_score := v_score + 20;
    v_breakdown := v_breakdown || jsonb_build_object('registration', 20);
  END IF;

  SELECT LEAST(10, GREATEST(0,
    EXTRACT(EPOCH FROM (now() - u.created_at)) / (86400.0 * 365) * 5
  )) INTO v_history
  FROM public.startups s
  JOIN auth.users u ON u.id = s.founder_user_id
  WHERE s.id = p_startup_id;

  SELECT COUNT(*) * 2 INTO v_fraud
  FROM public.listing_fraud_signals
  WHERE startup_id = p_startup_id AND severity IN ('medium', 'high');

  v_history := GREATEST(0, COALESCE(v_history, 0) - v_fraud);
  v_score := v_score + v_history;
  v_breakdown := v_breakdown || jsonb_build_object('platform_history', v_history);

  v_level := CASE
    WHEN v_score >= 85 THEN 'elite'
    WHEN v_score >= 65 THEN 'trusted'
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

  UPDATE public.startups SET verified = public.listing_mandatory_gates_pass(p_startup_id)
  WHERE id = p_startup_id;

  RETURN jsonb_build_object('score', v_score, 'level', v_level, 'breakdown', v_breakdown);
END;
$$;

-- ---------------------------------------------------------------------------
-- Founder + admin RPCs
-- ---------------------------------------------------------------------------
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

  PERFORM public.append_audit_log('startup', v_id, 'founder_create', NULL,
    jsonb_build_object('slug', p_slug, 'listing_lifecycle', 'draft'));

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.founder_submit_listing_for_verification(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_lc text;
BEGIN
  SELECT id INTO v_id FROM public.startups WHERE slug = lower(trim(p_slug));
  IF NOT FOUND THEN RAISE EXCEPTION 'Listing not found'; END IF;
  IF NOT public.startup_owned_by_auth(v_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;

  PERFORM public.ensure_listing_gates_row(v_id);
  UPDATE public.listing_verification_gates
  SET submitted_for_review_at = now(), updated_at = now()
  WHERE startup_id = v_id;

  PERFORM public.refresh_listing_gates_from_evidence(v_id);

  UPDATE public.startups
  SET listing_lifecycle = 'verification_in_progress', updated_at = now()
  WHERE id = v_id;

  v_lc := public.sync_listing_lifecycle(v_id);

  PERFORM public.append_audit_log('startup', v_id, 'submit_for_verification', NULL,
    jsonb_build_object('lifecycle', v_lc));

  RETURN public.listing_verification_snapshot(v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.founder_request_publish(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.startups WHERE slug = lower(trim(p_slug));
  IF NOT FOUND THEN RAISE EXCEPTION 'Listing not found'; END IF;
  IF NOT public.startup_owned_by_auth(v_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;

  PERFORM public.refresh_listing_gates_from_evidence(v_id);

  IF NOT public.listing_mandatory_gates_pass(v_id) THEN
    RAISE EXCEPTION 'All mandatory verifications must pass before publishing';
  END IF;

  IF (SELECT listing_lifecycle FROM public.startups WHERE id = v_id) = 'suspended' THEN
    RAISE EXCEPTION 'Listing is suspended';
  END IF;

  UPDATE public.startups
  SET listing_lifecycle = 'published',
      status = 'published',
      visibility = 'public',
      updated_at = now()
  WHERE id = v_id;

  UPDATE public.listing_verification_gates
  SET published_at = now(), updated_at = now()
  WHERE startup_id = v_id;

  PERFORM public.append_audit_log('startup', v_id, 'founder_publish', NULL, '{}'::jsonb);

  RETURN public.listing_verification_snapshot(v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.listing_verification_snapshot(p_startup_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.startups%ROWTYPE;
  g public.listing_verification_gates%ROWTYPE;
BEGIN
  IF NOT public.startup_owned_by_auth(p_startup_id) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO s FROM public.startups WHERE id = p_startup_id;
  SELECT * INTO g FROM public.listing_verification_gates WHERE startup_id = p_startup_id;

  RETURN jsonb_build_object(
    'startup_id', s.id,
    'slug', s.slug,
    'listing_lifecycle', s.listing_lifecycle,
    'visibility', s.visibility,
    'gates', to_jsonb(g),
    'can_publish', public.listing_mandatory_gates_pass(p_startup_id)
      AND s.listing_lifecycle = 'verified'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.listing_verification_timeline_public(p_startup_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'slug', s.slug,
    'listing_lifecycle', s.listing_lifecycle,
    'is_public', s.listing_lifecycle = 'published' AND s.visibility = 'public',
    'trust', (
      SELECT jsonb_build_object('score', ts.score, 'level', ts.level, 'computed_at', ts.computed_at)
      FROM public.trust_scores ts WHERE ts.startup_id = s.id
    ),
    'verified_mrr', g.verified_mrr,
    'verified_arr', g.verified_arr,
    'verified_domain', g.verified_domain,
    'revenue_verified_at', g.revenue_verified_at,
    'domain_verified_at', g.domain_verified_at,
    'identity_verified_at', g.identity_verified_at,
    'business_email_verified_at', g.business_email_verified_at,
    'registration_verified_at', g.registration_verified_at,
    'published_at', g.published_at,
    'badges', jsonb_build_object(
      'founder_verified', g.identity_status = 'verified',
      'domain_verified', g.domain_status = 'verified',
      'business_email_verified', g.business_email_status = 'verified',
      'revenue_verified', g.revenue_status = 'verified',
      'business_verified', g.registration_status = 'verified',
      'marketplace_published', s.listing_lifecycle = 'published'
    )
  )
  FROM public.startups s
  LEFT JOIN public.listing_verification_gates g ON g.startup_id = s.id
  WHERE s.slug = p_startup_slug
    AND s.listing_lifecycle = 'published'
    AND s.visibility = 'public';
$$;

CREATE OR REPLACE FUNCTION public.founder_submit_identity_verification(
  p_startup_id uuid,
  p_legal_name text,
  p_id_document_storage_path text,
  p_selfie_storage_path text
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
  IF NOT public.startup_owned_by_auth(p_startup_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF length(trim(p_legal_name)) < 2 THEN RAISE EXCEPTION 'Legal name required'; END IF;

  INSERT INTO public.founder_identity_verifications (
    id, startup_id, auth_user_id, legal_name,
    id_document_storage_path, selfie_storage_path, status
  ) VALUES (
    v_id, p_startup_id, auth.uid(), trim(p_legal_name),
    p_id_document_storage_path, p_selfie_storage_path, 'pending'
  );

  INSERT INTO public.admin_listing_reviews (startup_id, review_type, status, notes)
  VALUES (p_startup_id, 'identity', 'open', 'Founder identity submission');

  PERFORM public.refresh_listing_gates_from_evidence(p_startup_id);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.founder_submit_business_email(
  p_startup_id uuid,
  p_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
  v_domain text;
  v_verified_domain text;
  v_manual boolean := false;
  v_status text := 'pending';
BEGIN
  IF NOT public.startup_owned_by_auth(p_startup_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  v_domain := lower(split_part(trim(p_email), '@', 2));
  IF v_domain = '' THEN RAISE EXCEPTION 'Invalid email'; END IF;

  SELECT verified_domain INTO v_verified_domain
  FROM public.listing_verification_gates WHERE startup_id = p_startup_id;

  IF v_verified_domain IS NULL OR v_verified_domain = '' THEN
    RAISE EXCEPTION 'Verify company domain before business email';
  END IF;

  IF v_domain <> lower(v_verified_domain) THEN
    v_manual := true;
    v_status := 'manual_review';
    INSERT INTO public.listing_fraud_signals (startup_id, signal_type, severity, payload)
    VALUES (
      p_startup_id, 'business_email_domain_mismatch', 'medium',
      jsonb_build_object('email_domain', v_domain, 'verified_domain', v_verified_domain)
    );
    INSERT INTO public.admin_listing_reviews (startup_id, review_type, status, notes)
    VALUES (p_startup_id, 'business_email', 'open', 'Email domain mismatch — manual review');
  END IF;

  INSERT INTO public.business_email_verifications (
    id, startup_id, email, email_domain, status, requires_manual_review
  ) VALUES (
    v_id, p_startup_id, lower(trim(p_email)), v_domain, v_status, v_manual
  );

  PERFORM public.refresh_listing_gates_from_evidence(p_startup_id);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.founder_submit_registration_document(
  p_startup_id uuid,
  p_doc_type text,
  p_storage_path text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
BEGIN
  IF NOT public.startup_owned_by_auth(p_startup_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;

  INSERT INTO public.business_registration_documents (
    id, startup_id, doc_type, storage_path, status
  ) VALUES (v_id, p_startup_id, p_doc_type, p_storage_path, 'pending');

  INSERT INTO public.admin_listing_reviews (startup_id, review_type, status, notes)
  VALUES (p_startup_id, 'registration', 'open', 'Registration document uploaded');

  PERFORM public.refresh_listing_gates_from_evidence(p_startup_id);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_review_identity(
  p_verification_id uuid,
  p_approve boolean,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.founder_identity_verifications%ROWTYPE;
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO v_row FROM public.founder_identity_verifications WHERE id = p_verification_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;

  UPDATE public.founder_identity_verifications SET
    status = CASE WHEN p_approve THEN 'verified' ELSE 'rejected' END,
    admin_notes = p_notes,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  WHERE id = p_verification_id;

  PERFORM public.refresh_listing_gates_from_evidence(v_row.startup_id);
  PERFORM public.append_audit_log('startup', v_row.startup_id, 'admin_identity_review', NULL,
    jsonb_build_object('approve', p_approve));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_review_registration_document(
  p_document_id uuid,
  p_approve boolean,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.business_registration_documents%ROWTYPE;
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO v_row FROM public.business_registration_documents WHERE id = p_document_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;

  UPDATE public.business_registration_documents SET
    status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
    admin_notes = p_notes,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  WHERE id = p_document_id;

  PERFORM public.refresh_listing_gates_from_evidence(v_row.startup_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_review_business_email(
  p_verification_id uuid,
  p_approve boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.business_email_verifications%ROWTYPE;
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO v_row FROM public.business_email_verifications WHERE id = p_verification_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;

  UPDATE public.business_email_verifications SET
    status = CASE WHEN p_approve THEN 'verified' ELSE 'failed' END,
    verified_at = CASE WHEN p_approve THEN now() ELSE NULL END
  WHERE id = p_verification_id;

  PERFORM public.refresh_listing_gates_from_evidence(v_row.startup_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_suspend_listing(
  p_startup_id uuid,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  UPDATE public.startups SET
    listing_lifecycle = 'suspended',
    visibility = 'unlisted',
    updated_at = now()
  WHERE id = p_startup_id;
  UPDATE public.listing_verification_gates SET
    suspended_at = now(), suspension_reason = p_reason, updated_at = now()
  WHERE startup_id = p_startup_id;
  PERFORM public.append_audit_log('startup', p_startup_id, 'admin_suspend', NULL,
    jsonb_build_object('reason', p_reason));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_listing_verification_queue()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  RETURN jsonb_build_object(
    'open_reviews', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', r.id,
        'startup_id', r.startup_id,
        'slug', s.slug,
        'title', s.title,
        'review_type', r.review_type,
        'status', r.status,
        'created_at', r.created_at
      ) ORDER BY r.created_at), '[]'::jsonb)
      FROM public.admin_listing_reviews r
      JOIN public.startups s ON s.id = r.startup_id
      WHERE r.status IN ('open', 'in_progress')
    ),
    'pending_identity', (
      SELECT count(*)::int FROM public.founder_identity_verifications WHERE status = 'pending'
    ),
    'pending_registration', (
      SELECT count(*)::int FROM public.business_registration_documents WHERE status = 'pending'
    ),
    'manual_email', (
      SELECT count(*)::int FROM public.business_email_verifications WHERE status = 'manual_review'
    ),
    'awaiting_publish', (
      SELECT count(*)::int FROM public.startups WHERE listing_lifecycle = 'verified'
    )
  );
END;
$$;

-- Wire domain + integration evidence into gates
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

  UPDATE public.domain_verification_challenges
  SET status = CASE WHEN p_pass THEN 'verified' ELSE 'failed' END,
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
    jsonb_build_object('domain', v_ch.domain, 'method', v_ch.method),
    p_evidence,
    CASE WHEN p_pass THEN now() ELSE NULL END,
    CASE WHEN p_pass THEN now() + interval '365 days' ELSE NULL END
  );

  PERFORM public.recompute_startup_trust(v_ch.startup_id);
  PERFORM public.refresh_listing_gates_from_evidence(v_ch.startup_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.startup_verification_summary(p_startup_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'dimensions', COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object(
          'dimension', r.dimension,
          'status', r.status,
          'computed_at', r.computed_at,
          'summary', r.summary
        ) ORDER BY r.computed_at DESC)
        FROM (
          SELECT DISTINCT ON (vr.dimension) vr.dimension, vr.status, vr.computed_at, vr.summary
          FROM public.verification_results vr
          JOIN public.startups st ON st.id = vr.startup_id
          WHERE st.slug = p_startup_slug
          ORDER BY vr.dimension, vr.computed_at DESC
        ) r
      ),
      '[]'::jsonb
    ),
    'connections', COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object(
          'provider', vp.slug,
          'status', ic.status,
          'health_status', ic.health_status,
          'last_sync_at', ic.last_sync_at,
          'last_error', ic.last_error
        ))
        FROM public.integration_connections ic
        JOIN public.verification_providers vp ON vp.id = ic.provider_id
        JOIN public.startups st ON st.id = ic.startup_id
        WHERE st.slug = p_startup_slug AND vp.slug <> 'domain'
      ),
      '[]'::jsonb
    ),
    'listing_lifecycle', st.listing_lifecycle,
    'gates', to_jsonb(g)
  )
  FROM public.startups st
  LEFT JOIN public.listing_verification_gates g ON g.startup_id = st.id
  WHERE st.slug = p_startup_slug
    AND (
      (st.listing_lifecycle = 'published' AND st.visibility = 'public')
      OR public.startup_owned_by_auth(st.id)
      OR public.is_platform_admin()
    );
$$;

-- Public catalog: only published lifecycle
CREATE OR REPLACE FUNCTION public.startup_trust_public(p_startup_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'score', ts.score,
    'level', ts.level,
    'computed_at', ts.computed_at
  )
  FROM public.startups s
  JOIN public.trust_scores ts ON ts.startup_id = s.id
  WHERE s.slug = p_startup_slug
    AND s.listing_lifecycle = 'published'
    AND s.visibility = 'public';
$$;

-- Backfill gates + demote listings that were public without full verification
INSERT INTO public.listing_verification_gates (startup_id)
SELECT id FROM public.startups s
WHERE NOT EXISTS (
  SELECT 1 FROM public.listing_verification_gates g WHERE g.startup_id = s.id
);

UPDATE public.startups
SET
  listing_lifecycle = CASE
    WHEN listing_lifecycle = 'published' OR (status = 'published' AND visibility = 'public')
      THEN 'verification_required'
    WHEN listing_lifecycle IS NULL OR listing_lifecycle = ''
      THEN 'draft'
    ELSE listing_lifecycle
  END,
  visibility = CASE
    WHEN status = 'published' AND visibility = 'public' THEN 'unlisted'
    ELSE visibility
  END,
  status = CASE
    WHEN status = 'published' THEN 'draft'
    ELSE status
  END
WHERE listing_lifecycle = 'published'
   OR (status = 'published' AND visibility = 'public');

-- Grants
GRANT EXECUTE ON FUNCTION public.listing_verification_snapshot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listing_verification_timeline_public(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.founder_submit_listing_for_verification(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_request_publish(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_submit_identity_verification(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_submit_business_email(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_submit_registration_document(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_identity(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_registration_document(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_business_email(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_suspend_listing(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_listing_verification_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_listing_gates_from_evidence(uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
