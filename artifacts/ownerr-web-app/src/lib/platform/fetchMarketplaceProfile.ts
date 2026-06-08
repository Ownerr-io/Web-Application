import type { AuthRole } from "@/lib/auth/types";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  ensureMarketplaceTablesDetected,
  getMarketplaceTables,
} from "@/lib/marketplace/dbTables";

export type MarketplaceProfileRow = {
  id: string;
  auth_user_id: string;
  desk_role: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

function pickProfileForRole(
  rows: MarketplaceProfileRow[],
  preferredRole: AuthRole | null,
): MarketplaceProfileRow | null {
  if (rows.length === 0) return null;
  if (preferredRole === "buyer") {
    return rows.find((r) => r.desk_role === "buyer") ?? rows[0]!;
  }
  if (preferredRole === "founder") {
    return (
      rows.find((r) => r.desk_role === "seller" || r.desk_role === "founder") ??
      rows[0]!
    );
  }
  return rows[0]!;
}

export async function fetchMarketplaceProfileForUser(
  authUserId: string,
  preferredRole: AuthRole | null = null,
): Promise<MarketplaceProfileRow | null> {
  if (!isSupabaseConfigured()) return null;
  await ensureMarketplaceTablesDetected();
  const { data, error } = await getSupabase()
    .from(getMarketplaceTables().accounts)
    .select("id, auth_user_id, desk_role, metadata, created_at, updated_at")
    .eq("auth_user_id", authUserId);
  if (error) throw error;
  const rows = (data ?? []) as MarketplaceProfileRow[];
  return pickProfileForRole(rows, preferredRole);
}
