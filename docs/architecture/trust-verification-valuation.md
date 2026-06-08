# Trust, Verification, Financial Intelligence & Valuation Platform

Production architecture for Ownerr marketplace trust, provider integrations, sync workers, valuation, and AI insights (v1).

## Database migrations (apply in order)

Apply through `20260702180000_verification_first_listings_phase1.sql`.

See also [verification-first-listings.md](./verification-first-listings.md) for lifecycle, gates, and phased rollout.

## Credential security (v1)

| Data                          | Storage                                     | Notes                                                                                                           |
| ----------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| User API keys / OAuth bundles | `integration_credentials.secret_ciphertext` | **Encrypted** with `pgp_sym_encrypt` (reversible — required to call Stripe, etc.).                              |
| Platform key + pepper         | `platform_internal_config`                  | Only readable by `SECURITY DEFINER` RPCs / service role — **no RLS policies** on config table.                  |
| Derived encryption passphrase | `platform_encryption_key()`                 | `SHA-256(pepper \| primary_key)` when pepper is set; else primary key only.                                     |
| One-way fingerprint           | `secret_fingerprint`                        | `SHA-256` hex for audit/dedup — **never** used to call providers (hashing API keys would make sync impossible). |

**Never** put `INTEGRATION_ENCRYPTION_*` or `SUPABASE_SERVICE_ROLE_KEY` in Vite (`VITE_*`). Sellers only send keys over HTTPS to RPC; ciphertext stays in Postgres.

Configure once per environment:

```bash
openssl rand -base64 32   # INTEGRATION_ENCRYPTION_KEY
openssl rand -base64 24   # INTEGRATION_ENCRYPTION_PEPPER (recommended)
openssl rand -base64 32   # SYNC_WORKER_CRON_SECRET
npm run platform:set-integration-secrets
```

If you **add pepper after** providers were connected without pepper, **re-connect** those providers (re-encrypt with new derived key).

## Sync worker (production — no manual seller steps)

Sellers never run CLI. Jobs are enqueued on connect/domain verify; Postgres **`pg_net`** POSTs to your worker when configured.

1. Deploy worker HTTP mode (Docker example):

   ```bash
   docker build -f artifacts/sync-worker/Dockerfile -t ownerr-sync-worker .
   docker run -e SUPABASE_URL -e SUPABASE_SERVICE_ROLE_KEY -e SYNC_WORKER_CRON_SECRET -e SYNC_WORKER_HTTP=1 -p 8787:8787 ownerr-sync-worker
   ```

2. Set in `.env.local` (then `npm run platform:set-integration-secrets`):
   - `SYNC_WORKER_PUBLIC_URL=https://ownerr.live/api/sync-worker` (browser + identity launch)
   - `SYNC_WORKER_INVOKE_URL=https://ownerr.live/api/sync-worker/v1/process-jobs` (pg_net revenue/domain jobs)
   - `SYNC_WORKER_CRON_SECRET=<same as worker>`
   - On Vercel: `SYNC_WORKER_INTERNAL_URL=<private worker origin>` (proxy only; not in Stripe)

   Stripe Identity webhook (Dashboard): `https://ownerr.live/api/webhooks/stripe/identity`

3. Optional: platform cron (GitHub Actions, Fly machines, etc.) `POST /v1/process-jobs` with `Authorization: Bearer <secret>` every 1–5 minutes as backup.

- Local full verification: `npm run dev:with-verification-worker` **or** polling `npm run sync-worker`.

## OAuth providers

Use `integration_complete_oauth` RPC with token bundle JSON after your OAuth callback (GA4, Xero, QuickBooks, etc.).

## Trust & valuation

- Trust: `recompute_startup_trust(startup_id)` — server-only scoring
- Public read: `startup_trust_public(slug)`, `startup_verification_summary(slug)`
- Valuation: `generate_valuation_report(startup_id)` → `publish_valuation_report(report_id)`
- AI (read-only): `generate_ai_insights(startup_id)`

### Seller desk “Verified listings” KPI

Counts a listing only when **both** dimensions have **`pass`** in `verification_results` (via worker + provider/DNS truth):

1. **Revenue** — valid provider key + **MRR > 0** from Stripe (test keys with zero charges → `partial`, not verified).
2. **Domain** — DNS TXT/CNAME at the exact host shown in Verification Center.

## Admin

- `/admin/marketplace/verification` — sync health + audit logs
- RPC: `admin_verification_ops_summary()`, `admin_override_trust(...)`
