# Production readiness report

Generated after Enterprise API Platform (P0–P4) and **enterprise ops hardening** migration `20260702710000_enterprise_ops_hardening.sql`.

## Completed in this pass (additive only)

### Phase 1 — Observability & operations

| Item                             | Status | Notes                                                                                                        |
| -------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| Request ID generation (client)   | Done   | `newRequestId()` in `structuredLog.ts` / `rpcTelemetry.ts`                                                   |
| Request ID in `api_request_logs` | Done   | `api_log_client_request` RPC                                                                                 |
| Request ID in audit              | Done   | Optional `p_request_id` on `append_audit_log`; column on `sys_audit_logs`                                    |
| Webhook request ID               | Done   | Stripe Identity handler logs JSON + embeds `request_id` in webhook payload                                   |
| Structured JSON logging (web)    | Done   | `structuredLog()` — fields: timestamp, request_id, user_id, route, rpc_name, duration_ms, status, error_code |
| Slow query capture               | Done   | `api_slow_queries` + threshold 500ms via `api_log_client_request`                                            |
| `admin_slow_query_summary`       | Done   | Admin RPC                                                                                                    |
| `admin_platform_health`          | Done   | database, storage, auth, rpc_latency, queue_depth, error_rate, active_users                                  |

### Phase 2 — Advanced rate limiting

| Item                                  | Status | Notes                                                         |
| ------------------------------------- | ------ | ------------------------------------------------------------- |
| Tiers free / pro / enterprise / admin | Done   | `api_tier_limits` + updated `user_api_tier()`                 |
| Per-minute / hour / burst             | Done   | Sliding window via `api_rate_limit_events`                    |
| Abuse detection                       | Done   | `api_abuse_events` for burst, offers, messaging, verification |
| Extended `api_guard`                  | Done   | Optional `p_request_id`; backward-compatible overload         |

### Phase 3 — Search & performance

| Item                               | Status | Notes                                                                           |
| ---------------------------------- | ------ | ------------------------------------------------------------------------------- |
| `marketplace_search_v2`            | Done   | Cursor on ranking score, industry/country/lifecycle filters, pg_trgm similarity |
| `mv_marketplace_search_cache`      | Done   | Trust-weighted ranking                                                          |
| `refresh_marketplace_search_cache` | Done   | Refreshes search MV + existing marketplace MVs                                  |
| Inbox bundle RPC                   | Done   | `marketplace_desk_inbox_bundle` (single round-trip wrapper)                     |

### Phase 4 — Storage hardening

| Item                         | Status | Notes                                                    |
| ---------------------------- | ------ | -------------------------------------------------------- |
| MIME / size validation       | Done   | Extended `storage_create_upload_url`                     |
| Expiring signed URL metadata | Done   | `expiresInSeconds` / `expiresAt` in RPC response         |
| Upload audit                 | Done   | `storage_log_access` + `append_audit_log`                |
| `storage_access_logs`        | Done   | RLS: own + admin read                                    |
| Virus scan hook              | Done   | `storage_scan_jobs` (pending → service_role worker hook) |

### Phase 5 — Verification platform

| Item                            | Status    | Notes                                                                |
| ------------------------------- | --------- | -------------------------------------------------------------------- |
| `person_verification_cases`     | Done      | Full name, email, country, LinkedIn, X; status workflow              |
| `person_verification_documents` | Done      | national_id, passport, pan, ssn, tax_id                              |
| User RPCs                       | Done      | `upsert_person_verification_case`, `submit_person_verification_case` |
| Admin review                    | Done      | `admin_review_person_verification_case`                              |
| Legacy person profiles          | Unchanged | `trust_person_profiles` + existing RPCs still supported              |

### Phase 6 — Offers & marketplace scale

| Item                     | Status | Notes                                                                                                                     |
| ------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------- |
| `admin_offer_metrics`    | Done   | Admin RPC                                                                                                                 |
| Buyer dashboard metrics  | Done   | `marketplace_buyer_offer_dashboard`                                                                                       |
| Seller dashboard metrics | Done   | `marketplace_seller_offer_dashboard`                                                                                      |
| Offer event stream       | Done   | Trigger on `marketplace_offers` → `marketplace_offer_notifications` (created/updated/countered/accepted/declined/expired) |

### Phase 7 — Security (additive audit)

| Check                            | Result                                                       |
| -------------------------------- | ------------------------------------------------------------ |
| Anonymous mutation on new tables | Revoked on cases, documents, tier limits, scan jobs          |
| Admin from JWT metadata          | Still not used; `is_platform_admin()` DB-only                |
| Service role                     | Required for abuse insert edge cases; scan jobs service-only |
| Storage                          | Existing bucket RLS unchanged; access logged on allocate     |

---

## Remaining risks

1. **Cron not configured** — Schedule `refresh_marketplace_search_cache()` (e.g. Supabase cron or external scheduler every 5–15 minutes).
2. **Virus scanning** — `storage_scan_jobs` is schema-only; no worker consumes `pending` rows yet.
3. **Request ID on all RPCs** — Only client-instrumented paths and optional `p_request_id` on guard/storage; legacy direct `supabase.rpc()` calls do not auto-log until migrated to `instrumentedRpc`.
4. **Enterprise tier** — Granted via `user_products.product_slug IN ('ownerr_enterprise', 'enterprise')`; confirm product slug in production data.
5. **Search MV cold start** — Run one manual `refresh_marketplace_search_cache()` after deploy.
6. **Edge Functions** — Optional Stripe webhook on Supabase; canonical URL remains Vercel.

---

## Scalability limits (current architecture)

| Scale         | Postgres / RPC                                                                                                        | Storage                                    | Auth                                                |
| ------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------- |
| **~10k MAU**  | Comfortable on Supabase Pro; rate-limit events pruned hourly                                                          | Bucket RLS + path prefixes sufficient      | Supabase Auth default                               |
| **~100k MAU** | Monitor `api_rate_limit_events` write volume; consider partitioning or Redis-style limiter for hot endpoints          | Access log table growth — archive >90d     | Pooler session mode for migrations only             |
| **~1M MAU**   | MV refresh and search similarity need read replicas or dedicated search (OpenSearch/Typesense); inbox still RPC-bound | Scan pipeline + CDN for public assets only | Org-level auth rate limits + WAF in front of Vercel |

### Database bottlenecks

- Sliding-window rate limit: index on `(auth_user_id, endpoint, occurred_at)` — OK to ~100k RPM aggregate with pruning.
- `marketplace_list_conversations` lateral subqueries — watch p95; inbox bundle reduces client N+1, not server joins.
- Offer lifecycle trigger doubles writes on status changes — acceptable; batch analytics use `admin_offer_metrics`.

### Storage bottlenecks

- 20 MiB cap per object in RPC; no multipart upload RPC yet.
- `storage_access_logs` unbounded — add retention job in a future migration.

---

## Security findings (post-implementation)

| Severity | Finding                                                          | Mitigation                                     |
| -------- | ---------------------------------------------------------------- | ---------------------------------------------- |
| Low      | Client can call `api_log_client_request` with arbitrary rpc_name | Rate-limited; admin-only read; no PII required |
| Low      | `p_request_id` not validated on all RPCs                         | Acceptable; used for correlation only          |
| Info     | `marketplace_search_v2` granted to `anon`                        | Same as v1 search; public catalog only         |
| Info     | Offer trigger emits events for all updates                       | Intended audit/notification stream             |

---

## Recommendations

1. Apply migration: `npm run supabase:push` (includes `20260702710000_enterprise_ops_hardening.sql`).
2. Run once as admin: `select refresh_marketplace_search_cache();`
3. Wire admin UI to `admin_platform_health` and `admin_slow_query_summary`.
4. Migrate high-traffic client RPCs to `instrumentedRpc` from `@/lib/api/rpcTelemetry`.
5. Implement a small **scan worker** (Edge or sync-worker) polling `storage_scan_jobs` where `status = 'pending'`.
6. At **100k+** users, externalize search index; keep Postgres as source of truth.

---

## Deploy command

```bash
npm run supabase:push
```

Confirm when prompted. No breaking changes to existing RPC signatures; new parameters are optional or new functions only.
