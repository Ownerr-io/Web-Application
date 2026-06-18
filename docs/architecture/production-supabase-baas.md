# Production: Supabase BaaS + static web (no separate backend)

The Ownerr web app is a **Vite SPA on Vercel**. All product data and marketplace buyer/seller flows use **Supabase only**:

- Auth (Supabase Auth)
- Postgres + RLS
- RPCs (`marketplace_*`, offers, inbox, interests, founder analytics, admin RPCs)

You do **not** need Express, Fly, Docker, or a long-running “API server” for production.

## Required (Vercel)

| Variable                 | Purpose                                  |
| ------------------------ | ---------------------------------------- |
| `VITE_SUPABASE_URL`      | Supabase project URL                     |
| `VITE_SUPABASE_ANON_KEY` | Browser anon key                         |
| `VITE_PUBLIC_SITE_URL`   | Canonical site origin (links, redirects) |

Apply migrations through **`20260702460000`** (or latest) on the linked Supabase project (`npm run db:migrate`).

## Marketplace buyer / seller desk

Works with **only** the three Vite variables above plus:

- User roles in `public.users` (`buyer`, `founder` for seller desk)
- Active `marketplace_profiles` rows
- Migrations for offers platform (`20260702430000` … `20260702460000`)

No worker, no `DATABASE_URL` on Vercel, no server-side env for desk RPCs.

## Seller revenue / Stripe keys (not platform env)

Sellers enter **their own** provider API keys in the app (e.g. Stripe `sk_live_…`). The browser calls Supabase RPC **`integration_connect_api_key`**, which encrypts the key into Postgres (`integration_credentials`). Verification jobs read the seller key via **`worker_get_connection_secrets`** and call the provider to prove revenue.

**You do not put seller Stripe keys or a platform `STRIPE_SECRET_KEY` on Vercel.**

Production requirement for storing seller keys:

| Where                          | What                                                                                                                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase `sys_platform_config` | `integration_encryption_key` (+ recommended `integration_encryption_pepper`) and sync worker URLs via `npm run platform:set-integration-secrets` from a machine with `DATABASE_URL` |

That encryption material is **Ownerr’s** key for Postgres ciphertext — not Stripe.

## Optional: seller listing verification (async HTTP)

Identity, business-email magic links, domain/revenue **job runners** need HTTP that can decrypt seller credentials (service role) and call Stripe/Resend/DNS APIs. Seller keys still come from Postgres, not from `STRIPE_SECRET_KEY` in Vercel env.

Options:

1. **Same-origin serverless** (default) — store invoke URLs in `sys_platform_config` pointing at `https://<site>/api/sync-worker` (`sync_worker_invoke_url` / `sync_worker_public_url`). Optional: Supabase Edge Functions as an alternate invoke target.
2. **Same Vercel project** — optional `/api/*` routes on the same deploy (not a second backend service).
3. **Local only** — `npm run dev:with-verification-worker` for full verification dev.

If async URLs are unset, launch RPCs return `configured: false` (migration `20260702470000`); marketplace desk is unaffected.

## Not used in default production

- `artifacts/api-server` (legacy)
- Private `SYNC_WORKER_INTERNAL_URL` worker host (optional legacy path for verification only)
- `npm run dev` no longer starts a worker — use `npm run dev:with-verification-worker` when testing verification locally

## Admin

Platform admin: `public.users.role = 'admin'` (see [supabase/README.md](../../supabase/README.md)).
