import type { PostgrestError } from "@supabase/supabase-js";

/** RPC is not deployed or PostgREST has not reloaded schema. */
export function isRpcUnavailableError(error: PostgrestError | null): boolean {
  if (!error) return false;
  const code = error.code;
  if (code === "PGRST202" || code === "PGRST205") return true;
  const msg = error.message ?? "";
  return msg.includes("Could not find") || msg.includes("function is not unique");
}

/**
 * When the RPC exists but rejects the request (400/401/403), do not fall back to
 * direct table access — that doubles load and rarely fixes auth/validation errors.
 */
export function shouldSkipDirectTableFallback(
  error: PostgrestError | null,
): boolean {
  if (!error) return false;
  if (isRpcUnavailableError(error)) return false;
  const status = (error as { status?: number }).status;
  if (status === 400 || status === 401 || status === 403 || status === 404) {
    return true;
  }
  const code = error.code;
  if (code === "42501" || code === "PGRST301") return true;
  return false;
}

export function shouldUseDirectTableFallback(
  error: PostgrestError | null,
): boolean {
  return !!error && !shouldSkipDirectTableFallback(error);
}
