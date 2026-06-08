# Ownerr Enterprise API (Supabase + Vercel)

Production API architecture using **only** Supabase (Postgres, Auth, Storage, Realtime, Edge Functions, PostgREST, RPC, RLS) and **Vercel** (static SPA + Edge Function invoke URLs / optional thin proxy).

**Out of scope:** AWS API Gateway/Lambda, Redis, K8s, message brokers, Elasticsearch, dedicated Node workers as a long-term pattern (migrate existing sync-worker responsibilities to **Supabase Edge Functions**).

---

## 1. Logical API domains (frontend contract)

PostgREST has no `/v1/marketplace` URL path. Domains are **TypeScript modules** that map to RPC names and controlled reads:

| Domain             | Module (target)                  | Transport            |
| ------------------ | -------------------------------- | -------------------- |
| `/v1/marketplace`  | `src/lib/api/marketplaceApi.ts`  | RPC + read RPCs      |
| `/v1/offers`       | `src/lib/api/offersApi.ts`       | RPC only             |
| `/v1/messages`     | `src/lib/api/messagesApi.ts`     | RPC + Realtime       |
| `/v1/verification` | `src/lib/api/verificationApi.ts` | RPC + Edge Functions |
| `/v1/admin`        | `src/lib/api/adminApi.ts`        | RPC only             |

**Rule:** UI and hooks import **only** these modules (plus `src/lib/api/errors.ts`, `src/lib/api/types.ts`). No `SchemaTables` in components.

---

## 2. Response envelope (client normalization)

All domain clients return:

```json
{ "success": true, "data": {} }
```

```json
{
  "success": false,
  "error": { "code": "OFFER_NOT_FOUND", "message": "Offer not found" }
}
```

**Implementation:** `mapSupabaseError()` extended in `src/lib/api/errors.ts` — map `PGRST*`, SQLSTATE, and `RAISE EXCEPTION` messages to stable codes. Never surface raw Postgres text to UI.

---

## 3. Security model (target)

### Authentication

Supabase Auth only (email OTP, password, Google). Session = JWT on every PostgREST/RPC call.

### Platform authorization

- **Source of truth:** `public.users.role` ∈ `buyer` | `founder` | `admin` (align marketplace desk with `marketplace_accounts.desk_role` for buyer/seller/founder desk, not JWT metadata).
- **`is_platform_admin()`:** DB only — `EXISTS (SELECT 1 FROM users u WHERE u.auth_user_id = auth.uid() AND u.role = 'admin')`. **Remove** `auth.jwt()->user_metadata->role` admin shortcut (regression in `202607025200_fix_rls_recursion_42p17.sql`).
- **Do not use** `user_metadata.role` for authorization (desk UX may store display hints only if non-authoritative).

### RLS

- `FORCE ROW LEVEL SECURITY` on all public tables (done in `20260702480000`).
- Explicit SELECT/INSERT/UPDATE/DELETE policies; default deny.
- Sensitive tables: no broad `authenticated USING (true)` except where documented (e.g. public catalog read).

### Storage

- Buckets private: `person_verification_docs`, `registration_docs`, `listing_proofs`, `listing-business-proofs`, `verification-documents`.
- **Signed URLs only** for download; uploads via **`storage_create_upload_url` RPC** (target) — 20 MB max, MIME allowlist: `application/pdf`, `image/png`, `image/jpeg`, `image/webp`.
- Reject other MIME at RPC before issuing signed upload URL.

---

## 4. Verification split

| Concern                  | Scope                          | Tables / RPC prefix                                          |
| ------------------------ | ------------------------------ | ------------------------------------------------------------ |
| **Person verification**  | Buyer/founder identity profile | `trust_person_profiles`, person RPCs                         |
| **Listing verification** | Per company/listing gates      | `trust_listing_gates`, `marketplace_companies`, listing RPCs |

Never merge person KYC state into listing gate rows without explicit foreign keys and separate RPCs.

**Listing gates (required):** identity, domain, business_email, revenue, registration.  
**Lifecycle:** draft → verification_required → verifying → verified → published (auto when gates pass) → suspended.  
**No manual publish** in product UI; use `try_auto_publish_listing` / gate refresh only.

---

## 5. Postgres-native scalability (no Redis)

| Artifact                           | Purpose                    | Refresh                                                         |
| ---------------------------------- | -------------------------- | --------------------------------------------------------------- |
| `mv_marketplace_stats`             | Counts, funnel aggregates  | `REFRESH MATERIALIZED VIEW CONCURRENTLY` via cron Edge Function |
| `mv_marketplace_featured_listings` | Home/acquire featured rows | Same                                                            |
| `mv_admin_dashboard_metrics`       | Admin home KPIs            | Same                                                            |

**Pagination:** cursor `(created_at, id)` on all list RPCs — **no OFFSET**.

**Search:** single RPC `marketplace_search_listings(p_query, p_filters, p_cursor, p_limit)` — implementation may use Postgres today; contract fixed for future engine.

---

## 6. Rate limiting (Postgres)

Table `api_rate_limits (auth_user_id, endpoint, window_start, request_count)`  
Wrapper `api_guard(p_endpoint text)` called at start of mutating RPCs:

| Tier                    | Limit         |
| ----------------------- | ------------- |
| Default                 | 100 req/hour  |
| Person/listing verified | 1000 req/hour |
| Admin                   | skip          |

Return JSON error code `RATE_LIMITED` with `retry_after_seconds` (client maps to 429 UX). HTTP 429 from Edge Functions when those routes are used.

---

## 7. Observability (Postgres)

Table `api_request_logs (request_id, user_id, rpc_name, duration_ms, status, created_at)`  
Optional: `pg_stat_statements` + admin RPC `admin_api_observability_summary()`.

Admin dashboard RPCs: top RPCs, slowest, failures, verification failures, offer funnel (can compose existing `admin_*` + new metrics RPC).

---

## 8. Events & audit

| Stream       | Physical table (schema v2)                      | Mutability  |
| ------------ | ----------------------------------------------- | ----------- |
| Offers       | `marketplace_offer_notifications` + emit helper | Insert only |
| Verification | `trust_verification_events`                     | Insert only |
| Audit        | `sys_audit_logs` via `append_audit_log`         | Insert only |

Extend audit payload to include `ip_address` (from Edge Function `x-forwarded-for` passed as RPC arg where needed).

**Soft delete:** `deleted_at` on `users`; listing archive via `status`/`visibility`, not DELETE.

---

## 9. External integrations pattern

```
Provider → Supabase Edge Function → RPC (service role) → append event → state update
```

**Canonical webhook (Vercel or Edge):** `POST /api/webhooks/stripe/identity` only.  
Deprecate: sync-worker `/v1/webhooks/identity/stripe`, duplicate worker-hosted webhook.

Migrate: `process-jobs`, business email send, registration OCR, revalidation sweep → Edge Functions with secrets in Supabase vault/project secrets.

---

## 10. Schema review (current vs target)

### Aligned today

- Schema v2 physical tables (`@workspace/db-schema`).
- Offer state machine RPCs (`marketplace_*_offer`).
- Integration connect/sync RPCs + `trust_integration_jobs`.
- Listing gates + auto-publish helpers.
- FORCE RLS baseline; storage policies on proof buckets.
- `append_audit_log`, `trust_verification_events`, offer notification events.

### Gaps

| Area                 | Gap                                                                         |
| -------------------- | --------------------------------------------------------------------------- |
| Domain API layer     | No `src/lib/api/*` modules; scattered `lib/marketplace/*`, `intelligence/*` |
| Messaging            | Direct PostgREST on `marketplace_conversations` / `marketplace_messages`    |
| Mutations            | Some admin/catalog **direct UPDATE** on tables                              |
| Offers               | `bidService.ts` table fallback if RPC missing                               |
| Search               | No `marketplace_search_listings`                                            |
| List RPCs            | No cursor `marketplace_list_conversations` / `marketplace_list_messages`    |
| Rate limit           | No `api_rate_limits`                                                        |
| Request logs         | No `api_request_logs`                                                       |
| Materialized views   | None                                                                        |
| Edge Functions       | **No** `supabase/functions` in repo                                         |
| Admin auth           | JWT metadata admin path in `is_platform_admin()`                            |
| Response envelope    | Partial (`MarketplaceError` only in marketplace)                            |
| Signed upload only   | Client uploads directly to Storage                                          |
| Person vs listing    | Model exists but UI/RPC naming mixed under `founder_*`                      |
| `users.role` vs desk | Desk uses `marketplace_accounts.desk_role` + JWT metadata sync              |

### RPC naming drift

Legacy: `unemployed_*`, `founder_analytics_summary(key)`, `founder_*` mixed with `marketplace_*`. Target: document aliases; deprecate unemployed + key-based analytics.

---

## 11. Missing components (build list)

### Database (migrations)

1. Fix `is_platform_admin()` — DB role only.
2. `api_rate_limits` + `api_guard()`.
3. `api_request_logs` + optional `api_log_request()` wrapper.
4. `marketplace_list_conversations`, `marketplace_list_messages`, `marketplace_send_message` (cursor).
5. `marketplace_search_listings`.
6. `storage_create_upload_url` / `storage_confirm_upload` (MIME/size).
7. Materialized views + `refresh_marketplace_materialized_views()`.
8. Unified `audit_events` view or rename policy to `sys_audit_logs` only in `append_audit_log`.
9. Revoke direct INSERT/UPDATE on `marketplace_messages`, `marketplace_offers` from `authenticated` (RPC only).
10. Tier helper `user_api_tier()` from person/listing verified flags.

### Edge Functions (new)

1. `stripe-identity-webhook`
2. `integration-process-jobs`
3. `verification-send-business-email`
4. `verification-process-registration`
5. `verification-revalidation-sweep`
6. `refresh-materialized-views` (scheduled)

### Frontend

1. `src/lib/api/{errors,types,marketplace,offers,messages,verification,admin}Api.ts`
2. Refactor hooks/pages to domain clients.
3. Realtime: subscribe in `messagesApi` only.
4. Remove table fallbacks and direct admin writes.

### Vercel

- Keep static SPA; optional retain `/api/webhooks/stripe/identity` as thin forwarder to Edge or implement webhook only on Edge with public URL in Stripe.

---

## 12. Migration roadmap

| Phase             | Focus                                                                        | Duration    |
| ----------------- | ---------------------------------------------------------------------------- | ----------- |
| **P0 Critical**   | Admin RPC fix; grant audit; signed upload RPC; revoke dangerous table grants | Week 1      |
| **P1 Foundation** | Domain API clients + error envelope; messaging list/send RPCs                | Weeks 2–3   |
| **P2 Hardening**  | Rate limits; request logs; search RPC; MVs + refresh job                     | Weeks 4–6   |
| **P3 Edge**       | Edge Functions replace sync-worker; single webhook URL                       | Weeks 7–10  |
| **P4 Cleanup**    | Remove bidService fallback; unemployed RPCs; direct admin table writes       | Weeks 11–12 |

Each phase: `npm run db:migrate` + deploy Edge + Vercel; smoke `scripts/marketplace-desk.smoke.mjs`.

### Implemented (20260702600000 + app)

- P0: `is_platform_admin()` DB-only; `append_audit_log` → `sys_audit_logs`; `storage_create_upload_url`; REVOKE direct writes on offers/messages
- P1: Messaging RPCs; `src/lib/api/*` domain clients; offer/message/bid paths on RPCs
- P2: `api_rate_limits`, `api_guard`, `api_request_logs`, `admin_api_observability_summary`, search RPC, materialized views + refresh RPC
- P3: `supabase/functions/stripe-identity-webhook`; legacy worker webhook path returns 410
- P4: Removed offer table fallbacks, unemployed RPC fallbacks, key-based founder analytics, admin catalog updates via RPC

---

## 13. Technical debt report

| ID    | Item                                           | Severity | Notes                                              |
| ----- | ---------------------------------------------- | -------- | -------------------------------------------------- |
| TD-01 | `is_platform_admin` JWT metadata               | Critical | Escalation risk with desk metadata updates         |
| TD-02 | sync-worker as second runtime                  | High     | Conflicts with Supabase-only goal; migrate to Edge |
| TD-03 | messageService direct table access             | High     | RLS/embed cost; no cursor contract                 |
| TD-04 | bidService RPC fallback                        | Medium   | Dual behavior                                      |
| TD-05 | `append_audit_log` → `audit_logs` name post-v2 | Medium   | Should write `sys_audit_logs`                      |
| TD-06 | `founder_analytics_summary(text)` anon         | High     | Replace with admin session RPC                     |
| TD-07 | Broad historical GRANT TO anon                 | High     | Verify prod after hardening migrations             |
| TD-08 | No materialized views for admin/home           | Medium   | Admin RPCs hit live tables                         |
| TD-09 | OFFSET in some admin/list queries              | Low      | Convert when touching RPCs                         |
| TD-10 | pg_net invoke URLs in config                   | Medium   | Document; move triggers to Edge schedule           |
| TD-11 | Duplicate Stripe webhook paths                 | Medium   | Single canonical URL                               |
| TD-12 | Direct Storage upload from browser             | Medium   | Presign RPC not yet implemented                    |
| TD-13 | `syncMarketplaceDeskRole` writes JWT role      | Medium   | Decouple from admin; use desk_role column          |
| TD-14 | No `src/lib/api` layer                         | Medium   | Blocks versioning discipline                       |

---

## 14. Backward compatibility

- RPC names unchanged; new RPCs additive.
- Domain clients wrap existing calls first (adapter), then switch internals.
- Edge migration: dual-run worker + Edge with feature flag in `sys_platform_config`, then disable worker URLs.
- Search RPC: optional; catalog keeps working via old reads until frontend switches.
- Schema v2 table names remain physical; no compat views (post-`20260702530000`).

---

## 15. Related docs

- [api-catalog.md](./api-catalog.md) — RPC/query reference (concise)
- [schema-v2.md](./schema-v2.md) — table naming
- [production-supabase-baas.md](./production-supabase-baas.md) — deploy model (update after Edge cutover)
