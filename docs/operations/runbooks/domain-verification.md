## Symptoms

- “TXT not found” despite user adding it
- Stuck in pending
- Verified then later fails

## Diagnosis

- Use `domain_dns_diagnostics_latest(startup_id)`:
  - `DOMAIN_FOUND_ON_DIFFERENT_HOST` → apex vs www mismatch
  - `DOMAIN_TOKEN_MISMATCH` → stale token
  - `DOMAIN_PROPAGATING` → wait
  - Nameservers in diagnostic → add TXT where those NS are authoritative
- Check `trust_domain_dns_diagnostics` history and `trust_domain_revalidation_runs`
- Check worker health + queue

## Resolution

- Follow `next_action` from diagnostics
- Use auto recheck flow in seller UI
- Cron (`SYNC_WORKER_CRON_SECRET`) runs platform maintenance (MV refresh, domain revalidation); browser invokes only drain jobs for that listing

## Revalidation / grace

- Revalidations are recorded in `trust_domain_revalidation_runs`
- Verification is not revoked immediately; grace period applies before expiring challenge

## Escalation

- If widespread: alert category `verification_failures_spike`
