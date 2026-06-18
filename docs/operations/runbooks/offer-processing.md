## Symptoms

- Duplicate offers or repeated accept/decline actions
- Users retry and see inconsistent results

## Diagnosis

- Check `offer_idempotency_keys` for key reuse and stored responses
- Check `bids` + `bid_versions` history
- Check `platform_alerts` for offer-related errors

## Root cause patterns

- Missing `Idempotency-Key` from client
- Client retries with different payload under same key
- Race conditions without explicit locking (functions use `FOR UPDATE` on bid rows)

## Resolution

- Ensure client always sends stable `Idempotency-Key` per action
- If same key with different payload: treat as client bug; return 4xx

## Recovery

- For duplicate-like reports: compare `bid_versions` and idempotency response logs

## Escalation

- High duplication: raise `security_abuse_events` for `offer_spam` and alert platform
