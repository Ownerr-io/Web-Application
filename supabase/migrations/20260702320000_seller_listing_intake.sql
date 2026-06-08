-- Seller listing intake: structured self-reported profile + business proofs (no doc OCR).
-- Verification gates remain the source of truth for publish.

BEGIN;

CREATE TABLE IF NOT EXISTS public.listing_seller_intake (
  startup_id uuid PRIMARY KEY REFERENCES public.startups (id) ON DELETE CASCADE,
  schema_version integer NOT NULL DEFAULT 1,
  founder_name text,
  founder_email text,
  founder_linkedin text,
  founder_role text,
  monthly_visitors bigint,
  traffic_source text,
  analytics_platform text,
  declared_domain text,
  domain_registrar text,
  dns_provider text,
  nameserver_1 text,
  nameserver_2 text,
  dns_txt_acknowledged_at timestamptz,
  api_available boolean,
  api_documentation_url text,
  api_base_url text,
  api_access_type text,
  accounting_software text,
  tax_id text,
  accounting_api_url text,
  sub_category text,
  one_line_pitch text,
  reported_monthly_revenue_usd numeric,
  reported_monthly_profit_usd numeric,
  revenue_model text,
  revenue_source text,
  gross_margin_pct numeric,
  revenue_api_url text,
  revenue_since date,
  tech_frontend text,
  tech_backend text,
  tech_database text,
  tech_hosting text,
  tech_other text,
  reason_for_selling text,
  transition_support text,
  legal_status text,
  intake_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listing_seller_intake_api_access_type_check CHECK (
    api_access_type IS NULL OR api_access_type IN ('public', 'private', 'limited')
  )
);

CREATE INDEX IF NOT EXISTS listing_seller_intake_declared_domain_idx
  ON public.listing_seller_intake (lower(declared_domain))
  WHERE declared_domain IS NOT NULL;

DROP TRIGGER IF EXISTS listing_seller_intake_set_updated_at ON public.listing_seller_intake;
CREATE TRIGGER listing_seller_intake_set_updated_at
  BEFORE UPDATE ON public.listing_seller_intake
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.listing_business_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startups (id) ON DELETE CASCADE,
  proof_type text NOT NULL,
  storage_path text NOT NULL,
  file_name text,
  mime_type text,
  byte_size bigint,
  status text NOT NULL DEFAULT 'uploaded',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listing_business_proofs_type_check CHECK (
    proof_type IN ('analytics', 'revenue', 'accounting', 'bank', 'other')
  ),
  CONSTRAINT listing_business_proofs_status_check CHECK (
    status IN ('uploaded', 'rejected', 'archived')
  )
);

CREATE INDEX IF NOT EXISTS listing_business_proofs_startup_idx
  ON public.listing_business_proofs (startup_id, created_at DESC);

ALTER TABLE public.listing_seller_intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_business_proofs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS listing_seller_intake_owner ON public.listing_seller_intake;
CREATE POLICY listing_seller_intake_owner ON public.listing_seller_intake
  FOR ALL TO authenticated
  USING (public.startup_owned_by_auth(startup_id) OR public.is_platform_admin())
  WITH CHECK (public.startup_owned_by_auth(startup_id) OR public.is_platform_admin());

DROP POLICY IF EXISTS listing_business_proofs_owner ON public.listing_business_proofs;
CREATE POLICY listing_business_proofs_owner ON public.listing_business_proofs
  FOR ALL TO authenticated
  USING (public.startup_owned_by_auth(startup_id) OR public.is_platform_admin())
  WITH CHECK (public.startup_owned_by_auth(startup_id) OR public.is_platform_admin());

DROP POLICY IF EXISTS listing_business_proofs_admin ON public.listing_business_proofs;
CREATE POLICY listing_business_proofs_admin ON public.listing_business_proofs
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- Storage bucket for optional business proof uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-business-proofs',
  'listing-business-proofs',
  false,
  20971520,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
    'text/csv', 'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS listing_proofs_storage_select ON storage.objects;
CREATE POLICY listing_proofs_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'listing-business-proofs'
    AND public.startup_owned_by_auth((split_part(name, '/', 1))::uuid)
  );

DROP POLICY IF EXISTS listing_proofs_storage_insert ON storage.objects;
CREATE POLICY listing_proofs_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'listing-business-proofs'
    AND public.startup_owned_by_auth((split_part(name, '/', 1))::uuid)
  );

DROP POLICY IF EXISTS listing_proofs_storage_delete ON storage.objects;
CREATE POLICY listing_proofs_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'listing-business-proofs'
    AND public.startup_owned_by_auth((split_part(name, '/', 1))::uuid)
  );

CREATE OR REPLACE FUNCTION public._seller_intake_slugify(p_title text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_base text;
BEGIN
  v_base := lower(trim(p_title));
  v_base := regexp_replace(v_base, '[^a-z0-9]+', '-', 'g');
  v_base := regexp_replace(v_base, '(^-|-$)', '', 'g');
  IF length(v_base) < 2 THEN
    v_base := 'startup';
  END IF;
  RETURN v_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
END;
$$;

CREATE OR REPLACE FUNCTION public._seller_intake_apply_payload(
  p_startup_id uuid,
  p_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text := nullif(trim(p_payload->>'company_name'), '');
  v_pitch text := nullif(trim(p_payload->>'one_line_pitch'), '');
  v_desc text := coalesce(p_payload->>'description', '');
  v_industry text := coalesce(nullif(trim(p_payload->>'industry'), ''), 'SaaS');
  v_currency text := coalesce(nullif(trim(p_payload->>'currency'), ''), 'USD');
  v_business_model text := nullif(trim(p_payload->>'business_model'), '');
  v_founded_year integer;
  v_asking numeric;
  v_reported_mrr numeric;
  v_reported_profit numeric;
  v_gross numeric;
  v_meta jsonb;
BEGIN
  v_founded_year := NULLIF(trim(p_payload->>'founded_year'), '')::integer;
  v_asking := NULLIF(trim(p_payload->>'asking_price_usd'), '')::numeric;
  v_reported_mrr := NULLIF(trim(p_payload->>'reported_monthly_revenue_usd'), '')::numeric;
  v_reported_profit := NULLIF(trim(p_payload->>'reported_monthly_profit_usd'), '')::numeric;
  v_gross := NULLIF(trim(p_payload->>'gross_margin_pct'), '')::numeric;

  SELECT metadata INTO v_meta FROM public.startups WHERE id = p_startup_id;
  v_meta := coalesce(v_meta, '{}'::jsonb) || jsonb_build_object(
    'intake_schema_version', 1,
    'founder_display_name', nullif(trim(p_payload->>'founder_name'), ''),
    'data_disclaimer', 'Self-reported fields are not buyer verification badges.'
  );

  PERFORM public.ownerr_bypass_startup_guard();

  UPDATE public.startups SET
    title = coalesce(v_title, title),
    tagline = coalesce(v_pitch, tagline),
    description = coalesce(v_desc, description),
    industry = v_industry,
    business_model = coalesce(v_business_model, business_model),
    currency = v_currency,
    founded_year = coalesce(v_founded_year, founded_year),
    asking_price = v_asking,
    annual_revenue = CASE
      WHEN v_reported_mrr IS NOT NULL AND v_reported_mrr > 0 THEN v_reported_mrr * 12
      ELSE annual_revenue
    END,
    profit = coalesce(v_reported_profit, profit),
    metadata = v_meta,
    updated_at = now()
  WHERE id = p_startup_id;

  INSERT INTO public.listing_seller_intake (
    startup_id,
    founder_name,
    founder_email,
    founder_linkedin,
    founder_role,
    monthly_visitors,
    traffic_source,
    analytics_platform,
    declared_domain,
    domain_registrar,
    dns_provider,
    nameserver_1,
    nameserver_2,
    dns_txt_acknowledged_at,
    api_available,
    api_documentation_url,
    api_base_url,
    api_access_type,
    accounting_software,
    tax_id,
    accounting_api_url,
    sub_category,
    one_line_pitch,
    reported_monthly_revenue_usd,
    reported_monthly_profit_usd,
    revenue_model,
    revenue_source,
    gross_margin_pct,
    revenue_api_url,
    revenue_since,
    tech_frontend,
    tech_backend,
    tech_database,
    tech_hosting,
    tech_other,
    reason_for_selling,
    transition_support,
    legal_status
  ) VALUES (
    p_startup_id,
    nullif(trim(p_payload->>'founder_name'), ''),
    nullif(trim(p_payload->>'founder_email'), ''),
    nullif(trim(p_payload->>'founder_linkedin'), ''),
    nullif(trim(p_payload->>'founder_role'), ''),
    NULLIF(trim(p_payload->>'monthly_visitors'), '')::bigint,
    nullif(trim(p_payload->>'traffic_source'), ''),
    nullif(trim(p_payload->>'analytics_platform'), ''),
    nullif(lower(trim(p_payload->>'declared_domain')), ''),
    nullif(trim(p_payload->>'domain_registrar'), ''),
    nullif(trim(p_payload->>'dns_provider'), ''),
    nullif(trim(p_payload->>'nameserver_1'), ''),
    nullif(trim(p_payload->>'nameserver_2'), ''),
    CASE
      WHEN coalesce((p_payload->>'dns_record_acknowledged')::boolean, false) THEN now()
      ELSE NULL
    END,
    (p_payload->>'api_available')::boolean,
    nullif(trim(p_payload->>'api_documentation_url'), ''),
    nullif(trim(p_payload->>'api_base_url'), ''),
    nullif(trim(p_payload->>'api_access_type'), ''),
    nullif(trim(p_payload->>'accounting_software'), ''),
    nullif(trim(p_payload->>'tax_id'), ''),
    nullif(trim(p_payload->>'accounting_api_url'), ''),
    nullif(trim(p_payload->>'sub_category'), ''),
    v_pitch,
    v_reported_mrr,
    v_reported_profit,
    nullif(trim(p_payload->>'revenue_model'), ''),
    nullif(trim(p_payload->>'revenue_source'), ''),
    v_gross,
    nullif(trim(p_payload->>'revenue_api_url'), ''),
    NULLIF(trim(p_payload->>'revenue_since'), '')::date,
    nullif(trim(p_payload->>'tech_frontend'), ''),
    nullif(trim(p_payload->>'tech_backend'), ''),
    nullif(trim(p_payload->>'tech_database'), ''),
    nullif(trim(p_payload->>'tech_hosting'), ''),
    nullif(trim(p_payload->>'tech_other'), ''),
    nullif(trim(p_payload->>'reason_for_selling'), ''),
    nullif(trim(p_payload->>'transition_support'), ''),
    nullif(trim(p_payload->>'legal_status'), '')
  )
  ON CONFLICT (startup_id) DO UPDATE SET
    founder_name = EXCLUDED.founder_name,
    founder_email = EXCLUDED.founder_email,
    founder_linkedin = EXCLUDED.founder_linkedin,
    founder_role = EXCLUDED.founder_role,
    monthly_visitors = EXCLUDED.monthly_visitors,
    traffic_source = EXCLUDED.traffic_source,
    analytics_platform = EXCLUDED.analytics_platform,
    declared_domain = EXCLUDED.declared_domain,
    domain_registrar = EXCLUDED.domain_registrar,
    dns_provider = EXCLUDED.dns_provider,
    nameserver_1 = EXCLUDED.nameserver_1,
    nameserver_2 = EXCLUDED.nameserver_2,
    dns_txt_acknowledged_at = COALESCE(EXCLUDED.dns_txt_acknowledged_at, listing_seller_intake.dns_txt_acknowledged_at),
    api_available = EXCLUDED.api_available,
    api_documentation_url = EXCLUDED.api_documentation_url,
    api_base_url = EXCLUDED.api_base_url,
    api_access_type = EXCLUDED.api_access_type,
    accounting_software = EXCLUDED.accounting_software,
    tax_id = EXCLUDED.tax_id,
    accounting_api_url = EXCLUDED.accounting_api_url,
    sub_category = EXCLUDED.sub_category,
    one_line_pitch = EXCLUDED.one_line_pitch,
    reported_monthly_revenue_usd = EXCLUDED.reported_monthly_revenue_usd,
    reported_monthly_profit_usd = EXCLUDED.reported_monthly_profit_usd,
    revenue_model = EXCLUDED.revenue_model,
    revenue_source = EXCLUDED.revenue_source,
    gross_margin_pct = EXCLUDED.gross_margin_pct,
    revenue_api_url = EXCLUDED.revenue_api_url,
    revenue_since = EXCLUDED.revenue_since,
    tech_frontend = EXCLUDED.tech_frontend,
    tech_backend = EXCLUDED.tech_backend,
    tech_database = EXCLUDED.tech_database,
    tech_hosting = EXCLUDED.tech_hosting,
    tech_other = EXCLUDED.tech_other,
    reason_for_selling = EXCLUDED.reason_for_selling,
    transition_support = EXCLUDED.transition_support,
    legal_status = EXCLUDED.legal_status,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.founder_save_seller_intake(
  p_payload jsonb,
  p_finalize boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_startup_id uuid;
  v_slug text;
  v_title text;
  v_seller_profile_id uuid;
  v_domain text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_title := nullif(trim(p_payload->>'company_name'), '');
  IF v_title IS NULL OR length(v_title) < 2 THEN
    RAISE EXCEPTION 'Company name is required';
  END IF;

  v_slug := nullif(lower(trim(p_payload->>'slug')), '');
  IF v_slug IS NOT NULL THEN
    SELECT id INTO v_startup_id FROM public.startups WHERE slug = v_slug;
    IF v_startup_id IS NOT NULL
      AND NOT public.startup_owned_by_auth(v_startup_id)
      AND NOT public.is_platform_admin() THEN
      RAISE EXCEPTION 'Not authorized to edit this listing';
    END IF;
  END IF;

  IF v_startup_id IS NOT NULL AND v_slug IS NULL THEN
    SELECT slug INTO v_slug FROM public.startups WHERE id = v_startup_id;
  END IF;

  IF v_startup_id IS NULL THEN
    v_slug := coalesce(v_slug, public._seller_intake_slugify(v_title));
    v_startup_id := gen_random_uuid();

    PERFORM public.ownerr_bypass_startup_guard();

    INSERT INTO public.startups (
      id, slug, founder_user_id, title, description, industry, currency,
      visibility, status, verified, listing_lifecycle, metadata
    ) VALUES (
      v_startup_id, v_slug, auth.uid(), v_title,
      coalesce(p_payload->>'description', ''),
      coalesce(nullif(trim(p_payload->>'industry'), ''), 'SaaS'),
      coalesce(nullif(trim(p_payload->>'currency'), ''), 'USD'),
      'unlisted', 'draft', false, 'draft', '{}'::jsonb
    );

    PERFORM public.ensure_listing_gates_row(v_startup_id);

    INSERT INTO public.trust_scores (startup_id, score, level)
    VALUES (v_startup_id, 0, 'unverified')
    ON CONFLICT (startup_id) DO NOTHING;

    SELECT mp.id INTO v_seller_profile_id
    FROM public.marketplace_profiles mp
    WHERE mp.auth_user_id = auth.uid()
      AND mp.desk_role IN ('seller', 'founder')
    ORDER BY mp.updated_at DESC NULLS LAST
    LIMIT 1;

    IF v_seller_profile_id IS NOT NULL THEN
      INSERT INTO public.seller_listings (startup_id, seller_profile_id, status)
      VALUES (v_startup_id, v_seller_profile_id, 'draft')
      ON CONFLICT (startup_id, seller_profile_id) DO NOTHING;
    END IF;

    PERFORM public.append_audit_log('startup', v_startup_id, 'founder_create', NULL,
      jsonb_build_object('slug', v_slug, 'source', 'seller_intake'));
  END IF;

  PERFORM public._seller_intake_apply_payload(v_startup_id, p_payload || jsonb_build_object('slug', v_slug));

  IF p_finalize THEN
    IF nullif(trim(p_payload->>'founder_name'), '') IS NULL THEN
      RAISE EXCEPTION 'Founder name is required';
    END IF;
    IF nullif(trim(p_payload->>'founder_email'), '') IS NULL THEN
      RAISE EXCEPTION 'Founder email is required';
    END IF;
    IF nullif(trim(p_payload->>'one_line_pitch'), '') IS NULL THEN
      RAISE EXCEPTION 'One-line pitch is required';
    END IF;
    IF nullif(trim(p_payload->>'declared_domain'), '') IS NULL THEN
      RAISE EXCEPTION 'Domain name is required';
    END IF;
    IF NULLIF(trim(p_payload->>'asking_price_usd'), '')::numeric IS NULL
      OR NULLIF(trim(p_payload->>'asking_price_usd'), '')::numeric <= 0 THEN
      RAISE EXCEPTION 'Asking price (USD) is required';
    END IF;

    UPDATE public.listing_seller_intake
    SET intake_completed_at = now()
    WHERE startup_id = v_startup_id;

    v_domain := nullif(lower(trim(p_payload->>'declared_domain')), '');
    IF v_domain IS NOT NULL THEN
      PERFORM public.domain_verification_begin(v_startup_id, v_domain, 'txt');
    END IF;

    PERFORM public.run_listing_fraud_engine(v_startup_id);
    PERFORM public.refresh_listing_gates_from_evidence(v_startup_id);

    PERFORM public.append_audit_log('startup', v_startup_id, 'seller_intake_submitted', NULL,
      jsonb_build_object('slug', v_slug));
  END IF;

  RETURN jsonb_build_object(
    'startup_id', v_startup_id,
    'slug', v_slug,
    'finalized', p_finalize
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.founder_register_business_proof(
  p_startup_id uuid,
  p_proof_type text,
  p_storage_path text,
  p_file_name text DEFAULT NULL,
  p_mime_type text DEFAULT NULL,
  p_byte_size bigint DEFAULT NULL
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
  IF NOT public.startup_owned_by_auth(p_startup_id) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_proof_type NOT IN ('analytics', 'revenue', 'accounting', 'bank', 'other') THEN
    RAISE EXCEPTION 'Invalid proof type';
  END IF;
  IF p_storage_path IS NULL OR p_storage_path !~ ('^' || p_startup_id::text || '/') THEN
    RAISE EXCEPTION 'Invalid storage path';
  END IF;

  INSERT INTO public.listing_business_proofs (
    id, startup_id, proof_type, storage_path, file_name, mime_type, byte_size
  ) VALUES (
    v_id, p_startup_id, p_proof_type, p_storage_path, p_file_name, p_mime_type, p_byte_size
  );

  PERFORM public.append_audit_log('startup', p_startup_id, 'business_proof_uploaded', NULL,
    jsonb_build_object('proof_type', p_proof_type, 'proof_id', v_id));

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.founder_get_seller_intake(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_startup public.startups%ROWTYPE;
  v_intake public.listing_seller_intake%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT * INTO v_startup FROM public.startups WHERE slug = lower(trim(p_slug));
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF NOT public.startup_owned_by_auth(v_startup.id) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_intake FROM public.listing_seller_intake WHERE startup_id = v_startup.id;

  RETURN jsonb_build_object(
    'startup_id', v_startup.id,
    'slug', v_startup.slug,
    'company_name', v_startup.title,
    'one_line_pitch', coalesce(v_intake.one_line_pitch, v_startup.tagline),
    'description', v_startup.description,
    'industry', v_startup.industry,
    'business_model', v_startup.business_model,
    'currency', v_startup.currency,
    'founded_year', v_startup.founded_year,
    'asking_price_usd', v_startup.asking_price,
    'intake_completed_at', v_intake.intake_completed_at,
    'intake', CASE WHEN v_intake.startup_id IS NULL THEN NULL
      ELSE to_jsonb(v_intake) - 'startup_id' - 'created_at' - 'updated_at'
    END
  );
END;
$$;

-- Backfill intake rows from existing startups (non-destructive)
INSERT INTO public.listing_seller_intake (
  startup_id,
  founder_name,
  one_line_pitch,
  reported_monthly_revenue_usd,
  reported_monthly_profit_usd
)
SELECT
  s.id,
  nullif(trim(s.metadata->>'founder_display_name'), ''),
  nullif(trim(s.tagline), ''),
  CASE WHEN s.annual_revenue IS NOT NULL AND s.annual_revenue > 0 THEN s.annual_revenue / 12 ELSE NULL END,
  s.profit
FROM public.startups s
WHERE NOT EXISTS (
  SELECT 1 FROM public.listing_seller_intake i WHERE i.startup_id = s.id
);

GRANT EXECUTE ON FUNCTION public.founder_save_seller_intake(jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_register_business_proof(uuid, text, text, text, text, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_get_seller_intake(text) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
