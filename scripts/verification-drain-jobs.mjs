/**
 * POST /api/sync-worker/v1/process-jobs to drain pending verification jobs.
 * Uses SYNC_WORKER_CRON_SECRET and worker base from env or sys_platform_config.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

config({ path: path.join(repoRoot, ".env.local") });
config({ path: path.join(repoRoot, ".env.production") });

const maxJobs = Number(process.env.VERIFICATION_DRAIN_MAX_JOBS ?? 50);
const cronSecret = process.env.SYNC_WORKER_CRON_SECRET?.trim();
const site =
  process.env.VITE_PUBLIC_SITE_URL?.trim() ||
  process.env.PUBLIC_SITE_URL?.trim() ||
  "";
let workerBase =
  process.env.SYNC_WORKER_PUBLIC_URL?.trim()?.replace(/\/v1\/process-jobs$/, "") ||
  (site ? `${site.replace(/\/$/, "")}/api/sync-worker` : "") ||
  "http://localhost:5173/api/sync-worker";

const url =
  process.env.DATABASE_URL_MIGRATE ??
  process.env.DATABASE_URL ??
  process.env.DATABASE_URL_POOLER;

if (!cronSecret) {
  console.error("SYNC_WORKER_CRON_SECRET required");
  process.exit(1);
}

if (url) {
  const client = new pg.Client({
    connectionString: url,
    ssl: url.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT value FROM public.sys_platform_config WHERE key = 'sync_worker_public_url' LIMIT 1`,
    );
    const dbPub = rows[0]?.value?.trim();
    if (dbPub && !/localhost|8787/.test(dbPub)) {
      workerBase = dbPub.replace(/\/$/, "");
    }
  } finally {
    await client.end();
  }
}

const endpoint = `${workerBase.replace(/\/$/, "")}/v1/process-jobs`;
console.log("Draining jobs via", endpoint, "max_jobs=", maxJobs);

const res = await fetch(endpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${cronSecret}`,
  },
  body: JSON.stringify({ max_jobs: maxJobs }),
});

const text = await res.text();
console.log(res.status, text.slice(0, 500));
if (!res.ok) {
  if (res.status === 405 || text.includes("<!DOCTYPE html")) {
    console.error(
      "Hint: /api/sync-worker is not deployed as serverless yet (got SPA HTML or 405). Redeploy Vercel with explicit api/sync-worker/*.ts routes.",
    );
  }
}
process.exit(res.ok ? 0 : 1);
