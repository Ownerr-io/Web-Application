import { founderAvatarUrl } from "./utils";

export type ClaimSpotRole = "founder" | "investor";

export interface ClaimSpotEntry {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  role: ClaimSpotRole;
  claimedAt: string;
  tagline?: string;
}

export const CLAIM_SPOTS_TOTAL = 250;
export const CLAIM_SPOTS_CLAIMED = 147;

const FIRST = [
  "Maya",
  "Jordan",
  "Alex",
  "Sam",
  "Riley",
  "Casey",
  "Quinn",
  "Avery",
  "Rowan",
  "Skyler",
  "Emerson",
  "Reese",
  "Dakota",
  "River",
  "Phoenix",
  "Sage",
  "Blair",
  "Harper",
  "Logan",
  "Morgan",
];

const LAST = [
  "Chen",
  "Blake",
  "Rivera",
  "Patel",
  "Nguyen",
  "Okonkwo",
  "Silva",
  "Kim",
  "Martinez",
  "Foster",
  "Hayes",
  "Brooks",
  "Singh",
  "Cohen",
  "Park",
  "Dubois",
  "Tanaka",
  "Khan",
  "Andersen",
  "Lopez",
  "Costa",
  "Nakamura",
  "Okafor",
  "Volkov",
  "Berg",
];

/** Fixed anchor so roster dates stay stable across reloads. */
const CLAIM_ROSTER_ANCHOR_MS = Date.UTC(2026, 3, 22, 12, 0, 0);

/** Deterministic roster of everyone who has claimed a spot (147). */
export function generateBaseClaimRoster(count: number = CLAIM_SPOTS_CLAIMED): ClaimSpotEntry[] {
  const out: ClaimSpotEntry[] = [];
  for (let i = 0; i < count; i++) {
    const a = i % FIRST.length;
    const b = Math.floor(i / FIRST.length) % LAST.length;
    const name = `${FIRST[a]} ${LAST[b]}`;
    const handle = `roster-${String(i + 1).padStart(3, "0")}`;
    const role: ClaimSpotRole = i % 3 === 0 ? "investor" : "founder";
    const claimedAt = new Date(CLAIM_ROSTER_ANCHOR_MS - (i + 1) * 8 * 60 * 60 * 1000).toISOString();
    out.push({
      id: `base-${i + 1}`,
      name,
      handle,
      avatarUrl: founderAvatarUrl(handle),
      role,
      claimedAt,
      tagline:
        role === "founder"
          ? "Building in public"
          : "Backing early-stage teams",
    });
  }
  return out;
}

/** Cached base roster for the claim page table. */
export const claimSpotsBaseRoster = generateBaseClaimRoster();

function normalizeClaimHandle(h: string): string {
  return h.trim().replace(/^@+/, "").toLowerCase();
}

/**
 * Resolve a “Who claimed a spot” row by handle. IndexedDB submissions win over the seeded roster.
 */
export function findClaimSpotEntryByHandle(
  handle: string,
  idbRows: readonly ClaimSpotEntry[],
): ClaimSpotEntry | undefined {
  const key = normalizeClaimHandle(handle);
  if (!key) return undefined;
  const fromIdb = idbRows.find((e) => normalizeClaimHandle(e.handle) === key);
  if (fromIdb) return fromIdb;
  return claimSpotsBaseRoster.find((e) => normalizeClaimHandle(e.handle) === key);
}
