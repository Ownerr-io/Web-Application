import { getSupabase } from "@/lib/supabase/client";
import {
  newRequestId,
  routeFromRpc,
  structuredLog,
  type StructuredLogFields,
} from "@/lib/observability/structuredLog";
import type { PostgrestError } from "@supabase/supabase-js";
import { mapPostgrestToApiError, type ApiResult } from "@/lib/api/errors";

export type InstrumentedRpcOptions = {
  requestId?: string;
  route?: string;
  userId?: string | null;
  logToServer?: boolean;
};

export async function instrumentedRpc<T>(
  rpcName: string,
  params: Record<string, unknown>,
  options: InstrumentedRpcOptions = {},
): Promise<ApiResult<T>> {
  const requestId = options.requestId ?? newRequestId();
  const route = options.route ?? routeFromRpc(rpcName);
  const started = performance.now();
  const supabase = getSupabase();

  const { data, error } = await supabase.rpc(
    rpcName,
    params as Record<string, unknown>,
  );

  const durationMs = Math.round(performance.now() - started);
  const mapped = error ? mapPostgrestToApiError(error) : null;

  const logBase: StructuredLogFields = {
    timestamp: new Date().toISOString(),
    request_id: requestId,
    user_id: options.userId ?? null,
    route,
    rpc_name: rpcName,
    duration_ms: durationMs,
    status: error ? "error" : "ok",
    error_code: mapped && !mapped.success ? mapped.error.code : null,
  };
  structuredLog(logBase);

  if (import.meta.env.DEV && options.logToServer !== false) {
    void supabase
      .rpc("api_log_client_request", {
        p_request_id: requestId,
        p_rpc_name: rpcName,
        p_route: route,
        p_duration_ms: durationMs,
        p_status: error ? "error" : "ok",
        p_error_code: mapped && !mapped.success ? mapped.error.code : null,
        p_metadata: {},
      })
      .then(({ error: logErr }: { error: PostgrestError | null }) => {
        if (logErr && import.meta.env.DEV) {
          structuredLog({
            ...logBase,
            status: "error",
            error_code: "LOG_FAILED",
            log_detail: logErr.message,
          });
        }
      });
  }

  if (error) return mapPostgrestToApiError(error);
  if (data === null || data === undefined) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: "Empty response" },
    };
  }
  return { success: true, data: data as T };
}

export { newRequestId };
