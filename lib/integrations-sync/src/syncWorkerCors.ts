function parseAllowedOrigins(): string[] {
  const fromList = process.env.SYNC_WORKER_CORS_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (fromList?.length) return fromList;

  const singles = [
    process.env.MARKETPLACE_PUBLIC_URL?.trim(),
    process.env.VITE_PUBLIC_SITE_URL?.trim(),
    process.env.PUBLIC_SITE_URL?.trim(),
  ].filter((s): s is string => Boolean(s));

  return [...new Set(singles)];
}

function isDevLocalOrigin(origin: string): boolean {
  if (process.env.NODE_ENV === "production") return false;
  try {
    const u = new URL(origin);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

/** Explicit CORS allowlist — never use wildcard for authenticated worker routes. */
export function resolveSyncWorkerCorsOrigin(
  requestOrigin: string | undefined,
): string | null {
  if (!requestOrigin) return null;
  const allowed = parseAllowedOrigins();
  if (allowed.includes(requestOrigin)) return requestOrigin;
  if (isDevLocalOrigin(requestOrigin)) return requestOrigin;
  return null;
}

export function syncWorkerCorsHeaders(
  requestOrigin: string | undefined,
): Record<string, string> {
  const allowOrigin = resolveSyncWorkerCorsOrigin(requestOrigin);
  const headers: Record<string, string> = {
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  };
  if (allowOrigin) {
    headers["Access-Control-Allow-Origin"] = allowOrigin;
  }
  return headers;
}
