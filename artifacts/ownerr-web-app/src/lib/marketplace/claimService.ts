import type { User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { MarketplaceError, mapSupabaseError } from "@/lib/marketplace/errors";
import type { ClaimSpotEntry, ClaimSpotRole } from "@/lib/marketplace/types";
import { founderAvatarUrl } from "@/lib/utils";
import { SchemaTables as T } from "@/lib/supabase/schemaTables";

const MClaims = T.marketplace.companyClaims;

export const CLAIM_SPOTS_TOTAL = 250;

function requireSupabase() {
  if (!isSupabaseConfigured())
    throw new MarketplaceError("Supabase is not configured", "not_configured");
  return getSupabase();
}

function mapClaim(row: {
  id: string;
  claiming_user_id: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
}): ClaimSpotEntry {
  const meta = row.metadata ?? {};
  const handle = String(meta.handle ?? row.claiming_user_id.slice(0, 8));
  return {
    id: row.id,
    name: String(meta.name ?? "Founder"),
    handle,
    email: String(meta.email ?? ""),
    avatarUrl: String(meta.avatar_url ?? founderAvatarUrl(handle)),
    role: (meta.role as ClaimSpotRole) ?? "founder",
    claimedAt: row.created_at,
    tagline: meta.tagline as string | undefined,
  };
}

export async function getClaimSpotStats(): Promise<{
  total: number;
  claimed: number;
}> {
  if (!isSupabaseConfigured()) {
    return { total: CLAIM_SPOTS_TOTAL, claimed: 0 };
  }
  const { count, error } = await getSupabase()
    .from(MClaims)
    .select("id", { count: "exact", head: true })
    .in("status", ["pending", "approved"]);
  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "PGRST205" || code === "42P01") {
      return { total: CLAIM_SPOTS_TOTAL, claimed: 0 };
    }
    throw mapSupabaseError(error);
  }
  return { total: CLAIM_SPOTS_TOTAL, claimed: count ?? 0 };
}

export async function listPublicClaims(limit = 200): Promise<ClaimSpotEntry[]> {
  const { data, error } = await requireSupabase()
    .from(MClaims)
    .select("id, claiming_user_id, status, metadata, created_at")
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw mapSupabaseError(error);
  return (data ?? []).map(mapClaim);
}

export async function submitSpotClaim(input: {
  user: User;
  name: string;
  handle: string;
  email: string;
  role: ClaimSpotRole;
  tagline?: string;
  startupId?: string | null;
}): Promise<ClaimSpotEntry> {
  const handleNorm = input.handle.trim().replace(/^@+/, "").toLowerCase();
  const { data, error } = await requireSupabase()
    .from(MClaims)
    .insert({
      startup_id: input.startupId ?? null,
      claiming_user_id: input.user.id,
      status: "pending",
      metadata: {
        name: input.name.trim(),
        handle: handleNorm,
        email: input.email.trim(),
        role: input.role,
        tagline: input.tagline?.trim() || undefined,
        avatar_url: founderAvatarUrl(handleNorm),
      },
    })
    .select("id, claiming_user_id, status, metadata, created_at")
    .single();
  if (error) throw mapSupabaseError(error);
  return mapClaim(data);
}

export function findClaimByHandle(
  handle: string,
  rows: readonly ClaimSpotEntry[],
): ClaimSpotEntry | undefined {
  const key = handle.trim().replace(/^@+/, "").toLowerCase();
  if (!key) return undefined;
  return rows.find((e) => e.handle.toLowerCase() === key);
}
