# Schema v2 (public)

Physical tables use **domain prefixes**. After full cutover (`20260702530000`), legacy compatibility views are **removed** — all clients must use physical names.

## Domains

| Prefix / area        | Examples                                                                   |
| -------------------- | -------------------------------------------------------------------------- |
| `marketplace_*`      | `marketplace_companies`, `marketplace_offers`, `marketplace_conversations` |
| `trust_*`            | `trust_integrations`, `trust_listing_gates`, `trust_identity_sessions`     |
| `catalog_*`          | `catalog_listings` (Ownerr OS directory)                                   |
| `founder_campaign_*` | Viral founder submissions                                                  |
| `sys_*`              | Platform config, audit logs, worker tokens                                 |
| Core (unchanged)     | `users`, `user_profiles`, `wallets`, …                                     |

## Registry

`public.schema_v2_rename_registry` lists `physical_name` ↔ `legacy_name` (historical reference only).

## Code

- **`@workspace/db-schema`** — `SchemaTables` (TypeScript app + workers)
- Web app re-exports from `artifacts/ownerr-web-app/src/lib/supabase/schemaTables.ts`
- Node scripts: `lib/db-schema/physicalTables.mjs`

## Migrations (order)

1. `20260702500000_schema_v2_archive_legacy.sql`
2. `20260702510000_schema_v2_renames.sql`
3. `202607025200_fix_rls_recursion_42p17.sql`
4. `20260702530000_schema_v2_full_cutover.sql` — rewrite RPC bodies, drop compat views, extra indexes

Regenerate rename migration (pre-cutover only):

```bash
node scripts/generate-schema-v2-renames-migration.mjs
```

Regenerate cutover migration after editing `scripts/schema-v2/table-renames.json`:

```bash
node scripts/generate-schema-v2-cutover-migration.mjs
npm run db:migrate
```

## Legacy data

- `_legacy_*` tables live in the **`archive`** schema (not exposed to PostgREST).
- Archived network users were backfilled into `public.users` where missing.
