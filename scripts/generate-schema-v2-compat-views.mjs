/**
 * Generates SQL fragment: compatibility views (old name -> new physical table).
 * Used by supabase/migrations/20260702510000_schema_v2_renames.sql (regenerate if map changes).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const map = JSON.parse(
  fs.readFileSync(path.join(__dirname, "schema-v2/table-renames.json"), "utf8"),
);

const lines = [];
for (const [newName, oldName] of map.renames) {
  if (newName === oldName) continue;
  lines.push(`DROP VIEW IF EXISTS public.${oldName} CASCADE;`);
  lines.push(
    `CREATE VIEW public.${oldName} WITH (security_invoker = true) AS SELECT * FROM public.${newName};`,
  );
  lines.push(
    `COMMENT ON VIEW public.${oldName} IS 'Schema v2 compat shim; use public.${newName} in new code.';`,
  );
  lines.push("");
}

process.stdout.write(lines.join("\n"));
