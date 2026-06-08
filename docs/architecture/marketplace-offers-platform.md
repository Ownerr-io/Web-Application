# Marketplace Offers & Bids Platform — Architecture Report

## Existing audit (pre-implementation)

### Tables

| Table                                      | Role                                                                   |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `public.bids`                              | Offer amounts, buyer_profile_id, startup_id, status, message, currency |
| `public.startup_interests`                 | Express interest (separate from structured offers)                     |
| `public.conversations` / `public.messages` | Inbox messaging                                                        |
| `public.startups`                          | `listing_lifecycle`, `founder_user_id`, `offers_open` (added)          |
| `public.marketplace_profiles`              | Buyer/seller desk profiles                                             |

### Bid statuses (before extension)

`draft`, `submitted`, `under_review`, `accepted`, `rejected`, `withdrawn`, `expired`  
(Historical schema also allowed `countered`.)

### React (before)

| Surface                   | Path / hook                                                               |
| ------------------------- | ------------------------------------------------------------------------- |
| Buyer bids list           | `/marketplace/app/buyer/bids`, `useMyBids`, `bidService.listBidsForBuyer` |
| Submit bid (browse)       | `AcquireBidPanel`, `useCreateBid`                                         |
| Interest + optional offer | `expressInterest` → `startup_interests` + `bids` row                      |
| Seller bid UI             | **None** (interests only on listing detail)                               |
| `useUpdateBidStatus`      | Defined, **not wired**                                                    |

### RLS (existing)

- Buyer: select/insert/update own bids
- Seller: select/update bids on startups where `founder_user_id = auth.uid()`
- Admin: `bids_admin_manage`

### RPCs (existing, offers-related)

- None for offer lifecycle; admin participant RPCs read `bids` for counts only.

## Additive design

- **`bid_versions`**: append-only negotiation history (never overwrite amounts in place without a version row).
- **`acquisition_deals`**: post-accept workflow stages (due diligence → closed).
- **`marketplace_offer_events`**: notification + audit events (no separate push infra yet).
- **Extend `bids`**: `proof_of_funds`, `expires_at`, `conversation_id`, `acquisition_stage`, `last_actor_role`.
- **Extend `startups`**: `offers_open`, lifecycle value `under_contract`.
- **RPCs**: submit, counter, accept, decline, withdraw, accept counter, list seller/buyer offers, admin dashboard.
- **`sync_listing_lifecycle`**: early-return for `under_contract` (does not alter verification auto-publish for other states).

## Status mapping (backward compatible)

| Legacy      | Canonical UI |
| ----------- | ------------ |
| `rejected`  | `declined`   |
| `countered` | `countered`  |

New: `declined`, `superseded`, `closed_due_to_accepted_offer`, `due_diligence`, `closed` (bid-level terminal states where applicable).

## Rollback plan

1. Revert web deploy (routes/pages/hooks only use new RPCs when present).
2. Migration rollback script (manual): drop new RPCs, drop `bid_versions`, `acquisition_deals`, `marketplace_offer_events`; drop new columns on `bids`/`startups`; restore previous `bids_status_check` and `sync_listing_lifecycle` from prior migration file.
3. Data: new columns nullable; old bids unchanged.

## Testing checklist

- [ ] Buyer submits offer on published startup → row + version 1
- [ ] Seller sees offer on `/seller/offers` and company tab
- [ ] Seller counter → version 2, status `countered`
- [ ] Buyer accept counter → `under_review`
- [ ] Seller accept → `accepted`, `under_contract`, other bids `superseded`, `offers_open = false`
- [ ] Inbox unchanged; Open Conversation from offer card works
- [ ] Verification / auto-publish still works for non-contract listings
- [ ] Admin offers dashboard loads via RPC
- [ ] PostHog events fire when configured

## Implementation map

| Deliverable        | Location                                                             |
| ------------------ | -------------------------------------------------------------------- |
| Migration          | `supabase/migrations/20260702430000_marketplace_offers_platform.sql` |
| Offer API (client) | `artifacts/ownerr-web-app/src/lib/marketplace/offerService.ts`       |
| Hooks              | `artifacts/ownerr-web-app/src/hooks/marketplace/useOffers.ts`        |
| Buyer UI           | `/marketplace/app/buyer/offers` (legacy `/buyer/bids` redirects)     |
| Seller UI          | `/marketplace/app/seller/offers`                                     |
| Company tabs       | Interested / Offers / Messages on seller company workspace           |
| Admin UI           | `/admin/marketplace/offers`                                          |
| Analytics          | `offerAnalytics.ts` → PostHog                                        |
| Notifications      | `marketplace_offer_events`                                           |
