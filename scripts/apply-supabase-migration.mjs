/**
 * Applies SQL files in supabase/migrations/ using DATABASE_URL from repo root .env.local
 * Use when `supabase db push` is not linked or drizzle-kit cannot run.
 *
 * Tracks applied files in public.ownerr_applied_migrations so re-runs are safe.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

config({ path: path.join(repoRoot, ".env.local") });
config({ path: path.join(repoRoot, ".env") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing. Set it in .env.local (Supabase → Database → URI).");
  process.exit(1);
}

const migrationsDir = path.join(repoRoot, "supabase", "migrations");
const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.error("No .sql files in supabase/migrations/");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url,
  ssl: url.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
});

/** Errors that usually mean this migration was already applied manually or earlier. */
function isAlreadyAppliedError(err) {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /already exists/i.test(msg) ||
    /duplicate key/i.test(msg) ||
    /already defined/i.test(msg) ||
    /cannot change return type of existing function/i.test(msg)
  );
}

async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.ownerr_applied_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

async function isRecorded(client, filename) {
  const { rows } = await client.query(
    `SELECT 1 FROM public.ownerr_applied_migrations WHERE filename = $1`,
    [filename],
  );
  return rows.length > 0;
}

async function skipLegacyWhenCanonicalSchema(client, filename) {
  const { rows } = await client.query(
    `SELECT to_regclass('public.users') AS canonical_users`,
  );
  if (!rows[0]?.canonical_users) return false;
  const canonicalCutoff =
    "20260701120000_ownerr_enterprise_master_schema.sql";
  return filename < canonicalCutoff;
}

/** Enterprise migration is not safely re-runnable once core tables exist. */
async function skipSupersededEnterpriseMigrations(client, filename) {
  const { rows } = await client.query(`
    SELECT
      to_regclass('public.user_profiles') AS user_profiles,
      to_regclass('public.user_onboarding_sessions') AS onboarding
  `);
  const hasProfiles = Boolean(rows[0]?.user_profiles);
  const hasOnboarding = Boolean(rows[0]?.onboarding);

  if (
    filename === "20260701120000_ownerr_enterprise_master_schema.sql" &&
    hasProfiles
  ) {
    return true;
  }
  if (
    filename === "20260701130000_ownerr_schema_finalize.sql" &&
    hasOnboarding
  ) {
    return true;
  }
  return false;
}

async function recordApplied(client, filename) {
  await client.query(
    `INSERT INTO public.ownerr_applied_migrations (filename)
     VALUES ($1)
     ON CONFLICT (filename) DO NOTHING`,
    [filename],
  );
}

const client = await pool.connect();

try {
  await ensureMigrationTable(client);

  let applied = 0;
  let skipped = 0;

  for (const file of files) {
    if (await isRecorded(client, file)) {
      console.log(`Skipping ${file} (already recorded)`);
      skipped += 1;
      continue;
    }

    if (await skipLegacyWhenCanonicalSchema(client, file)) {
      await recordApplied(client, file);
      console.log(
        `Skipping ${file} (canonical public.users schema — legacy migration)`,
      );
      skipped += 1;
      continue;
    }

    if (await skipSupersededEnterpriseMigrations(client, file)) {
      await recordApplied(client, file);
      console.log(`Skipping ${file} (already applied to this database)`);
      skipped += 1;
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`Applying ${file}…`);

    try {
      await client.query(sql);
      await recordApplied(client, file);
      console.log("  OK");
      applied += 1;
    } catch (err) {
      if (isAlreadyAppliedError(err)) {
        await recordApplied(client, file);
        console.log("  Already present in database — recorded and continuing");
        applied += 1;
        continue;
      }
      throw err;
    }
  }

  console.log(
    `Done. ${applied} applied or reconciled, ${skipped} skipped (previously recorded).`,
  );
} catch (err) {
  console.error("Migration failed:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
