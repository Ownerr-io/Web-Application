# Supabase schema — deprecations (product isolation)

## `platform_users.preferred_app_slug`

- **Status:** Deprecated, not used by the web app after product isolation.
- **Replacement:** `sessionStorage` key `ownerr.active_product` + optional `product_sessions.product`.
- **Migration:** `20260529200000_deprecate_preferred_app_slug.sql` adds a column comment only.
- **Removal:** Drop column in a future migration after confirming no external consumers (API server, analytics).

## Tables still required (not launcher UI)

| Table                                                              | Purpose                                                                  |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `platform_users`                                                   | Identity row (email, display_name) for upsert on first product provision |
| `user_app_access`                                                  | Per-product membership (`app_slug`, role, status)                        |
| `ownerr_profiles` / `marketplace_profiles` / `unemployed_profiles` | Product-specific profile rows                                            |
| `unemployed_users`                                                 | Unemployed network user record (RPC + legacy)                            |
| `product_sessions`                                                 | Optional server-side last-active product audit                           |
| `user_preferences`                                                 | Reserved for per-user JSON preferences (not wired in UI yet)             |

## Safe upsert assumptions

- Unique `auth_user_id` on each product profile table (see `20260529120000_product_isolation_schema.sql`).
- Unique `(auth_user_id, app_slug)` on `user_app_access`.
