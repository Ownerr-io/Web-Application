# API catalog (Supabase RPC & controlled reads)

Logical domains for frontend clients. **Invoke:** `supabase.rpc('name', { ... })` unless noted as read-only PostgREST (being phased out).

Envelope (client-side after call):

```ts
// success → { success: true, data: T }
// failure → { success: false, error: { code, message } }
```

---

## /v1/marketplace

| RPC                                       | Auth                 | Purpose                              |
| ----------------------------------------- | -------------------- | ------------------------------------ |
| `founder_create_startup`                  | founder              | Create draft company                 |
| `founder_update_startup`                  | owner/admin          | Update listing fields                |
| `founder_delete_startup`                  | owner                | Delete draft                         |
| `founder_save_seller_intake`              | seller               | Intake payload                       |
| `founder_get_seller_intake`               | seller               | Read intake                          |
| `founder_register_business_proof`         | seller               | Register proof metadata after upload |
| `founder_submit_listing_for_verification` | seller               | Start listing verification           |
| `founder_request_publish`                 | seller               | Request publish (gates must pass)    |
| `founder_link_seller_desk`                | seller               | Link desk profile                    |
| `listing_verification_snapshot`           | owner/buyer policy   | Gate snapshot for desk               |
| `listing_verification_timeline_public`    | public/authenticated | Public timeline                      |
| `marketplace_search_listings`             | authenticated        | **Planned** — search contract        |
| `marketplace_desk_role_for_person`        | authenticated        | Desk role helper                     |

**Reads (migrate to RPC):** public catalog via future `marketplace_list_public_companies(p_cursor)`.

```ts
// Submit listing for verification
await supabase.rpc("founder_submit_listing_for_verification", {
  p_startup_id: startupId,
});

// Gate snapshot (seller desk)
await supabase.rpc("listing_verification_snapshot", {
  p_startup_id: startupId,
});
```

---

## /v1/offers

| RPC                                     | Auth         | Purpose            |
| --------------------------------------- | ------------ | ------------------ |
| `marketplace_submit_offer`              | buyer        | New offer          |
| `marketplace_counter_offer`             | buyer/seller | Counter            |
| `marketplace_accept_offer`              | seller       | Accept             |
| `marketplace_accept_counter`            | buyer        | Accept counter     |
| `marketplace_decline_offer`             | seller/buyer | Decline            |
| `marketplace_withdraw_offer`            | buyer        | Withdraw           |
| `marketplace_advance_acquisition_stage` | both         | Post-accept stages |
| `marketplace_list_offers_buyer`         | buyer        | Buyer list         |
| `marketplace_list_offers_seller`        | seller       | Seller list        |
| `marketplace_get_bid_detail`            | participant  | Detail + versions  |

**States:** submitted → countered → accepted | declined | withdrawn | expired (DB-enforced).

```ts
await supabase.rpc("marketplace_submit_offer", {
  p_startup_id: startupId,
  p_amount: amount,
  p_currency: "USD",
  p_message: message ?? "",
});

await supabase.rpc("marketplace_list_offers_buyer", {
  p_limit: 25,
  p_cursor_created_at: cursor?.createdAt ?? null,
  p_cursor_id: cursor?.id ?? null,
});
```

_Note: cursor params on list RPCs — **add in migration** if not present today; client should pass null for first page._

---

## /v1/messages

| RPC                                               | Auth          | Purpose                      |
| ------------------------------------------------- | ------------- | ---------------------------- |
| `marketplace_bootstrap_conversation`              | buyer         | Open thread from slug        |
| `marketplace_ensure_conversation_for_bid`         | participant   | Thread for offer             |
| `marketplace_list_conversations`                  | authenticated | **Planned** — inbox cursor   |
| `marketplace_list_messages`                       | participant   | **Planned** — thread cursor  |
| `marketplace_send_message`                        | participant   | **Planned** — insert message |
| `marketplace_repair_buyer_interest_conversations` | buyer         | Repair tool                  |

**Realtime:** subscribe to `marketplace_messages` filter `conversation_id=eq.{id}` after RPC lists grant access.

```ts
await supabase.rpc("marketplace_bootstrap_conversation", {
  p_startup_slug: slug,
  p_message: firstMessage,
});

// Planned send
await supabase.rpc("marketplace_send_message", {
  p_conversation_id: conversationId,
  p_body: text,
});

// Realtime (after send/list RPC validates membership)
supabase
  .channel(`conv:${conversationId}`)
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "marketplace_messages",
      filter: `conversation_id=eq.${conversationId}`,
    },
    handler,
  )
  .subscribe();
```

---

## /v1/verification

### Listing (company) verification

| RPC                                    | Auth          | Purpose                      |
| -------------------------------------- | ------------- | ---------------------------- |
| `integration_connect_api_key`          | seller        | Connect revenue/API provider |
| `integration_complete_oauth`           | seller        | OAuth completion             |
| `integration_disconnect`               | seller        | Disconnect                   |
| `integration_request_sync`             | seller        | Enqueue sync                 |
| `domain_verification_begin`            | seller        | Start domain gate            |
| `domain_verification_pending`          | seller        | Pending challenge            |
| `founder_submit_business_email`        | seller        | Business email gate          |
| `confirm_business_email_verification`  | anon/token    | Confirm email link           |
| `founder_submit_registration_document` | seller        | Registration doc             |
| `refresh_listing_gates_from_evidence`  | system/seller | Refresh gates                |
| `listing_mandatory_gates_pass`         | internal      | All gates pass               |
| `try_auto_publish_listing`             | internal      | Auto publish                 |

### Person verification

| RPC                                         | Auth          | Purpose                  |
| ------------------------------------------- | ------------- | ------------------------ |
| `get_or_create_person_verification_profile` | authenticated | Profile row              |
| `submit_person_verification_profile`        | authenticated | Submit person KYC fields |
| `begin_person_identity_verification`        | buyer/seller  | Start Stripe Identity    |
| `founder_begin_identity_verification`       | seller        | Listing-linked identity  |
| `founder_launch_identity_verification`      | seller        | Launch token for Edge    |
| `consume_identity_launch_token`             | service/edge  | Consume launch           |

### Edge (HTTP, not PostgREST)

| Route                                | Role                                           |
| ------------------------------------ | ---------------------------------------------- |
| `POST /api/webhooks/stripe/identity` | Stripe → `webhook_apply_identity_verification` |
| Edge: send business email            | → Resend                                       |
| Edge: process registration           | → OCR RPC complete                             |

```ts
await supabase.rpc("domain_verification_begin", {
  p_startup_id: startupId,
  p_domain: domain,
});

await supabase.rpc("integration_connect_api_key", {
  p_startup_id: startupId,
  p_provider_slug: "stripe",
  p_secret: secret,
});
```

---

## /v1/admin

| RPC                                  | Auth  | Purpose                  |
| ------------------------------------ | ----- | ------------------------ |
| `admin_platform_summary`             | admin | Platform KPIs            |
| `admin_marketplace_summary`          | admin | Marketplace KPIs         |
| `admin_network_summary`              | admin | Network KPIs             |
| `admin_os_summary`                   | admin | Ownerr OS KPIs           |
| `admin_operations_summary`           | admin | Ops                      |
| `admin_system_health`                | admin | Health                   |
| `admin_verification_ops_summary`     | admin | Verification queue stats |
| `admin_listing_verification_queue`   | admin | Review queue             |
| `admin_fraud_investigation_queue`    | admin | Fraud queue              |
| `admin_review_identity`              | admin | Manual identity review   |
| `admin_review_registration_document` | admin | Doc review               |
| `admin_review_business_email`        | admin | Email review             |
| `admin_suspend_listing`              | admin | Suspend                  |
| `admin_override_trust`               | admin | Trust override + audit   |
| `admin_marketplace_offers_dashboard` | admin | Offers ops               |
| `admin_api_observability_summary`    | admin | **Planned** — RPC logs   |

```ts
const { data, error } = await supabase.rpc("admin_platform_summary");
```

---

## Network (Ownerr Network product)

| RPC                                   | Auth          | Purpose                |
| ------------------------------------- | ------------- | ---------------------- |
| `ownerr_network_provision_user`       | authenticated | Provision network user |
| `ownerr_network_complete_onboarding`  | authenticated | Onboarding             |
| `ownerr_network_claim_daily_activity` | authenticated | Daily claim            |

Legacy `unemployed_*` — **deprecate**; adapter calls `ownerr_network_*` only.

---

## Founder campaign (Ownerr OS viral)

| RPC                               | Auth        | Purpose     |
| --------------------------------- | ----------- | ----------- |
| `founder_public_by_referral_code` | public      | Public card |
| `founder_track_referral`          | public/anon | Track visit |
| `admin_founder_analytics`         | admin       | Analytics   |

**Deprecate:** `founder_analytics_summary(admin_key)`.

---

## Storage (target presign flow)

| RPC                         | Auth          | Purpose                       |
| --------------------------- | ------------- | ----------------------------- |
| `storage_create_upload_url` | authenticated | **Planned** — signed upload   |
| `storage_confirm_upload`    | authenticated | **Planned** — attach metadata |

Until implemented: `sellerIntakeApi` uses Storage SDK (debt TD-12).

---

## Platform guards (internal)

| Function                         | Purpose                                |
| -------------------------------- | -------------------------------------- |
| `is_platform_admin()`            | Admin check — **must be DB role only** |
| `current_user_id()`              | Map auth.uid → users.id                |
| `startup_owned_by_auth(uuid)`    | Seller owns company                    |
| `api_guard(text)`                | **Planned** — rate limit               |
| `append_audit_log(...)`          | Audit row                              |
| `append_verification_event(...)` | Verification event stream              |

---

## Error codes (client mapping)

| Code               | Typical source       |
| ------------------ | -------------------- |
| `UNAUTHENTICATED`  | No JWT               |
| `FORBIDDEN`        | RLS / RPC guard      |
| `NOT_FOUND`        | PGRST116             |
| `OFFER_NOT_FOUND`  | Offer RPC            |
| `GATE_BLOCKED`     | Publish/verification |
| `RATE_LIMITED`     | `api_guard`          |
| `VALIDATION_ERROR` | RPC args / CHECK     |
| `PROVIDER_ERROR`   | Integration sync     |
| `INTERNAL_ERROR`   | Unmapped SQL         |

---

## Implementation status legend

| Label       | Meaning                                      |
| ----------- | -------------------------------------------- |
| _(none)_    | Exists in migrations today                   |
| **Planned** | Required by enterprise spec; not in repo yet |

See [enterprise-supabase-api.md](./enterprise-supabase-api.md) for roadmap and debt IDs.
