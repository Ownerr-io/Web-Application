## Symptoms

- Stripe Identity webhook returns 4xx/5xx
- Identity sessions never move to verified/failed

## Diagnosis

- Check `trust_webhook_events` (or `verification_webhook_events` view)
- Check `webhook_event_registry` for replay/dup entries
- Check `admin_platform_health()` → `webhooks`

## Root cause patterns

- Wrong webhook secret in env
- Missing `metadata.ownerr_session_id` on Stripe events
- Rewrites or function runtime errors

## Resolution

- Fix env secret, redeploy
- Re-send webhook from Stripe dashboard (replay-safe)

## Recovery

- Validate session state in `identity_verification_sessions`
- Run worker `/v1/process-jobs` to refresh gates if needed

## Escalation

- If repeated failures: create alert category `webhook_failures_spike`
