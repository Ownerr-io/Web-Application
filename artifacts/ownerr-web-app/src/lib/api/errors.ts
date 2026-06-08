import type { PostgrestError } from "@supabase/supabase-js";

export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "OFFER_NOT_FOUND"
  | "GATE_BLOCKED"
  | "PROVIDER_ERROR"
  | "NOT_CONFIGURED"
  | "INTERNAL_ERROR";

export type ApiResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: {
        code: ApiErrorCode;
        message: string;
        retryAfterSeconds?: number;
      };
    };

export function mapPostgrestToApiError(
  err: PostgrestError | Error | unknown,
): ApiResult<never> {
  const e = err as PostgrestError & {
    message?: string;
    code?: string;
    details?: string;
  };
  const msg = e?.message ?? "Request failed";
  const code = e?.code;
  const details = e?.details ?? "";

  if (code === "PGRST116" || msg.includes("NOT_FOUND")) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: "Resource not found" },
    };
  }
  if (code === "42501" || msg.includes("FORBIDDEN") || code === "28000") {
    return {
      success: false,
      error: {
        code:
          msg.includes("28000") || msg.includes("UNAUTHENTICATED")
            ? "UNAUTHENTICATED"
            : "FORBIDDEN",
        message: msg.includes("FORBIDDEN") ? "Access denied" : msg,
      },
    };
  }
  if (msg.includes("RATE_LIMITED") || details.includes("retry_after_seconds")) {
    let retryAfterSeconds: number | undefined;
    try {
      const parsed = JSON.parse(details) as { retry_after_seconds?: number };
      retryAfterSeconds = parsed.retry_after_seconds;
    } catch {
      retryAfterSeconds = 3600;
    }
    return {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Rate limit exceeded",
        retryAfterSeconds,
      },
    };
  }
  if (msg.includes("VALIDATION") || code === "22023") {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: msg },
    };
  }
  if (code === "PGRST202") {
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "API not available" },
    };
  }
  return { success: false, error: { code: "INTERNAL_ERROR", message: msg } };
}

export async function wrapRpc<T>(
  fn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
): Promise<ApiResult<T>> {
  const { data, error } = await fn();
  if (error) return mapPostgrestToApiError(error);
  if (data === null || data === undefined) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: "Empty response" },
    };
  }
  return { success: true, data };
}

export function unwrap<T>(result: ApiResult<T>): T {
  if (!result.success) {
    throw new Error(result.error.message);
  }
  return result.data;
}
