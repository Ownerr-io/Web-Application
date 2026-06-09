/**
 * Validates sys_platform_config + job backlog for verification (no writes).
 * Exit 1 when misconfigured for production-style deploys.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

config({ path: path.join(repoRoot, ".env.local") });
config({ path: path.join(repoRoot, ".env.production") });
config({ path: path.join(repoRoot, ".env") });

const url =
  process.env.DATABASE_URL_MIGRATE ??
  process.env.DATABASE_URL ??
  process.env.DATABASE_URL_POOLER;

function readHttpsSiteFromProductionFile() {
  const p = path.join(repoRoot, ".env.production");
  if (!fs.existsSync(p)) return "";
  const text = fs.readFileSync(p, "utf8");
  for (const key of ["VITE_PUBLIC_SITE_URL", "PUBLIC_SITE_URL"]) {
    const m = text.match(new RegExp(`^${key}=(.+)$`, "m"));
    const v = m?.[1]?.trim().replace(/^["']|["']$/g, "");
    if (v?.startsWith("https://")) return v.replace(/\/$/, "");
  }
  return "";
}

const mergedSite =
  process.env.VITE_PUBLIC_SITE_URL?.trim() ||
  process.env.PUBLIC_SITE_URL?.trim() ||
  "";
const productionFileSite = readHttpsSiteFromProductionFile();
const site =
  (mergedSite && /localhost|127\.0\.0\.1/.test(mergedSite) && productionFileSite) ||
  (mergedSite.startsWith("https://") ? mergedSite : "") ||
  productionFileSite ||
  mergedSite;

let failed = false;
function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed = true;
}
function ok(msg) {
  console.log(`OK: ${msg}`);
}
function warn(msg) {
  console.warn(`WARN: ${msg}`);
}

if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: url.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
});
await client.connect();

try {
  const { rows: cfgRows } = await client.query(
    `SELECT key, value FROM public.sys_platform_config
     WHERE key IN (
       'integration_encryption_key',
       'sync_worker_invoke_url',
       'sync_worker_public_url',
       'sync_worker_invoke_secret'
     )`,
  );
  const cfg = Object.fromEntries(cfgRows.map((r) => [r.key, r.value]));

  if (!cfg.integration_encryption_key || cfg.integration_encryption_key.length < 32) {
    fail("integration_encryption_key missing or too short in sys_platform_config");
  } else {
    ok("integration_encryption_key present");
  }

  const invoke = cfg.sync_worker_invoke_url ?? "";
  const pub = cfg.sync_worker_public_url ?? "";
  const isLocal =
    /localhost|127\.0\.0\.1|:8787\b/.test(invoke) || /localhost|127\.0\.0\.1|:8787\b/.test(pub);

  if (site && /^https:\/\//.test(site) && isLocal) {
    fail(
      `sync worker URLs still local (${invoke || "?"}) but site is ${site} — run npm run platform:set-integration-secrets`,
    );
  } else if (isLocal) {
    warn(`sync worker URLs are local (fine for dev only): ${invoke || pub}`);
  } else {
    ok(`sync worker invoke URL: ${invoke}`);
  }

  const vercelSecret = process.env.SYNC_WORKER_CRON_SECRET?.trim();
  if (vercelSecret && cfg.sync_worker_invoke_secret && cfg.sync_worker_invoke_secret !== vercelSecret) {
    fail("sync_worker_invoke_secret in DB does not match SYNC_WORKER_CRON_SECRET in env");
  } else if (!cfg.sync_worker_invoke_secret) {
    warn("sync_worker_invoke_secret not in DB — pg_net job drain may 401");
  } else {
    ok("sync_worker_invoke_secret aligned with env");
  }

  const { rows: jobs } = await client.query(`
    SELECT job_type, status, count(*)::int AS c
    FROM public.trust_integration_jobs
    WHERE status IN ('pending', 'failed')
    GROUP BY 1, 2
    ORDER BY c DESC`);
  if (jobs.length) {
    console.log("Job backlog:", jobs);
    const pendingDomain = jobs.find((j) => j.job_type === "domain_check" && j.status === "pending");
    if (pendingDomain?.c > 10 && isLocal && site.startsWith("https://")) {
      fail(`${pendingDomain.c} pending domain_check jobs — fix worker URLs then POST /v1/process-jobs`);
    }
  } else {
    ok("no pending/failed integration jobs");
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    warn("SUPABASE_SERVICE_ROLE_KEY not in env (required on Vercel for inline /api/sync-worker)");
  }
  if (site.startsWith("https://") && !process.env.RESEND_API_KEY?.trim()) {
    warn("RESEND_API_KEY not in env — business email send fails in production");
  }
} finally {
  await client.end();
}

process.exit(failed ? 1 : 0);
