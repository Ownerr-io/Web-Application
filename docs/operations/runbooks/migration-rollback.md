## Symptoms

- PostgREST schema reload errors
- New RPCs missing or failing
- Worker tasks failing after deploy

## Diagnosis

- Inspect `ownerr_applied_migrations`
- Re-run `NOTIFY pgrst, 'reload schema'` if needed
- Check `platform_alerts` for migration-related failures

## Root cause patterns

- Missing grants for new RPCs
- RLS policies too strict
- New tables referenced before creation

## Resolution

- Apply forward-fix migration (preferred)
- If emergency: disable new features in app/worker, keep additive schema
- Avoid dropping tables/RPCs unless absolutely necessary

## Recovery

- Run `admin_platform_health()` to confirm green
- Drain worker queues

## Escalation

- If data corruption suspected: stop writes, take snapshot, escalate to DBA
