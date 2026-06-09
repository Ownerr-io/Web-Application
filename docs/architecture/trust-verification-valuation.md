# Trust, Verification, Financial Intelligence & Valuation Platform

Production architecture for Ownerr marketplace trust, provider integrations, sync workers, valuation, and AI insights (v1).

See also [verification-first-listings.md](./verification-first-listings.md) for lifecycle, gates, and phased rollout.

## Credential security (v1)

| Data                          | Storage                                     | Notes                                                                                                           |
| ----------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| User API keys / OAuth bundles | `integration_credentials.secret_ciphertext` | **Encrypted** with `pgp_sym_encrypt` (reversible — required to call Stripe, etc.).                              |
| Platform key + pepper         | `sys_platform_config`                       | Only readable by `SECURITY DEFINER` RPCs / service role — **no RLS policies** on config table.                  |
| Derived encryption passphrase | `platform_encryption_key()`                 | `SHA-256(pepper \| primary_key)` when pepper is set; else primary key only.                                     |
| One-way fingerprint           | `secret_fingerprint`                        | `SHA-256` hex for audit/dedup — **never** used to call providers (hashing API keys would make sync impossible). |

**Never** put `INTEGRATION_ENCRYPTION_*` or `SUPABASE_SERVICE_ROLE_KEY` in Vite (`VITE_*`). Sellers only send keys over HTTPS to RPC; ciphertext stays in Postgres.

Configure once per environment:

```bash
openssl rand -base64 32   # INTEGRATION_ENCRYPTION_KEY
openssl rand -base64 24   # INTEGRATION_ENCRYPTION_PEPPER (recommended)
openssl rand -base64 48   # SYNC_WORKER_CRON_SECRET
npm run platform:set-integration-secrets
npm run verification:config-check
```

If you **add pepper after** providers were connected without pepper, **re-connect** those providers (re-encrypt with new derived key).

## Sync worker (production — same Vercel app)

Sellers never run CLI. Jobs are enqueued on connect/domain verify; Postgres **`pg_net`** POSTs to your **public** worker URL when configured.

**Default:** verification runs **inline** on the same deploy as the web app at `/api/sync-worker` (Vercel serverless or Vite dev middleware). No separate Docker worker required.

1. **Vercel environment variables**
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `SYNC_WORKER_CRON_SECRET` (same value stored in `sys_platform_config.sync_worker_invoke_secret`)
   - `VITE_PUBLIC_SITE_URL=https://ownerr.live`
   - `RESEND_API_KEY` (business email in production)
   - Do **not** set `SYNC_WORKER_USE_EXTERNAL_PROXY=1` unless you run a separate worker host.

2. **Postgres platform config** (from a machine with `DATABASE_URL`):

   ```bash
   # .env.local: DATABASE_URL, INTEGRATION_ENCRYPTION_KEY, SYNC_WORKER_CRON_SECRET
   # .env.production or env: VITE_PUBLIC_SITE_URL=https://ownerr.live
   npm run platform:set-integration-secrets
   npm run verification:config-check
   ```

   This stores:
   - `sync_worker_public_url` → `https://ownerr.live/api/sync-worker`
   - `sync_worker_invoke_url` → `https://ownerr.live/api/sync-worker/v1/process-jobs`

3. **Drain backlog after fixing URLs**

   ```bash
   npm run verification:drain-jobs
   ```

4. **Stripe Identity webhook** (Dashboard): `https://ownerr.live/api/webhooks/stripe/identity`

5. Optional backup cron: `POST /api/sync-worker/v1/process-jobs` with `Authorization: Bearer <SYNC_WORKER_CRON_SECRET>` every 1–5 minutes.

**Local dev:** `npm run dev` serves inline `/api/sync-worker` by default (`SYNC_WORKER_INLINE` is on unless set to `0`). Use `npm run dev:with-verification-worker` only when proxying to port 8787.

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
