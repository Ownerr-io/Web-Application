#!/usr/bin/env node
/**
 * Writes supabase/migrations/20260702510000_schema_v2_renames.sql
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const map = JSON.parse(
  fs.readFileSync(path.join(__dirname, "schema-v2/table-renames.json"), "utf8"),
);

const renameBlocks = [];
const registryInserts = [];
for (const [physical, legacy] of map.renames) {
  renameBlocks.push(`
DO $r$ BEGIN
  IF to_regclass('public.${legacy}') IS NOT NULL
     AND to_regclass('public.${physical}') IS NULL THEN
    ALTER TABLE public.${legacy} RENAME TO ${physical};
  END IF;
END $r$;`);
  registryInserts.push(
    `INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('${physical}', '${legacy}', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;`,
  );
}

const viewBlocks = [];
for (const [physical, legacy] of map.renames) {
  if (physical === legacy) continue;
  viewBlocks.push(`DROP VIEW IF EXISTS public.${legacy} CASCADE;`);
  viewBlocks.push(
    `CREATE VIEW public.${legacy} WITH (security_invoker = true) AS SELECT * FROM public.${physical};`,
  );
  viewBlocks.push(
    `COMMENT ON VIEW public.${legacy} IS 'Schema v2 compat; prefer public.${physical}.';`,
  );
}

const sql = `-- Schema v2: physical rename + compat views (zero row loss; ALTER TABLE RENAME).
-- Generated from scripts/schema-v2/table-renames.json — re-run generator after edits.

BEGIN;

${renameBlocks.join("\n")}

${registryInserts.join("\n")}

-- Compatibility views (old names for RPCs / gradual client migration)
${viewBlocks.join("\n")}

-- Core helpers point at physical marketplace table
CREATE OR REPLACE FUNCTION public.startup_owned_by_auth(p_startup_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.marketplace_companies s
    WHERE s.id = p_startup_id AND s.founder_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.startup_owned_by_auth_slug(p_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.marketplace_companies s
    WHERE s.slug = p_slug AND s.founder_user_id = auth.uid()
  );
$$;

-- Indexes (idempotent) on high-traffic marketplace tables
CREATE INDEX IF NOT EXISTS marketplace_companies_founder_user_id_idx
  ON public.marketplace_companies (founder_user_id);
CREATE INDEX IF NOT EXISTS marketplace_companies_listing_lifecycle_idx
  ON public.marketplace_companies (listing_lifecycle, visibility, status);
CREATE INDEX IF NOT EXISTS marketplace_accounts_auth_user_id_idx
  ON public.marketplace_accounts (auth_user_id);
CREATE INDEX IF NOT EXISTS marketplace_accounts_desk_role_idx
  ON public.marketplace_accounts (auth_user_id, desk_role);
CREATE INDEX IF NOT EXISTS marketplace_offers_startup_id_idx
  ON public.marketplace_offers (startup_id, status);
CREATE INDEX IF NOT EXISTS marketplace_offers_buyer_profile_id_idx
  ON public.marketplace_offers (buyer_profile_id);
CREATE INDEX IF NOT EXISTS marketplace_conversations_startup_id_idx
  ON public.marketplace_conversations (startup_id);
CREATE INDEX IF NOT EXISTS marketplace_messages_conversation_id_idx
  ON public.marketplace_messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS trust_integrations_startup_id_idx
  ON public.trust_integrations (startup_id);
CREATE INDEX IF NOT EXISTS trust_listing_gates_fraud_risk_idx
  ON public.trust_listing_gates (fraud_risk);

-- Table privileges follow renamed relations; do not widen anon grants here.

NOTIFY pgrst, 'reload schema';

COMMIT;
`;

const out = path.join(repoRoot, "supabase/migrations/20260702510000_schema_v2_renames.sql");
fs.writeFileSync(out, sql);
console.log("Wrote", out);
