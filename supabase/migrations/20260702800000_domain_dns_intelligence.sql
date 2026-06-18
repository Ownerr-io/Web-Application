-- Provider-agnostic domain DNS diagnostics + sync worker health snapshots (additive).

BEGIN;

CREATE TABLE IF NOT EXISTS public.trust_domain_dns_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.marketplace_companies (id) ON DELETE CASCADE,
  challenge_id uuid REFERENCES public.trust_domain_challenges (id) ON DELETE SET NULL,
  entered_domain text NOT NULL,
  verification_host text NOT NULL,
  status text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'error')),
  title text NOT NULL,
  description text NOT NULL,
  next_action text NOT NULL,
  queried_host text NOT NULL,
  expected_token text NOT NULL,
  found_records jsonb NOT NULL DEFAULT '[]'::jsonb,
  nameservers jsonb NOT NULL DEFAULT '[]'::jsonb,
  resolver_observations jsonb NOT NULL DEFAULT '{}'::jsonb,
  worker_health jsonb,
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trust_domain_dns_diagnostics_startup_checked_idx
  ON public.trust_domain_dns_diagnostics (startup_id, checked_at DESC);

CREATE INDEX IF NOT EXISTS trust_domain_dns_diagnostics_challenge_idx
  ON public.trust_domain_dns_diagnostics (challenge_id)
  WHERE challenge_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.sys_sync_worker_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_at timestamptz NOT NULL DEFAULT now(),
  engine_status text NOT NULL CHECK (engine_status IN ('online', 'offline', 'degraded')),
  queue_pending integer NOT NULL DEFAULT 0,
  avg_processing_seconds numeric,
  last_success_at timestamptz,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS sys_sync_worker_health_snapshots_captured_idx
  ON public.sys_sync_worker_health_snapshots (captured_at DESC);

ALTER TABLE public.trust_domain_dns_diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_sync_worker_health_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trust_domain_dns_diagnostics_owner_read
  ON public.trust_domain_dns_diagnostics;
CREATE POLICY trust_domain_dns_diagnostics_owner_read
  ON public.trust_domain_dns_diagnostics
  FOR SELECT
  TO authenticated
  USING (
    public.startup_owned_by_auth(startup_id)
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS sys_sync_worker_health_snapshots_authenticated_read
  ON public.sys_sync_worker_health_snapshots;
CREATE POLICY sys_sync_worker_health_snapshots_authenticated_read
  ON public.sys_sync_worker_health_snapshots
  FOR SELECT
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.domain_dns_diagnostics_latest(p_startup_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.trust_domain_dns_diagnostics%ROWTYPE;
BEGIN
  IF NOT public.startup_owned_by_auth(p_startup_id) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_row
  FROM public.trust_domain_dns_diagnostics
  WHERE startup_id = p_startup_id
  ORDER BY checked_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'status', v_row.status,
    'severity', v_row.severity,
    'title', v_row.title,
    'description', v_row.description,
    'next_action', v_row.next_action,
    'queried_host', v_row.queried_host,
    'expected_token', v_row.expected_token,
    'found_records', v_row.found_records,
    'nameservers', v_row.nameservers,
    'checked_at', v_row.checked_at,
    'entered_domain', v_row.entered_domain,
    'verification_host', v_row.verification_host,
    'resolver_observations', v_row.resolver_observations,
    'worker_health', v_row.worker_health
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_worker_health_latest()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.sys_sync_worker_health_snapshots%ROWTYPE;
  v_pending integer := 0;
BEGIN
  SELECT count(*)::integer INTO v_pending
  FROM public.trust_integration_jobs j
  WHERE j.status = 'pending';

  SELECT * INTO v_row
  FROM public.sys_sync_worker_health_snapshots
  ORDER BY captured_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'engine_status', 'online',
      'queue_pending', v_pending,
      'avg_processing_seconds', null,
      'last_success_at', null,
      'captured_at', now()
    );
  END IF;

  RETURN jsonb_build_object(
    'engine_status', v_row.engine_status,
    'queue_pending', greatest(v_row.queue_pending, v_pending),
    'avg_processing_seconds', v_row.avg_processing_seconds,
    'last_success_at', v_row.last_success_at,
    'captured_at', v_row.captured_at,
    'details', v_row.details
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.support_export_domain_diagnostics(p_startup_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_diag jsonb;
  v_health jsonb;
  v_domain text;
  v_host text;
  v_found text;
  v_ns text;
BEGIN
  IF NOT public.startup_owned_by_auth(p_startup_id) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_diag := public.domain_dns_diagnostics_latest(p_startup_id);
  v_health := public.sync_worker_health_latest();

  v_domain := coalesce(v_diag->>'entered_domain', '(unknown)');
  v_host := coalesce(v_diag->>'verification_host', v_diag->>'queried_host', '(unknown)');
  v_found := coalesce(v_diag->>'found_records', '[]');
  v_ns := coalesce(v_diag->>'nameservers', '[]');

  RETURN format(
    E'Domain:\n%s\n\nVerification Host:\n%s\n\nNameservers:\n%s\n\nExpected Token:\n%s\n\nFound TXT:\n%s\n\nStatus:\n%s — %s\n\nNext action:\n%s\n\nLast Checked:\n%s\n\nWorker Status:\n%s (queue pending: %s)\n',
    v_domain,
    v_host,
    v_ns,
    coalesce(v_diag->>'expected_token', '(none)'),
    v_found,
    coalesce(v_diag->>'status', '(no check yet)'),
    coalesce(v_diag->>'title', ''),
    coalesce(v_diag->>'next_action', ''),
    coalesce(v_diag->>'checked_at', '(never)'),
    coalesce(v_health->>'engine_status', 'unknown'),
    coalesce(v_health->>'queue_pending', '0')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.domain_dns_diagnostics_latest(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_worker_health_latest() TO authenticated;
GRANT EXECUTE ON FUNCTION public.support_export_domain_diagnostics(uuid) TO authenticated;

COMMIT;
