## Symptoms

- Domain verification stuck pending/failed
- Business email send fails
- Identity verification sessions not updating

## Diagnosis

- Domain: check `domain_dns_diagnostics_latest(startup_id)` + `trust_domain_dns_diagnostics`
- Identity: check `trust_webhook_events` and `identity_verification_sessions`
- Worker: `sync_worker_health_latest()` and `admin_worker_queue_health()`

## Root cause patterns

- DNS: wrong hostname (`apex` vs `www`), nameservers mismatch, stale TXT token, propagation
- Worker: offline/backlogged
- Webhook: replay/duplication or missing metadata

## Resolution

- Domain: follow diagnostics `next_action`; recheck flow should resolve automatically
- Identity: verify Stripe webhook secret, check replay registry
- Email: ensure verified domain matches email domain; check Resend key

## Recovery

- Re-run `/v1/process-jobs` for affected startup_id
- Confirm gates updated via `refresh_listing_gates_from_evidence`

## Escalation

- If failures spike: create `platform_alerts` entry and notify platform owner
