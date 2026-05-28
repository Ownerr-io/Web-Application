type ProductErrorScope =
  | "auth.callback"
  | "auth.session"
  | "provision.ownerr"
  | "provision.marketplace"
  | "provision.ownerr_network"
  | "provider.ownerr"
  | "provider.marketplace"
  | "provider.ownerr_network";

/** Postgres unique violation or PostgREST conflict — expected during idempotent provision. */
export function isDuplicateDbError(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  const status = (err as { status?: number })?.status;
  return code === "23505" || status === 409;
}

/** Structured dev log for unexpected product failures (no noise for duplicates). */
export function logProductIssue(
  scope: ProductErrorScope,
  err: unknown,
  context?: Record<string, unknown>,
): void {
  if (isDuplicateDbError(err)) return;
  if (!import.meta.env.DEV) return;
  const payload = {
    scope,
    message: err instanceof Error ? err.message : String(err),
    code: (err as { code?: string })?.code,
    ...context,
  };
  console.error(`[ownerr:product]`, payload);
}

export function toUserFacingProductError(
  err: unknown,
  fallback: string,
): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}
