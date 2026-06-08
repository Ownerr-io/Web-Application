/**
 * Stores integration secrets config in platform_internal_config:
 * - integration_encryption_key (32+ chars)
 * - integration_encryption_pepper (16+ chars, optional but recommended)
 * - sync_worker_invoke_url (optional — async verification jobs)
 * - sync_worker_invoke_secret (optional, matches SYNC_WORKER_CRON_SECRET)
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

const entries = [
  ["integration_encryption_key", process.env.INTEGRATION_ENCRYPTION_KEY?.trim()],
  ["integration_encryption_pepper", process.env.INTEGRATION_ENCRYPTION_PEPPER?.trim()],
  ["sync_worker_invoke_url", process.env.SYNC_WORKER_INVOKE_URL?.trim()],
  ["sync_worker_invoke_secret", process.env.SYNC_WORKER_CRON_SECRET?.trim()],
  [
    "sync_worker_public_url",
    (() => {
      const explicit = process.env.SYNC_WORKER_PUBLIC_URL?.trim();
      if (explicit) return explicit;
      const invoke = process.env.SYNC_WORKER_INVOKE_URL?.trim() ?? "";
      if (/localhost|127\.0\.0\.1/.test(invoke)) {
        return "http://localhost:5173/api/sync-worker";
      }
      return undefined;
    })(),
  ],
].filter(([, v]) => v && v.length > 0);

const url =
  process.env.DATABASE_URL_MIGRATE ??
  process.env.DATABASE_URL ??
  process.env.DATABASE_URL_POOLER;

const key = process.env.INTEGRATION_ENCRYPTION_KEY?.trim();
if (!key || key.length < 32) {
  console.error("INTEGRATION_ENCRYPTION_KEY missing or too short (32+ chars).");
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
  for (const [k, v] of entries) {
    await client.query(
      `INSERT INTO public.platform_internal_config (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [k, v],
    );
    console.log(`stored platform_internal_config.${k}`);
  }
  if (!process.env.INTEGRATION_ENCRYPTION_PEPPER?.trim()) {
    console.warn(
      "Tip: set INTEGRATION_ENCRYPTION_PEPPER (openssl rand -base64 24) for defense-in-depth.",
    );
  }
  if (!process.env.SYNC_WORKER_INVOKE_URL?.trim()) {
    console.warn(
      "Tip: async verification (optional) needs verification invoke URLs in platform_internal_config. Marketplace desk does not require them.",
    );
  }
} finally {
  client.release();
  await pool.end();
}
