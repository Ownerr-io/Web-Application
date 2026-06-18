-- Platform ops readiness: internal worker tasks, MV refresh automation, queue health, alerts,
-- backups health, abuse monitoring, offer idempotency, webhook replay registry, domain revalidation,
-- and unified admin health center. Additive + backward compatible.

BEGIN;

-- ---------------------------------------------------------------------------
-- P1: Materialized view refresh automation tracking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sys_mv_refresh_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  error_message text
);

CREATE INDEX IF NOT EXISTS sys_mv_refresh_runs_started_idx
  ON public.sys_mv_refresh_runs (started_at DESC);

ALTER TABLE public.sys_mv_refresh_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sys_mv_refresh_runs_admin_read ON public.sys_mv_refresh_runs;
CREATE POLICY sys_mv_refresh_runs_admin_read
  ON public.sys_mv_refresh_runs
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- P1/P3: Internal worker task queue (separate from integration jobs)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sys_worker_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'completed', 'failed', 'dead')),
  run_after timestamptz NOT NULL DEFAULT now(),
  claimed_by text,
  claimed_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sys_worker_tasks_pending_idx
  ON public.sys_worker_tasks (status, run_after)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS sys_worker_tasks_type_idx
  ON public.sys_worker_tasks (task_type, status, run_after);

ALTER TABLE public.sys_worker_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sys_worker_tasks_admin_read ON public.sys_worker_tasks;
CREATE POLICY sys_worker_tasks_admin_read
  ON public.sys_worker_tasks
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

-- Claim/complete APIs for worker (service_role only). Do NOT change existing integration queue RPCs.
CREATE OR REPLACE FUNCTION public.claim_sys_worker_task(p_worker_id text)
RETURNS public.sys_worker_tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task public.sys_worker_tasks%ROWTYPE;
BEGIN
  -- Pick the earliest runnable pending task and claim it.
  SELECT * INTO v_task
  FROM public.sys_worker_tasks
  WHERE status = 'pending'
    AND run_after <= now()
  ORDER BY run_after ASC, created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE public.sys_worker_tasks
  SET status = 'claimed',
      claimed_by = p_worker_id,
      claimed_at = now(),
      attempts = attempts + 1,
      updated_at = now()
  WHERE id = v_task.id
  RETURNING * INTO v_task;

  RETURN v_task;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_sys_worker_task(
  p_task_id uuid,
  p_success boolean,
  p_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task public.sys_worker_tasks%ROWTYPE;
  v_new_status text;
BEGIN
  SELECT * INTO v_task FROM public.sys_worker_tasks WHERE id = p_task_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF p_success THEN
    v_new_status := 'completed';
  ELSE
    v_new_status := CASE
      WHEN v_task.attempts >= v_task.max_attempts THEN 'dead'
      ELSE 'failed'
    END;
  END IF;

  UPDATE public.sys_worker_tasks
  SET status = v_new_status,
      last_error = CASE WHEN p_success THEN NULL ELSE coalesce(p_error, last_error) END,
      updated_at = now()
  WHERE id = p_task_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_sys_worker_task(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_sys_worker_task(uuid, boolean, text) TO service_role;

-- ---------------------------------------------------------------------------
-- P1: MV refresh runner RPC (safe to call from worker task)
-- - prevents overlap with advisory lock
-- - tracks runs + errors
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.run_marketplace_materialized_view_refresh()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock boolean;
  v_run_id uuid;
  v_started timestamptz := now();
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  -- lock key: arbitrary constant scoped to DB
  v_lock := pg_try_advisory_lock(42424201);
  IF NOT v_lock THEN
    RETURN;
  END IF;

  INSERT INTO public.sys_mv_refresh_runs DEFAULT VALUES RETURNING id INTO v_run_id;

  BEGIN
    PERFORM public.refresh_marketplace_materialized_views();
    UPDATE public.sys_mv_refresh_runs
    SET finished_at = now(),
        duration_ms = greatest(0, (extract(epoch from (now() - v_started)) * 1000)::int),
        status = 'success'
    WHERE id = v_run_id;
  EXCEPTION WHEN others THEN
    UPDATE public.sys_mv_refresh_runs
    SET finished_at = now(),
        duration_ms = greatest(0, (extract(epoch from (now() - v_started)) * 1000)::int),
        status = 'failed',
        error_message = left(sqlerrm, 2000)
    WHERE id = v_run_id;
    RAISE;
  END;

  PERFORM pg_advisory_unlock(42424201);
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_marketplace_materialized_view_refresh() TO service_role, authenticated;

CREATE OR REPLACE FUNCTION public.admin_materialized_view_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last public.sys_mv_refresh_runs%ROWTYPE;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_last
  FROM public.sys_mv_refresh_runs
  ORDER BY started_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'last_refresh_at', v_last.started_at,
    'duration_ms', v_last.duration_ms,
    'status', v_last.status,
    'error_message', v_last.error_message
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_materialized_view_health() TO authenticated;

-- ---------------------------------------------------------------------------
-- P2: Domain revalidation engine
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trust_domain_revalidation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.marketplace_companies (id) ON DELETE CASCADE,
  challenge_id uuid REFERENCES public.trust_domain_challenges (id) ON DELETE SET NULL,
  host text NOT NULL,
  expected_token text NOT NULL,
  passed boolean NOT NULL,
  reason text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trust_domain_revalidation_runs_startup_idx
  ON public.trust_domain_revalidation_runs (startup_id, created_at DESC);

ALTER TABLE public.trust_domain_revalidation_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS trust_domain_revalidation_runs_owner_read ON public.trust_domain_revalidation_runs;
CREATE POLICY trust_domain_revalidation_runs_owner_read
  ON public.trust_domain_revalidation_runs
  FOR SELECT
  TO authenticated
  USING (public.startup_owned_by_auth(startup_id) OR public.is_platform_admin());

-- Add minimal revalidation state to challenges (additive).
ALTER TABLE public.trust_domain_challenges
  ADD COLUMN IF NOT EXISTS last_revalidated_at timestamptz,
  ADD COLUMN IF NOT EXISTS revalidate_after timestamptz,
  ADD COLUMN IF NOT EXISTS revalidation_fail_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_revalidation_status text;

-- Helper: schedule revalidation tasks for verified domains due.
CREATE OR REPLACE FUNCTION public.enqueue_domain_revalidation_tasks(
  p_max integer DEFAULT 50
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.sys_worker_tasks (task_type, payload)
  SELECT
    'domain_revalidation',
    jsonb_build_object(
      'challenge_id', c.id,
      'startup_id', c.startup_id
    )
  FROM public.trust_domain_challenges c
  WHERE c.status = 'verified'
    AND coalesce(c.revalidate_after, c.last_revalidated_at, c.verified_at, c.created_at) <= now()
  ORDER BY coalesce(c.revalidate_after, c.last_revalidated_at, c.verified_at, c.created_at) ASC
  LIMIT greatest(1, least(coalesce(p_max, 50), 200))
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_domain_revalidation_tasks(integer) TO service_role, authenticated;

-- ---------------------------------------------------------------------------
-- P3: Queue health RPC (dashboard-ready)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_worker_queue_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending integer;
  v_running integer;
  v_completed integer;
  v_failed integer;
  v_oldest_age_seconds integer;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  SELECT count(*)::integer INTO v_pending FROM public.trust_integration_jobs WHERE status = 'pending';
  SELECT count(*)::integer INTO v_running FROM public.trust_integration_jobs WHERE status = 'claimed';
  SELECT count(*)::integer INTO v_completed FROM public.trust_integration_jobs WHERE status = 'completed';
  SELECT count(*)::integer INTO v_failed FROM public.trust_integration_jobs WHERE status IN ('failed', 'dead');

  SELECT coalesce(extract(epoch from (now() - min(created_at)))::int, 0)
  INTO v_oldest_age_seconds
  FROM public.trust_integration_jobs
  WHERE status = 'pending';

  RETURN jsonb_build_object(
    'integration_jobs', jsonb_build_object(
      'pending_jobs', v_pending,
      'running_jobs', v_running,
      'completed_jobs', v_completed,
      'failed_jobs', v_failed,
      'oldest_pending_job_age_seconds', v_oldest_age_seconds
    ),
    'system_tasks', jsonb_build_object(
      'pending_tasks', (SELECT count(*)::int FROM public.sys_worker_tasks WHERE status = 'pending'),
      'running_tasks', (SELECT count(*)::int FROM public.sys_worker_tasks WHERE status = 'claimed'),
      'failed_tasks', (SELECT count(*)::int FROM public.sys_worker_tasks WHERE status IN ('failed','dead'))
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_worker_queue_health() TO authenticated;

-- ---------------------------------------------------------------------------
-- P4: Internal alerting table + admin RPC
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  category text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS platform_alerts_open_idx
  ON public.platform_alerts (resolved_at, created_at DESC);

ALTER TABLE public.platform_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_alerts_admin_read ON public.platform_alerts;
CREATE POLICY platform_alerts_admin_read
  ON public.platform_alerts
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.admin_platform_alerts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'id', a.id,
      'severity', a.severity,
      'category', a.category,
      'message', a.message,
      'created_at', a.created_at,
      'resolved_at', a.resolved_at,
      'details', a.details
    ) ORDER BY a.created_at DESC)
    FROM public.platform_alerts a
    WHERE a.resolved_at IS NULL
  ), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_platform_alerts() TO authenticated;

-- ---------------------------------------------------------------------------
-- P5: Backup health (manual/automated checks can populate this)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_backup_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  last_backup_check timestamptz,
  backup_status text NOT NULL DEFAULT 'unknown' CHECK (backup_status IN ('unknown','ok','degraded','failed')),
  recovery_test_status text NOT NULL DEFAULT 'unknown' CHECK (recovery_test_status IN ('unknown','ok','failed')),
  recovery_test_at timestamptz,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_backup_health ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_backup_health_admin_read ON public.platform_backup_health;
CREATE POLICY platform_backup_health_admin_read
  ON public.platform_backup_health
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.admin_backup_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.platform_backup_health%ROWTYPE;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_row FROM public.platform_backup_health ORDER BY updated_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'backup_status','unknown',
      'recovery_test_status','unknown'
    );
  END IF;
  RETURN jsonb_build_object(
    'last_backup_check', v_row.last_backup_check,
    'backup_status', v_row.backup_status,
    'recovery_test_status', v_row.recovery_test_status,
    'recovery_test_at', v_row.recovery_test_at,
    'details', v_row.details,
    'updated_at', v_row.updated_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_backup_health() TO authenticated;

-- ---------------------------------------------------------------------------
-- P6: Abuse monitoring (flag only; no blocking)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.security_abuse_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  ip_hash text,
  event_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info','warning','error')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS security_abuse_events_created_idx
  ON public.security_abuse_events (created_at DESC);

ALTER TABLE public.security_abuse_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS security_abuse_events_admin_read ON public.security_abuse_events;
CREATE POLICY security_abuse_events_admin_read
  ON public.security_abuse_events
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.log_security_abuse_event(
  p_event_type text,
  p_severity text DEFAULT 'info',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_abuse_events (user_id, event_type, severity, metadata)
  VALUES (auth.uid(), coalesce(nullif(trim(p_event_type),''),'unknown'), coalesce(nullif(trim(p_severity),''),'info'), coalesce(p_metadata,'{}'::jsonb));
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_security_abuse_event(text, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_security_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'last_24h', jsonb_build_object(
      'total', (SELECT count(*)::int FROM public.security_abuse_events WHERE created_at > now() - interval '24 hours'),
      'offer_spam', (SELECT count(*)::int FROM public.security_abuse_events WHERE event_type LIKE 'offer_%' AND created_at > now() - interval '24 hours'),
      'message_spam', (SELECT count(*)::int FROM public.security_abuse_events WHERE event_type LIKE 'message_%' AND created_at > now() - interval '24 hours'),
      'verification_spam', (SELECT count(*)::int FROM public.security_abuse_events WHERE event_type LIKE 'verification_%' AND created_at > now() - interval '24 hours')
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_security_dashboard() TO authenticated;

-- ---------------------------------------------------------------------------
-- P7: Offer idempotency keys
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.offer_idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL,
  user_id uuid NOT NULL,
  request_hash text NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS offer_idempotency_keys_created_idx
  ON public.offer_idempotency_keys (created_at DESC);

ALTER TABLE public.offer_idempotency_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS offer_idempotency_keys_admin_read ON public.offer_idempotency_keys;
CREATE POLICY offer_idempotency_keys_admin_read
  ON public.offer_idempotency_keys
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- P8: Webhook replay registry (additive; existing trust_webhook_events remains)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_event_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  payload_hash text,
  UNIQUE (provider, event_id)
);

ALTER TABLE public.webhook_event_registry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS webhook_event_registry_admin_read ON public.webhook_event_registry;
CREATE POLICY webhook_event_registry_admin_read
  ON public.webhook_event_registry
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- P11: Unified platform health center
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_platform_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'materialized_views', public.admin_materialized_view_health(),
    'queue', public.admin_worker_queue_health(),
    'alerts', public.admin_platform_alerts(),
    'backups', public.admin_backup_health(),
    'abuse_monitoring', public.admin_security_dashboard(),
    'worker', public.sync_worker_health_latest(),
    'webhooks', jsonb_build_object(
      'last_24h', (SELECT count(*)::int FROM public.trust_webhook_events WHERE created_at > now() - interval '24 hours'),
      'failures_last_24h', (SELECT count(*)::int FROM public.trust_webhook_events WHERE created_at > now() - interval '24 hours' AND (payload->>'error') IS NOT NULL)
    ),
    'verification', jsonb_build_object(
      'domain_revalidations_last_24h', (SELECT count(*)::int FROM public.trust_domain_revalidation_runs WHERE created_at > now() - interval '24 hours')
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_platform_health() TO authenticated;

COMMIT;

