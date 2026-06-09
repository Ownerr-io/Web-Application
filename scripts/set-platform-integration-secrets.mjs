/**
 * Stores platform config in sys_platform_config (schema v2):
 * - integration_encryption_key (32+ chars)
 * - integration_encryption_pepper (16+ chars, optional)
 * - sync_worker_invoke_url — HTTPS /api/sync-worker/v1/process-jobs on your Vercel site
 * - sync_worker_invoke_secret (optional, matches SYNC_WORKER_CRON_SECRET on Vercel)
 * - sync_worker_public_url — browser + founder_invoke_sync_worker base
 */
import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

config({ path: path.join(repoRoot, ".env.production") });
config({ path: path.join(repoRoot, ".env.local") });
config({ path: path.join(repoRoot, ".env") });

function readSiteFromEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return "";
  const text = fs.readFileSync(filePath, "utf8");
  for (const key of ["VITE_PUBLIC_SITE_URL", "PUBLIC_SITE_URL"]) {
    const m = text.match(new RegExp(`^${key}=(.+)$`, "m"));
    const v = m?.[1]?.trim().replace(/^["']|["']$/g, "");
    if (v?.startsWith("https://")) return v.replace(/\/$/, "");
  }
  return "";
}

const productionFileSite = readSiteFromEnvFile(path.join(repoRoot, ".env.production"));
const mergedSite = (
  process.env.VITE_PUBLIC_SITE_URL?.trim() ||
  process.env.PUBLIC_SITE_URL?.trim() ||
  ""
).replace(/\/$/, "");

const forceProduction =
  process.env.PLATFORM_CONFIG_TARGET?.trim().toLowerCase() === "production";

/** Prefer https site from .env.production when local .env points at localhost. */
const productionSite =
  (forceProduction && productionFileSite) ||
  (productionFileSite && mergedSite && /localhost|127\.0\.0\.1/.test(mergedSite)
    ? productionFileSite
    : "") ||
  (mergedSite.startsWith("https://") ? mergedSite : "") ||
  productionFileSite ||
  mergedSite;

function isLocalWorkerUrl(u) {
  return !u || /localhost|127\.0\.0\.1|:8787\b/.test(u);
}

function defaultSyncPublicBase() {
  const explicit = process.env.SYNC_WORKER_PUBLIC_URL?.trim();
  if (productionSite.startsWith("https://") && (forceProduction || isLocalWorkerUrl(explicit))) {
    return `${productionSite}/api/sync-worker`;
  }
  if (explicit && !isLocalWorkerUrl(explicit)) {
    return explicit.replace(/\/$/, "").replace(/\/v1\/process-jobs$/, "");
  }
  if (productionSite) {
    return `${productionSite}/api/sync-worker`;
  }
  if (explicit) {
    return explicit.replace(/\/$/, "").replace(/\/v1\/process-jobs$/, "");
  }
  const invoke = process.env.SYNC_WORKER_INVOKE_URL?.trim() ?? "";
  if (/localhost|127\.0\.0\.1/.test(invoke)) {
    return "http://localhost:5173/api/sync-worker";
  }
  return undefined;
}

const syncPublicBase = defaultSyncPublicBase();
const explicitInvoke = process.env.SYNC_WORKER_INVOKE_URL?.trim();
let syncInvokeUrl = syncPublicBase ? `${syncPublicBase}/v1/process-jobs` : undefined;
if (
  explicitInvoke &&
  !isLocalWorkerUrl(explicitInvoke) &&
  !(productionSite.startsWith("https://") && isLocalWorkerUrl(explicitInvoke))
) {
  syncInvokeUrl = explicitInvoke;
}
if (
  productionSite.startsWith("https://") &&
  syncInvokeUrl &&
  isLocalWorkerUrl(syncInvokeUrl)
) {
  syncInvokeUrl = `${productionSite}/api/sync-worker/v1/process-jobs`;
}
const urlsLookLocal =
  (syncInvokeUrl && /localhost|127\.0\.0\.1|:8787\b/.test(syncInvokeUrl)) ||
  (syncPublicBase && /localhost|127\.0\.0\.1|:8787\b/.test(syncPublicBase));
if (productionSite.startsWith("https://") && urlsLookLocal) {
  console.error(
    `Refusing to store localhost worker URLs while site is ${productionSite}.`,
  );
  console.error(
    "Set VITE_PUBLIC_SITE_URL (or SYNC_WORKER_PUBLIC_URL) to your live origin, or unset production site URL for local-only DB updates.",
  );
  process.exit(1);
}

const entries = [
  ["integration_encryption_key", process.env.INTEGRATION_ENCRYPTION_KEY?.trim()],
  ["integration_encryption_pepper", process.env.INTEGRATION_ENCRYPTION_PEPPER?.trim()],
  ["sync_worker_invoke_url", syncInvokeUrl],
  ["sync_worker_invoke_secret", process.env.SYNC_WORKER_CRON_SECRET?.trim()],
  ["sync_worker_public_url", syncPublicBase],
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
      `INSERT INTO public.sys_platform_config (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [k, v],
    );
    console.log(`stored sys_platform_config.${k}`);
  }
  if (!process.env.INTEGRATION_ENCRYPTION_PEPPER?.trim()) {
    console.warn(
      "Tip: set INTEGRATION_ENCRYPTION_PEPPER (openssl rand -base64 24) for defense-in-depth.",
    );
  }
  if (!syncInvokeUrl) {
    console.warn(
      "Tip: set VITE_PUBLIC_SITE_URL or SYNC_WORKER_PUBLIC_URL so domain/revenue jobs can reach /api/sync-worker on your deploy.",
    );
  } else {
    console.log(
      "Verification jobs will use the same Vercel deploy (no separate sync-worker host):",
      syncInvokeUrl,
    );
  }
  if (!process.env.SYNC_WORKER_CRON_SECRET?.trim()) {
    console.warn(
      "Tip: set SYNC_WORKER_CRON_SECRET on Vercel and re-run this script so Supabase pg_net can drain jobs.",
    );
  }
} finally {
  client.release();
  await pool.end();
}
