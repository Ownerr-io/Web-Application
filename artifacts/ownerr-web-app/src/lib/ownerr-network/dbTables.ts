import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { devLog, devWarn } from "@/lib/observability/devLog";

export type NetworkTableSet = {
  users: string;
  profiles: string;
  referrals: string;
  pointsLedger: string;
  onboardingSessions: string;
  userBadges: string;
  badges: string;
  analyticsEvents: string;
};

const NEW: NetworkTableSet = {
  users: "ownerr_network_users",
  profiles: "ownerr_network_profiles",
  referrals: "ownerr_network_referrals",
  pointsLedger: "ownerr_network_points_ledger",
  onboardingSessions: "ownerr_network_onboarding_sessions",
  userBadges: "ownerr_network_user_badges",
  badges: "ownerr_network_badges",
  analyticsEvents: "ownerr_network_analytics_events",
};

const LEGACY: NetworkTableSet = {
  users: "unemployed_users",
  profiles: "unemployed_profiles",
  referrals: "unemployed_referrals",
  pointsLedger: "unemployed_points_ledger",
  onboardingSessions: "unemployed_mcq_sessions",
  userBadges: "unemployed_user_badges",
  badges: "unemployed_badges",
  analyticsEvents: "unemployed_analytics_events",
};

let tables: NetworkTableSet = NEW;
let detectPromise: Promise<NetworkTableSet> | null = null;
let usersTableActive = false;

function isMissingResource(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  const status = (err as { status?: number })?.status;
  return code === "PGRST202" || code === "PGRST205" || status === 404;
}

/** Check if the central/canonical users table is active in the database. */
export function isUsersTableActive(): boolean {
  return usersTableActive;
}

/** Pick new or legacy table names based on what PostgREST exposes. */
export async function detectNetworkTables(
  supabase: SupabaseClient = getSupabase(),
): Promise<NetworkTableSet> {
  // Detect if public.users exists (final schema)
  try {
    const { error: usersProbeErr } = await supabase
      .from("users")
      .select("id")
      .limit(1);
    if (usersProbeErr) {
      const code = usersProbeErr.code;
      const status = (usersProbeErr as { status?: number }).status;
      const msg = usersProbeErr.message || "";
      if (
        code === "42P01" ||
        code === "PGRST205" ||
        code === "PGRST204" ||
        status === 404 ||
        msg.includes("does not exist")
      ) {
        usersTableActive = false;
        devLog(
          "[Schema Detection] Canonical 'users' table NOT active (legacy/intermediate schema detected).",
        );
      } else {
        // Any other database error (like unauthorized or empty results) means the table exists but probe had an RLS/auth constraint
        usersTableActive = true;
        devLog(
          "[Schema Detection] Canonical 'users' table is active (probe returned non-404 error code:",
          code,
          ").",
        );
      }
    } else {
      usersTableActive = true;
      devLog(
        "[Schema Detection] Canonical 'users' table is active (probe succeeded).",
      );
    }
  } catch (err) {
    usersTableActive = false;
    devWarn("[Schema Detection] Failed to probe canonical 'users' table:", err);
  }

  const { error } = await supabase.from(NEW.users).select("id").limit(1);
  if (!error || !isMissingResource(error)) {
    tables = NEW;
    devLog("[Schema Detection] Network table set: NEW (ownerr_network_*)");
    return NEW;
  }
  const legacyProbe = await supabase.from(LEGACY.users).select("id").limit(1);
  if (!legacyProbe.error || !isMissingResource(legacyProbe.error)) {
    tables = LEGACY;
    devLog("[Schema Detection] Network table set: LEGACY (unemployed_*)");
    return LEGACY;
  }
  tables = NEW;
  devLog(
    "[Schema Detection] Fallback network table set: NEW (ownerr_network_*)",
  );
  return NEW;
}

export function ensureNetworkTablesDetected(
  supabase?: SupabaseClient,
): Promise<NetworkTableSet> {
  if (!detectPromise)
    detectPromise = detectNetworkTables(supabase ?? getSupabase());
  return detectPromise;
}

export function networkTables(): NetworkTableSet {
  return tables;
}
