import { getSupabase } from "@/lib/supabase/client";

export type TrustPublic = {
  score: number;
  level: string;
  computed_at: string | null;
  breakdown: Record<string, unknown>;
};

export async function fetchStartupTrustPublic(
  slug: string,
): Promise<TrustPublic | null> {
  const { data, error } = await getSupabase().rpc("startup_trust_public", {
    p_startup_slug: slug,
  });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object") return null;
  const row = data as {
    score?: number;
    level?: string;
    computed_at?: string;
    breakdown?: Record<string, unknown>;
  };
  if (row.score == null) return null;
  return {
    score: Number(row.score),
    level: String(row.level ?? "unverified"),
    computed_at: row.computed_at ?? null,
    breakdown: row.breakdown ?? {},
  };
}

export async function recomputeStartupTrust(startupId: string): Promise<void> {
  const { error } = await getSupabase().rpc("recompute_startup_trust", {
    p_startup_id: startupId,
  });
  if (error) throw new Error(error.message);
}

export function trustLabelFromLevel(level: string): string {
  switch (level) {
    case "elite":
      return "Elite Trust";
    case "trusted":
      return "High Trust";
    case "verified":
      return "Verified";
    case "basic":
      return "Basic Trust";
    default:
      return "Unverified";
  }
}
