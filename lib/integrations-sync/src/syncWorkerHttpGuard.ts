type WindowCounter = { count: number; resetAt: number };

const windows = new Map<string, WindowCounter>();

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const STARTUP_LIMIT = envInt("SYNC_WORKER_MAX_INVOKES_PER_STARTUP_PER_MIN", 12);
const IP_LIMIT = envInt("SYNC_WORKER_MAX_INVOKES_PER_IP_PER_MIN", 40);
const CRON_IP_LIMIT = envInt(
  "SYNC_WORKER_MAX_CRON_INVOKES_PER_IP_PER_MIN",
  120,
);

function bump(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  let row = windows.get(key);
  if (!row || now >= row.resetAt) {
    row = { count: 0, resetAt: now + windowMs };
    windows.set(key, row);
  }
  row.count += 1;
  if (row.count > limit) {
    const retryAfterSec = Math.max(1, Math.ceil((row.resetAt - now) / 1000));
    return { ok: false, retryAfterSec };
  }
  return { ok: true, retryAfterSec: 0 };
}

/** Best-effort per-instance limiter (use with DB guards on founder_invoke). */
export function checkSyncWorkerProcessJobsRateLimit(input: {
  clientIp: string;
  startupId?: string;
  isCronAuth: boolean;
}): { ok: true } | { ok: false; retryAfterSec: number } {
  const windowMs = 60_000;
  const ipKey = `ip:${input.clientIp || "unknown"}`;
  const ipLimit = input.isCronAuth ? CRON_IP_LIMIT : IP_LIMIT;
  const ip = bump(ipKey, ipLimit, windowMs);
  if (!ip.ok) return { ok: false, retryAfterSec: ip.retryAfterSec };

  if (!input.isCronAuth && input.startupId) {
    const startup = bump(`startup:${input.startupId}`, STARTUP_LIMIT, windowMs);
    if (!startup.ok) return { ok: false, retryAfterSec: startup.retryAfterSec };
  }
  return { ok: true };
}

export function resolveClientIpFromHeaders(
  headers: Record<string, string | string[] | undefined>,
): string {
  const forwarded = headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0]).split(",")[0]?.trim() ?? "unknown";
  }
  const realIp = headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) return realIp.trim();
  return "unknown";
}

export function isSyncWorkerCronAuthorized(
  authorization: string | undefined,
  cronSecret: string | undefined,
): boolean {
  return Boolean(cronSecret && authorization === `Bearer ${cronSecret}`);
}
