/**
 * Same-origin routes for optional async verification (identity, email, jobs).
 * Marketplace desk does not use these — Supabase RPC/RLS only.
 * Verification jobs: same-origin /api/sync-worker (Vite inline middleware or Vercel serverless).
 */
export function resolveSyncWorkerPublicBase(serverEndpoint: string): string {
  const override = import.meta.env.VITE_SYNC_WORKER_PUBLIC_URL?.trim();
  if (override?.startsWith("/")) {
    return override.replace(/\/$/, "").replace(/\/v1\/process-jobs$/, "");
  }
  if (override && !override.startsWith("/")) {
    return override.replace(/\/$/, "").replace(/\/v1\/process-jobs$/, "");
  }

  if (import.meta.env.DEV) {
    return "/api/sync-worker";
  }

  try {
    const invoke = new URL(serverEndpoint);
    if (invoke.hostname === "localhost" || invoke.hostname === "127.0.0.1") {
      return "/api/sync-worker";
    }
  } catch {
    /* fall through */
  }

  return "/api/sync-worker";
}

export function resolveSyncWorkerIdentitySessionUrl(
  serverEndpoint: string,
): string {
  return `${resolveSyncWorkerPublicBase(serverEndpoint)}/v1/identity/session`;
}

export function resolveSyncWorkerProcessJobsUrl(
  serverEndpoint: string,
): string {
  return `${resolveSyncWorkerPublicBase(serverEndpoint)}/v1/process-jobs`;
}

export function resolveSyncWorkerBusinessEmailUrl(
  serverEndpoint: string,
): string {
  return `${resolveSyncWorkerPublicBase(serverEndpoint)}/v1/verification/send-business-email`;
}
