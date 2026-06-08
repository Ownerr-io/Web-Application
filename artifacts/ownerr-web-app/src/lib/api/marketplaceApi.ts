import { isSupabaseConfigured } from "@/lib/supabase/client";
import { instrumentedRpc } from "@/lib/api/rpcTelemetry";
import type { ApiResult } from "@/lib/api/errors";

export async function searchListings(input: {
  query?: string;
  limit?: number;
  cursorCreatedAt?: string | null;
  cursorId?: string | null;
}): Promise<ApiResult<Record<string, unknown>[]>> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: { code: "NOT_CONFIGURED", message: "Supabase not configured" },
    };
  }
  const result = await instrumentedRpc<unknown>("marketplace_search_listings", {
    p_query: input.query ?? "",
    p_limit: input.limit ?? 24,
    p_cursor_created_at: input.cursorCreatedAt ?? null,
    p_cursor_id: input.cursorId ?? null,
  });
  if (!result.success) return result;
  const data = result.data;
  const rows = Array.isArray(data)
    ? data
    : typeof data === "string"
      ? JSON.parse(data)
      : [];
  return { success: true, data: (rows ?? []) as Record<string, unknown>[] };
}

export async function searchListingsV2(input: {
  query?: string;
  industry?: string | null;
  country?: string | null;
  lifecycle?: string[] | null;
  limit?: number;
  cursorScore?: number | null;
  cursorId?: string | null;
}): Promise<ApiResult<Record<string, unknown>[]>> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: { code: "NOT_CONFIGURED", message: "Supabase not configured" },
    };
  }
  const result = await instrumentedRpc<unknown>("marketplace_search_v2", {
    p_query: input.query ?? "",
    p_industry: input.industry ?? null,
    p_country: input.country ?? null,
    p_lifecycle: input.lifecycle ?? null,
    p_limit: input.limit ?? 24,
    p_cursor_score: input.cursorScore ?? null,
    p_cursor_id: input.cursorId ?? null,
  });
  if (!result.success) return result;
  const data = result.data;
  const rows = Array.isArray(data)
    ? data
    : typeof data === "string"
      ? JSON.parse(data)
      : [];
  return { success: true, data: (rows ?? []) as Record<string, unknown>[] };
}

export async function refreshMaterializedViews(): Promise<ApiResult<void>> {
  const result = await instrumentedRpc<null>(
    "refresh_marketplace_materialized_views",
    {},
  );
  return result.success ? { success: true, data: undefined } : result;
}

export async function refreshSearchCache(): Promise<ApiResult<void>> {
  const result = await instrumentedRpc<null>(
    "refresh_marketplace_search_cache",
    {},
  );
  return result.success ? { success: true, data: undefined } : result;
}

export { instrumentedRpc as wrapRpc };
