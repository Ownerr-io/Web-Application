-- Trust, Verification, Financial Intelligence & Valuation platform (schema + RLS)
-- Rollback: drop new tables in reverse dependency order (see docs/architecture/trust-verification-valuation.md)

BEGIN;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.startup_owned_by_auth(p_startup_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.startups s
    WHERE s.id = p_startup_id AND s.founder_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.startup_owned_by_auth_slug(p_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.startups s
    WHERE s.slug = p_slug AND s.founder_user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.startup_owned_by_auth(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.startup_owned_by_auth_slug(text) TO authenticated;

-- Internal encryption key material (set via service role / migration seed in prod)
CREATE TABLE IF NOT EXISTS public.platform_internal_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_internal_config ENABLE ROW LEVEL SECURITY;
-- No policies: only SECURITY DEFINER functions and service role access

CREATE OR REPLACE FUNCTION public.platform_encryption_key()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k text;
BEGIN
  SELECT value INTO k FROM public.platform_internal_config WHERE key = 'integration_encryption_key';
  IF k IS NULL OR length(k) < 32 THEN
    RAISE EXCEPTION 'integration_encryption_key not configured on platform';
  END IF;
  RETURN k;
END;
$$;

-- ---------------------------------------------------------------------------
-- verification_providers (catalog)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verification_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  category text NOT NULL CHECK (
    category IN ('revenue', 'traffic', 'accounting', 'banking', 'domain')
  ),
  display_name text NOT NULL,
  auth_type text NOT NULL CHECK (auth_type IN ('api_key', 'oauth2', 'link', 'dns')),
  config_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Extend verification_requests
-- ---------------------------------------------------------------------------
ALTER TABLE public.verification_requests
  ADD COLUMN IF NOT EXISTS request_type text NOT NULL DEFAULT 'manual'
    CHECK (request_type IN ('revenue', 'traffic', 'accounting', 'banking', 'domain', 'bundle', 'manual')),
  ADD COLUMN IF NOT EXISTS connection_id uuid,
  ADD COLUMN IF NOT EXISTS requested_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS request_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- integration_connections
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.integration_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startups (id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.verification_providers (id),
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'connected', 'degraded', 'disconnected', 'error')
  ),
  external_account_id text,
  scopes text[] NOT NULL DEFAULT '{}',
  health_status text NOT NULL DEFAULT 'unknown' CHECK (
    health_status IN ('unknown', 'healthy', 'degraded', 'unhealthy')
  ),
  last_sync_at timestamptz,
  last_error text,
  sync_cursor jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id, provider_id)
);

CREATE INDEX IF NOT EXISTS integration_connections_startup_idx
  ON public.integration_connections (startup_id);

ALTER TABLE public.verification_requests
  DROP CONSTRAINT IF EXISTS verification_requests_connection_id_fkey;

ALTER TABLE public.verification_requests
  ADD CONSTRAINT verification_requests_connection_id_fkey
  FOREIGN KEY (connection_id) REFERENCES public.integration_connections (id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- integration_credentials (ciphertext only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.integration_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL UNIQUE REFERENCES public.integration_connections (id) ON DELETE CASCADE,
  credential_type text NOT NULL CHECK (
    credential_type IN ('access', 'refresh', 'api_key', 'webhook_secret', 'oauth_bundle')
  ),
  secret_ciphertext bytea NOT NULL,
  expires_at timestamptz,
  rotated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- integration_syncs + jobs queue
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.integration_syncs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.integration_connections (id) ON DELETE CASCADE,
  sync_type text NOT NULL CHECK (sync_type IN ('full', 'incremental', 'health', 'domain_check')),
  status text NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'running', 'succeeded', 'failed', 'partial')
  ),
  started_at timestamptz,
  finished_at timestamptz,
  records_written integer NOT NULL DEFAULT 0,
  error_code text,
  error_message text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS integration_syncs_connection_idx
  ON public.integration_syncs (connection_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.integration_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.integration_connections (id) ON DELETE CASCADE,
  job_type text NOT NULL DEFAULT 'sync',
  run_after timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'claimed', 'completed', 'failed', 'dead')
  ),
  last_error text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS integration_sync_jobs_pending_idx
  ON public.integration_sync_jobs (status, run_after)
  WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- verification_results + events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verification_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startups (id) ON DELETE CASCADE,
  provider_id uuid REFERENCES public.verification_providers (id) ON DELETE SET NULL,
  connection_id uuid REFERENCES public.integration_connections (id) ON DELETE SET NULL,
  dimension text NOT NULL CHECK (
    dimension IN ('revenue', 'traffic', 'accounting', 'banking', 'domain')
  ),
  status text NOT NULL CHECK (status IN ('pass', 'fail', 'partial', 'expired', 'pending')),
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_ref jsonb NOT NULL DEFAULT '{}'::jsonb,
  valid_from timestamptz,
  valid_until timestamptz,
  computed_at timestamptz NOT NULL DEFAULT now(),
  superseded_by uuid REFERENCES public.verification_results (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS verification_results_startup_dim_idx
  ON public.verification_results (startup_id, dimension, computed_at DESC);

CREATE TABLE IF NOT EXISTS public.verification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.verification_requests (id) ON DELETE SET NULL,
  startup_id uuid NOT NULL REFERENCES public.startups (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('system', 'user', 'admin', 'worker')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS verification_events_startup_idx
  ON public.verification_events (startup_id, created_at DESC);

-- Domain challenges
CREATE TABLE IF NOT EXISTS public.domain_verification_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startups (id) ON DELETE CASCADE,
  domain text NOT NULL,
  method text NOT NULL CHECK (method IN ('txt', 'cname')),
  expected_record text NOT NULL,
  host text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'verified', 'failed', 'expired')
  ),
  verified_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id, method)
);

-- ---------------------------------------------------------------------------
-- Metrics
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.financial_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startups (id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  granularity text NOT NULL CHECK (granularity IN ('day', 'month')),
  mrr numeric,
  arr numeric,
  net_revenue numeric,
  refunds numeric,
  currency text NOT NULL DEFAULT 'USD',
  source_connection_id uuid REFERENCES public.integration_connections (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id, period_start, granularity, source_connection_id)
);

CREATE TABLE IF NOT EXISTS public.traffic_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startups (id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  sessions bigint,
  users bigint,
  pageviews bigint,
  source text,
  connection_id uuid REFERENCES public.integration_connections (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id, period_start, connection_id)
);

CREATE TABLE IF NOT EXISTS public.accounting_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startups (id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  revenue numeric,
  cogs numeric,
  opex numeric,
  net_income numeric,
  currency text NOT NULL DEFAULT 'USD',
  connection_id uuid REFERENCES public.integration_connections (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id, period_start, connection_id)
);

CREATE TABLE IF NOT EXISTS public.bank_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startups (id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  inflows numeric,
  outflows numeric,
  balance_avg numeric,
  currency text NOT NULL DEFAULT 'USD',
  connection_id uuid REFERENCES public.integration_connections (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id, period_start, connection_id)
);

-- ---------------------------------------------------------------------------
-- Trust
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trust_scores (
  startup_id uuid PRIMARY KEY REFERENCES public.startups (id) ON DELETE CASCADE,
  score numeric(5, 2) NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  level text NOT NULL DEFAULT 'unverified' CHECK (
    level IN ('unverified', 'basic', 'verified', 'trusted', 'elite')
  ),
  version integer NOT NULL DEFAULT 1,
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trust_score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startups (id) ON DELETE CASCADE,
  score numeric(5, 2) NOT NULL,
  level text NOT NULL,
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  trigger text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trust_score_history_startup_idx
  ON public.trust_score_history (startup_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.trust_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startups (id) ON DELETE CASCADE,
  signal_key text NOT NULL,
  weight numeric NOT NULL DEFAULT 0,
  value numeric,
  source text NOT NULL CHECK (source IN ('provider', 'rule', 'fraud', 'profile')),
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trust_signals_startup_active_idx
  ON public.trust_signals (startup_id) WHERE active = true;

-- ---------------------------------------------------------------------------
-- Valuation
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.valuation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startups (id) ON DELETE CASCADE,
  report_version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'published', 'superseded')
  ),
  low_amount numeric,
  expected_amount numeric,
  high_amount numeric,
  currency text NOT NULL DEFAULT 'USD',
  confidence text NOT NULL DEFAULT 'low' CHECK (confidence IN ('low', 'medium', 'high')),
  trust_score_at_compute numeric(5, 2),
  explanation jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_version text NOT NULL DEFAULT 'ownerr-v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE INDEX IF NOT EXISTS valuation_reports_startup_idx
  ON public.valuation_reports (startup_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.valuation_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.valuation_reports (id) ON DELETE CASCADE,
  input_key text NOT NULL,
  input_value jsonb NOT NULL,
  source text NOT NULL CHECK (source IN ('metric', 'user', 'admin', 'computed'))
);

CREATE TABLE IF NOT EXISTS public.valuation_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.valuation_reports (id) ON DELETE CASCADE,
  adjustment_key text NOT NULL,
  delta_pct numeric,
  reason text NOT NULL,
  rule_id text
);

CREATE TABLE IF NOT EXISTS public.valuation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startups (id) ON DELETE CASCADE,
  report_id uuid NOT NULL REFERENCES public.valuation_reports (id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Audit + AI insights
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL,
  subject_id uuid NOT NULL,
  action text NOT NULL,
  actor_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  actor_role text,
  ip_hash text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Pre-existing audit_logs may use legacy column names or omit trust-platform columns.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'entity_type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'subject_type'
  ) THEN
    ALTER TABLE public.audit_logs RENAME COLUMN entity_type TO subject_type;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'entity_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'subject_id'
  ) THEN
    ALTER TABLE public.audit_logs RENAME COLUMN entity_id TO subject_id;
  END IF;
END $$;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS subject_type text,
  ADD COLUMN IF NOT EXISTS subject_id uuid,
  ADD COLUMN IF NOT EXISTS action text,
  ADD COLUMN IF NOT EXISTS actor_user_id uuid,
  ADD COLUMN IF NOT EXISTS actor_role text,
  ADD COLUMN IF NOT EXISTS ip_hash text,
  ADD COLUMN IF NOT EXISTS before_state jsonb,
  ADD COLUMN IF NOT EXISTS after_state jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

UPDATE public.audit_logs
SET
  subject_type = COALESCE(subject_type, 'legacy'),
  subject_id = COALESCE(subject_id, id),
  action = COALESCE(action, 'legacy'),
  created_at = COALESCE(created_at, now())
WHERE subject_type IS NULL
   OR subject_id IS NULL
   OR action IS NULL
   OR created_at IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'subject_type'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'subject_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'created_at'
  ) THEN
    CREATE INDEX IF NOT EXISTS audit_logs_subject_idx
      ON public.audit_logs (subject_type, subject_id, created_at DESC);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.ai_insight_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startups (id) ON DELETE CASCADE,
  insight_type text NOT NULL,
  input_snapshot_hash text NOT NULL,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Seed verification_providers
-- ---------------------------------------------------------------------------
INSERT INTO public.verification_providers (slug, category, display_name, auth_type, sort_order)
VALUES
  ('stripe', 'revenue', 'Stripe', 'api_key', 10),
  ('paddle', 'revenue', 'Paddle', 'api_key', 20),
  ('lemonsqueezy', 'revenue', 'Lemon Squeezy', 'api_key', 30),
  ('revenuecat', 'revenue', 'RevenueCat', 'api_key', 40),
  ('razorpay', 'revenue', 'Razorpay', 'api_key', 50),
  ('shopify', 'revenue', 'Shopify', 'oauth2', 60),
  ('ga4', 'traffic', 'Google Analytics 4', 'oauth2', 10),
  ('google_search_console', 'traffic', 'Google Search Console', 'oauth2', 20),
  ('ahrefs', 'traffic', 'Ahrefs', 'api_key', 30),
  ('semrush', 'traffic', 'Semrush', 'api_key', 40),
  ('similarweb', 'traffic', 'SimilarWeb', 'api_key', 50),
  ('quickbooks', 'accounting', 'QuickBooks', 'oauth2', 10),
  ('xero', 'accounting', 'Xero', 'oauth2', 20),
  ('zoho_books', 'accounting', 'Zoho Books', 'oauth2', 30),
  ('plaid', 'banking', 'Plaid', 'link', 10),
  ('tink', 'banking', 'Tink', 'oauth2', 20),
  ('diro', 'banking', 'Diro', 'api_key', 30),
  ('domain', 'domain', 'Domain Ownership', 'dns', 1)
ON CONFLICT (slug) DO NOTHING;

-- Reset misleading metadata verification flags (honest backfill)
UPDATE public.startups
SET
  verified = false,
  metadata = metadata
    - 'revenue_verified'
    - 'domain_verified'
    - 'traffic_verified'
    - 'revenue_provider'
WHERE metadata ?| array['revenue_verified', 'domain_verified', 'traffic_verified'];

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.verification_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_syncs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_verification_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valuation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valuation_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valuation_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valuation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insight_runs ENABLE ROW LEVEL SECURITY;

-- verification_providers: read enabled
DROP POLICY IF EXISTS verification_providers_read ON public.verification_providers;
CREATE POLICY verification_providers_read ON public.verification_providers
  FOR SELECT TO authenticated USING (is_enabled = true OR is_platform_admin());

DROP POLICY IF EXISTS verification_providers_admin ON public.verification_providers;
CREATE POLICY verification_providers_admin ON public.verification_providers
  FOR ALL TO authenticated USING (is_platform_admin()) WITH CHECK (is_platform_admin());

-- integration_connections
DROP POLICY IF EXISTS integration_connections_founder ON public.integration_connections;
CREATE POLICY integration_connections_founder ON public.integration_connections
  FOR SELECT TO authenticated
  USING (startup_owned_by_auth(startup_id) OR is_platform_admin());

DROP POLICY IF EXISTS integration_connections_admin ON public.integration_connections;
CREATE POLICY integration_connections_admin ON public.integration_connections
  FOR ALL TO authenticated USING (is_platform_admin()) WITH CHECK (is_platform_admin());

-- credentials: no client access
-- syncs: founder read
DROP POLICY IF EXISTS integration_syncs_read ON public.integration_syncs;
CREATE POLICY integration_syncs_read ON public.integration_syncs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.integration_connections c
      WHERE c.id = connection_id AND (startup_owned_by_auth(c.startup_id) OR is_platform_admin())
    )
  );

-- jobs: admin only read
DROP POLICY IF EXISTS integration_sync_jobs_admin ON public.integration_sync_jobs;
CREATE POLICY integration_sync_jobs_admin ON public.integration_sync_jobs
  FOR SELECT TO authenticated USING (is_platform_admin());

-- verification results/events
DROP POLICY IF EXISTS verification_results_read ON public.verification_results;
CREATE POLICY verification_results_read ON public.verification_results
  FOR SELECT TO authenticated
  USING (startup_owned_by_auth(startup_id) OR is_platform_admin());

DROP POLICY IF EXISTS verification_events_read ON public.verification_events;
CREATE POLICY verification_events_read ON public.verification_events
  FOR SELECT TO authenticated
  USING (startup_owned_by_auth(startup_id) OR is_platform_admin());

-- domain challenges
DROP POLICY IF EXISTS domain_challenges_founder ON public.domain_verification_challenges;
CREATE POLICY domain_challenges_founder ON public.domain_verification_challenges
  FOR SELECT TO authenticated
  USING (startup_owned_by_auth(startup_id) OR is_platform_admin());

-- metrics + trust + valuation read for founder/admin
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'financial_metrics', 'traffic_metrics', 'accounting_metrics', 'bank_metrics',
    'trust_scores', 'trust_score_history', 'trust_signals',
    'valuation_reports', 'valuation_history',
    'ai_insight_runs'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_read ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_read ON public.%I FOR SELECT TO authenticated USING (startup_owned_by_auth(startup_id) OR is_platform_admin())',
      t, t
    );
  END LOOP;
END $$;

-- valuation child tables via report
DROP POLICY IF EXISTS valuation_inputs_read ON public.valuation_inputs;
CREATE POLICY valuation_inputs_read ON public.valuation_inputs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.valuation_reports r
      WHERE r.id = report_id AND (startup_owned_by_auth(r.startup_id) OR is_platform_admin())
    )
  );

DROP POLICY IF EXISTS valuation_adjustments_read ON public.valuation_adjustments;
CREATE POLICY valuation_adjustments_read ON public.valuation_adjustments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.valuation_reports r
      WHERE r.id = report_id AND (startup_owned_by_auth(r.startup_id) OR is_platform_admin())
    )
  );

-- audit logs: admin only
DO $$
BEGIN
  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS audit_logs_admin ON public.audit_logs';
    EXECUTE $p$
      CREATE POLICY audit_logs_admin ON public.audit_logs
        FOR SELECT TO authenticated USING (is_platform_admin())
    $p$;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
