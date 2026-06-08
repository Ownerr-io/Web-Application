# Verification-first listings (M&A-grade trust)

## Executive summary

Ownerr allows **draft** listing creation and editing for any authenticated seller. **Public marketplace visibility**, buyer contact, search, and featured placement require **all mandatory verification gates** to pass and an explicit transition to **`published`** lifecycle.

This document is the source of truth for schema, RLS, RPCs, trust weights, admin ops, and phased delivery.

---

## Gap analysis (existing vs required)

| Capability            | Existing (pre–Phase 1)                                          | Gap                                                                              |
| --------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Listing states        | `startups.status`: draft, published, archived, sold             | Need full lifecycle: verification_required → … → verified → published, suspended |
| Public catalog        | `visibility=public` + `status=published`                        | No gate check; self-reported MRR in metadata                                     |
| Domain proof          | DNS TXT/CNAME + worker → `verification_results`                 | Not blocking publish                                                             |
| Revenue proof         | Stripe/etc. sync → `verification_results` + `financial_metrics` | Not blocking publish; form MRR still shown                                       |
| Founder identity      | Auth email only                                                 | No ID/selfie/legal name                                                          |
| Business email        | None                                                            | No `@company.com` requirement                                                    |
| Business registration | None                                                            | No document upload + admin review                                                |
| Bank account          | Optional future                                                 | Schema hook only in Phase 1                                                      |
| Trust score           | `recompute_startup_trust` from integration dimensions           | Weights differ; includes non-mandatory traffic                                   |
| Admin queue           | Sync health + audit                                             | No identity/doc/email review queue                                               |
| Anti-fraud            | Partial (audit logs)                                            | No structured fraud signals                                                      |
| Buyer transparency    | Trust score + dimension summary                                 | No verification timeline / verified revenue only                                 |

---

## Target state machine

```
draft
  → verification_required     (seller submits for verification)
  → verification_in_progress  (automated checks running)
  → verification_failed       (mandatory gate failed/rejected)
  → verification_review       (human review: registration, identity, email mismatch)
  → verified                  (all mandatory gates pass)
  → published                 (public catalog + buyer access)
suspended                     (admin, any time)
```

**Mandatory gates for publish** (all must be `verified`):

1. Founder identity (ID + selfie + legal name) — admin or provider-backed review
2. Domain ownership (TXT/CNAME — existing worker)
3. Business email on verified domain — auto if match; else manual review
4. Revenue provider sync — `verification_results.revenue = pass`; MRR/ARR from `financial_metrics` only
5. Business registration — document upload + admin approval

**Bank account**: `banking_status` column reserved; not required in v1.

---

## New / extended database objects (Phase 1)

### `startups` extensions

- `listing_lifecycle` — state machine (replaces publish semantics for marketplace)
- Denormalized gate flags on `listing_verification_gates` (1:1) for fast RLS and catalog filters

Legacy `status` retained for archived/sold; **`listing_lifecycle`** drives marketplace.

### `listing_verification_gates`

One row per startup: gate statuses, verified MRR/ARR, timestamps, `published_at`, suspension fields.

### `founder_identity_verifications`

Per submission: `legal_name`, storage paths (private bucket), `status` pending|verified|rejected, reviewer, notes.

### `business_email_verifications`

Email, domain, token hash, `status`, `requires_manual_review`.

### `business_registration_documents`

Doc type, storage path, `status` pending|approved|rejected.

### `listing_fraud_signals`

Automated flags: disposable email, domain mismatch, duplicate slug/domain, revenue delta, etc.

### `admin_listing_reviews`

Queue rows: review_type, status, assignee, notes, appeals link.

---

## RLS principles

- **Public/anon**: SELECT only `listing_lifecycle = published` startups + public trust/timeline RPCs (no PII, no document paths).
- **Founder**: CRUD drafts; submit verification; upload via signed RPC; read own gate row.
- **Admin**: ALL on review tables, documents metadata, fraud signals, overrides.
- **Documents**: No direct storage SELECT for founders on others’ files; service role / admin RPC only.

---

## RPC / API surface (Phase 1)

| RPC                                               | Role                    | Purpose                                              |
| ------------------------------------------------- | ----------------------- | ---------------------------------------------------- |
| `listing_verification_snapshot(startup_id)`       | founder/admin           | Gate row + lifecycle                                 |
| `listing_verification_timeline_public(slug)`      | anon/authenticated      | Buyer-facing timeline                                |
| `refresh_listing_gates_from_evidence(startup_id)` | service/founder trigger | Sync domain/revenue from existing integration tables |
| `sync_listing_lifecycle(startup_id)`              | internal                | Compute lifecycle from gates                         |
| `founder_submit_listing_for_verification(slug)`   | founder                 | draft → verification_required / in_progress          |
| `founder_request_publish(slug)`                   | founder                 | verified → published (blocked otherwise)             |
| `founder_submit_identity_verification(...)`       | founder                 | Upload metadata + pending identity                   |
| `founder_submit_business_email(...)`              | founder                 | Start business email flow                            |
| `founder_submit_registration_document(...)`       | founder                 | Register doc for review                              |
| `admin_review_gate(...)`                          | admin                   | Approve/reject identity, email, registration         |
| `admin_suspend_listing(...)`                      | admin                   | suspended                                            |
| `admin_publish_listing(...)`                      | admin                   | Override publish with audit                          |
| `recompute_listing_trust_v2(startup_id)`          | service                 | Weights 20/20/30/20/10 from gates only               |

Existing: `domain_verification_begin`, `integration_connect_api_key`, worker sync — **wire into** `refresh_listing_gates_from_evidence` on sync complete (Phase 1 trigger/RPC call from worker path in Phase 2).

---

## Trust engine v2 (100 points, evidence only)

| Component                      | Weight | Source                                                 |
| ------------------------------ | ------ | ------------------------------------------------------ |
| Founder identity verified      | 20     | `founder_identity_verifications.status = verified`     |
| Domain verified                | 20     | gate / `verification_results.domain pass`              |
| Revenue verified               | 30     | gate + `financial_metrics.mrr`                         |
| Business registration approved | 20     | document approved                                      |
| Platform history               | 10     | account age, prior published listing, no fraud signals |

**Never** read self-reported `annual_revenue` or form MRR for trust or buyer “verified revenue”.

---

## Admin operations (phased)

| Phase | Deliverable                                                                            |
| ----- | -------------------------------------------------------------------------------------- |
| 1     | Gate queue RPC `admin_listing_verification_queue`, review RPCs, audit via `audit_logs` |
| 2     | Document viewer (signed URLs), identity review UI, appeals table                       |
| 3     | Fraud rules engine (scheduled job), duplicate detection                                |
| 4     | Bank verification provider                                                             |

---

## Anti-fraud (Phase 1 rules in `refresh_listing_gates_from_evidence`)

- Disposable email domains list (config table)
- Business email domain ≠ verified domain → manual review + signal
- Same `founder_user_id` + same domain on multiple startups → signal
- Revenue: \|form MRR - verified_mrr\| / verified_mrr > threshold when verified_mrr > 0

---

## Migration plan

1. **20260702180000_verification_first_listings_phase1.sql** — tables, lifecycle, gates, RPCs, backfill, demote public listings without gates
2. **Phase 2** — Storage buckets + upload RPCs; worker calls `refresh_listing_gates_from_evidence`
3. **Phase 3** — Admin UI pages (identity, documents, queue)
4. **Phase 4** — Identity provider (Stripe Identity / Persona) webhook
5. **Phase 5** — Bank verification

---

## App changes (Phase 1)

- `founder_create_startup` → `listing_lifecycle = draft`, `visibility = unlisted`
- Public catalog: `listing_lifecycle = published` only
- Seller desk: lifecycle banner, “Submit for verification”, “Request publish”
- Buyer listing: `listing_verification_timeline_public`, verified MRR from RPC
- Remove “live on marketplace” copy until published

---

## Identity & documents (production note)

Phase 1 uses **private Supabase Storage** paths recorded in DB; **admin review** approves/rejects. Phase 4 adds automated IDV vendor; webhook updates `founder_identity_verifications` without changing gate schema.
