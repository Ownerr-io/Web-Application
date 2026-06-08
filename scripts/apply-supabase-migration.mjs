/**
 * Applies SQL files in supabase/migrations/ using DATABASE_URL from repo root .env.local
 * Use when `supabase db push` is not linked or drizzle-kit cannot run.
 *
 * Tracks applied files in public.ownerr_applied_migrations so re-runs are safe.
 */
import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

config({ path: path.join(repoRoot, ".env.local") });
config({ path: path.join(repoRoot, ".env") });

/** Optional: set DATABASE_IPV4_ONLY=1 when IPv6 routes to db.*.supabase.co fail. */
function lookupIpv4(hostname, _options, callback) {
  dns.lookup(hostname, { family: 4, all: false }, callback);
}

function poolConfig(connectionString) {
  const ssl = connectionString.includes("supabase.co")
    ? { rejectUnauthorized: false }
    : undefined;
  const base = {
    connectionString,
    ssl,
    connectionTimeoutMillis: 30_000,
  };
  if (process.env.DATABASE_IPV4_ONLY === "1") {
    return { ...base, lookup: lookupIpv4 };
  }
  return base;
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

function createPool(connectionString) {
  return new pg.Pool(poolConfig(connectionString));
}

function hintForConnectError(connectionString, err) {
  const msg = err instanceof Error ? err.message : String(err);
  const label = connectionLabel(connectionString);
  if (/connection timeout|terminated due to connection timeout/i.test(msg)) {
    if (label.startsWith("db.") && process.env.DATABASE_IPV4_ONLY === "1") {
      return "Direct host may be IPv6-only — unset DATABASE_IPV4_ONLY or use Session pooler URI from the dashboard.";
    }
    if (label.startsWith("db.")) {
      return "Port 5432 to db.* may be blocked on your network — set DATABASE_URL_POOLER from Dashboard → Database → Connection pooling (Session mode).";
    }
  }
  if (/tenant\/user|ENOTFOUND/i.test(msg) && connectionString.includes("pooler")) {
    return "Pooler host/region or username is wrong — copy the full Session mode URI from Dashboard → Database (username must be postgres.[project-ref], host aws-0-<your-region>).";
  }
  return null;
}

function migrationCandidateUrls() {
  const urls = [];
  if (process.env.DATABASE_URL_MIGRATE) urls.push(process.env.DATABASE_URL_MIGRATE);
  // Pooler before direct: many networks block db.*:5432 but allow pooler (IPv4).
  if (process.env.DATABASE_URL_POOLER) urls.push(process.env.DATABASE_URL_POOLER);
  if (process.env.DATABASE_URL) urls.push(process.env.DATABASE_URL);
  return [...new Set(urls.filter(Boolean))];
}

function validatePoolerUrl(connectionString) {
  if (
    connectionString.includes("pooler.supabase.com") &&
    !/postgres\.[a-z0-9]+:/i.test(connectionString)
  ) {
    throw new Error(
      "Pooler URI must use username postgres.[project-ref] (Supabase → Database → Connection pooling → Session mode URI).",
    );
  }
}

function connectionLabel(connectionString) {
  try {
    const u = new URL(connectionString.replace(/^postgresql:/, "http:"));
    return `${u.hostname}:${u.port || "5432"}`;
  } catch {
    return "database";
  }
}

async function connectForMigrations() {
  const candidates = migrationCandidateUrls();
  if (candidates.length === 0) {
    console.error("DATABASE_URL missing in .env.local");
    process.exit(1);
  }

  let lastErr;
  for (const connectionString of candidates) {
    try {
      validatePoolerUrl(connectionString);
    } catch (err) {
      lastErr = err;
      console.error(err instanceof Error ? err.message : err);
      continue;
    }
    const pool = createPool(connectionString);
    try {
      const client = await pool.connect();
      console.log(`Connected (${connectionLabel(connectionString)})`);
      return { client, pool };
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `Could not connect via ${connectionLabel(connectionString)}: ${msg}`,
      );
      const hint = hintForConnectError(connectionString, err);
      if (hint) console.warn(`  → ${hint}`);
      await pool.end().catch(() => {});
    }
  }

  console.error(
    "All database connection attempts failed. Set DATABASE_URL from Dashboard → Database → URI (direct), or DATABASE_URL_POOLER (Session mode, exact region host). Optional: DATABASE_URL_MIGRATE to force one URI.",
  );
  if (lastErr instanceof Error) console.error(lastErr.message);
  process.exit(1);
}

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

const { client, pool } = await connectForMigrations();

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
