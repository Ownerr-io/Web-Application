/**
 * Stores INTEGRATION_ENCRYPTION_KEY from .env.local into
 * public.sys_platform_config (required for integration_connect_api_key RPC).
 * Prefer: npm run platform:set-integration-secrets (encryption + worker URLs).
 *
 * Usage:
 *   openssl rand -base64 32   # add output to .env.local as INTEGRATION_ENCRYPTION_KEY=
 *   npm run platform:set-integration-key
 */
import path from "node:path";
import dns from "node:dns";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

config({ path: path.join(repoRoot, ".env.local") });
config({ path: path.join(repoRoot, ".env") });

const key = process.env.INTEGRATION_ENCRYPTION_KEY?.trim();
const url =
  process.env.DATABASE_URL_MIGRATE ??
  process.env.DATABASE_URL ??
  process.env.DATABASE_URL_POOLER;

if (!key || key.length < 32) {
  console.error(
    "INTEGRATION_ENCRYPTION_KEY missing or too short (need 32+ chars) in .env.local",
  );
  console.error("Generate one: openssl rand -base64 32");
  process.exit(1);
}

if (!url) {
  console.error("DATABASE_URL missing in .env.local");
  process.exit(1);
}

function lookupIpv4(hostname, _options, callback) {
  dns.lookup(hostname, { family: 4, all: false }, callback);
}

const pool = new pg.Pool({
  connectionString: url,
  ssl: url.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
  lookup: lookupIpv4,
  connectionTimeoutMillis: 30_000,
});

const client = await pool.connect();
try {
  await client.query(
    `INSERT INTO public.sys_platform_config (key, value)
     VALUES ('integration_encryption_key', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key],
  );
  console.log(
    "integration_encryption_key stored in sys_platform_config (Postgres).",
  );
  console.warn(
    "Run npm run platform:set-integration-secrets to also set sync worker URLs for domain/revenue jobs.",
  );
} finally {
  client.release();
  await pool.end();
}
