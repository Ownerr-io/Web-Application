import type { LeaderboardEntry } from "./types";

/** Simple weighted reputation for leaderboard (client-side). */
export function computeNetworkScore(input: {
  points: number;
  total_referrals: number;
  profile_completion_pct?: number;
  profile_verified?: boolean;
}): number {
  const completion = input.profile_completion_pct ?? 0;
  const verification = input.profile_verified ? 15 : 0;
  return (
    Math.round(input.points) +
    Math.round(input.total_referrals) * 3 +
    Math.round(completion / 10) +
    verification
  );
}

export function withNetworkScore<T extends LeaderboardEntry>(
  row: T,
  profile_completion_pct = 0,
  profile_verified = false,
): T & { network_score: number } {
  return {
    ...row,
    profile_completion_pct,
    profile_verified,
    network_score: computeNetworkScore({
      points: row.points,
      total_referrals: row.total_referrals,
      profile_completion_pct,
      profile_verified,
    }),
  };
}
