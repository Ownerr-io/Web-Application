## Symptoms

- `/api/sync-worker/health` fails or returns non-200
- Seller verification shows “engine unavailable”
- Queue pending jobs grows continuously

## Diagnosis

- Check `admin_platform_health()` → `worker`, `queue`, `alerts`
- Check `sync_worker_health_latest()` for last success + queue pending
- Confirm Vercel env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SYNC_WORKER_CRON_SECRET`
- Confirm `sys_platform_config` sync worker URLs point to correct deploy

## Root cause patterns

- Missing service role key in Vercel
- Route rewrites sending `/api/*` to SPA
- Bundled worker handlers missing files
- Supabase transient 5xx

## Resolution

- Fix env/rewrites/deploy, then invoke `POST /api/sync-worker/v1/process-jobs`
- Use `verification:drain-jobs` after recovery

## Recovery

- Verify `admin_worker_queue_health()` backlog drains
- Verify domain checks + identity polling resume

## Escalation

- If Supabase 5xx persists: pause jobs, notify ops, open Supabase support ticket.
