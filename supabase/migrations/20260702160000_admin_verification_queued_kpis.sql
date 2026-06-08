-- Surface queued work in admin ops summary (worker must drain integration_sync_jobs).

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_verification_ops_summary()
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
    'pending_requests', (
      SELECT count(*) FROM public.verification_requests WHERE status = 'pending'
    ),
    'queued_syncs', (
      SELECT count(*) FROM public.integration_syncs WHERE status = 'queued'
    ),
    'pending_worker_jobs', (
      SELECT count(*) FROM public.integration_sync_jobs
      WHERE status = 'pending' AND run_after <= now()
    ),
    'failed_syncs_24h', (
      SELECT count(*) FROM public.integration_syncs
      WHERE status = 'failed' AND created_at > now() - interval '24 hours'
    ),
    'connections_error', (
      SELECT count(*) FROM public.integration_connections WHERE status = 'error'
    ),
    'avg_trust_score', (SELECT round(avg(score), 2) FROM public.trust_scores)
  );
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
