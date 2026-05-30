import { getSupabase } from "@/lib/supabase/client";
import type {
  OwnerrNetworkUser,
  OwnerrNetworkProfileRow,
  OwnerrNetworkLedgerRow,
  OwnerrNetworkReferralRow,
} from "./types";
import {
  ensureNetworkTablesDetected,
  isUsersTableActive,
  networkTables,
} from "./dbTables";

// ✅ import from your existing referral.ts (no change there)
import {
  getStoredOwnerrNetworkReferral,
  clearOwnerrNetworkReferral,
} from "./referral";

/**
 * Fetch all users
 */
export async function fetchAllUsers(): Promise<OwnerrNetworkUser[]> {
  const supabase = getSupabase();
  await ensureNetworkTablesDetected(supabase);
  const tables = networkTables();

  const { data, error } = await supabase
    .from(tables.users)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`fetchAllUsers: ${error.message}`);
  }

  return (data ?? []) as OwnerrNetworkUser[];
}

/**
 * Fetch all profiles
 */
export async function fetchAllProfiles(): Promise<OwnerrNetworkProfileRow[]> {
  const supabase = getSupabase();
  await ensureNetworkTablesDetected(supabase);
  const tables = networkTables();

  const { data, error } = await supabase
    .from(tables.profiles)
    .select("*")
    .order("onboarding_completed_at", { ascending: false });

  if (error) {
    throw new Error(`fetchAllProfiles: ${error.message}`);
  }

  return (data ?? []) as OwnerrNetworkProfileRow[];
}

/**
 * Fetch all ledger entries
 */
export async function fetchAllLedgerEntries(): Promise<OwnerrNetworkLedgerRow[]> {
  const supabase = getSupabase();
  await ensureNetworkTablesDetected(supabase);

  if (isUsersTableActive()) {
    const { data, error } = await supabase
      .from("wallet_transactions")
      .select(
        `
        id,
        transaction_type,
        amount,
        source_reference,
        metadata,
        created_at,
        wallets!inner(user_id)
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`fetchAllLedgerEntries: ${error.message}`);
    }

    return (data ?? []).map((row) => {
      const wallet = row.wallets as { user_id: string } | { user_id: string }[];
      const userId = Array.isArray(wallet) ? wallet[0]?.user_id : wallet?.user_id;
      return {
        id: row.id,
        user_id: userId ?? "",
        type: row.transaction_type,
        amount: Number(row.amount),
        idempotency_key: row.source_reference ?? row.id,
        metadata: (row.metadata as Record<string, unknown> | null) ?? null,
        created_at: row.created_at,
      };
    });
  }

  const tables = networkTables();
  const { data, error } = await supabase
    .from(tables.pointsLedger)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`fetchAllLedgerEntries: ${error.message}`);
  }

  return (data ?? []) as OwnerrNetworkLedgerRow[];
}

/**
 * Fetch all referrals
 */
export async function fetchAllReferrals(): Promise<OwnerrNetworkReferralRow[]> {
  const supabase = getSupabase();
  await ensureNetworkTablesDetected(supabase);

  if (isUsersTableActive()) {
    const { data, error } = await supabase
      .from("referrals")
      .select("id, referrer_user_id, referred_user_id, status, source, created_at")
      .eq("product_slug", "ownerr_network")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`fetchAllReferrals: ${error.message}`);
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      referrer_id: row.referrer_user_id,
      referee_id: row.referred_user_id,
      status: row.status,
      created_at: row.created_at,
      completed_at: row.status === "completed" ? row.created_at : null,
      source: row.source,
    })) as OwnerrNetworkReferralRow[];
  }

  const tables = networkTables();
  const { data, error } = await supabase
    .from(tables.referrals)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`fetchAllReferrals: ${error.message}`);
  }

  return (data ?? []) as OwnerrNetworkReferralRow[];
}

/**
 * 🔥 NEW: Save referral to DB (based on your referral.ts)
 * 👉 Call this AFTER login/signup
 */
export async function saveReferralForUser(userId: string) {
  const supabase = getSupabase();
  await ensureNetworkTablesDetected(supabase);

  const referral = getStoredOwnerrNetworkReferral();

  if (!referral) return null;

  if (isUsersTableActive()) {
    const { data: existing } = await supabase
      .from("referrals")
      .select("id")
      .eq("referred_user_id", userId)
      .maybeSingle();

    if (existing) {
      clearOwnerrNetworkReferral();
      return null;
    }

    const { data: referrer } = await supabase
      .from("users")
      .select("id")
      .eq("referral_code", referral.referralCode)
      .maybeSingle();

    if (!referrer) return null;

    const { error } = await supabase.from("referrals").insert({
      referred_user_id: userId,
      referrer_user_id: referrer.id,
      product_slug: "ownerr_network",
      source: referral.sourcePlatform || null,
    });

    if (error) {
      throw new Error(`saveReferralForUser: ${error.message}`);
    }

    clearOwnerrNetworkReferral();
    return true;
  }

  const tables = networkTables();
  const { data: existing } = await supabase
    .from(tables.referrals)
    .select("id")
    .eq("referred_user_id", userId)
    .maybeSingle();

  if (existing) {
    clearOwnerrNetworkReferral();
    return null;
  }

  // ✅ insert into DB
  const { error } = await supabase.from(tables.referrals).insert({
    referral_code: referral.referralCode,
    referred_user_id: userId,
    source_platform: referral.sourcePlatform || null,
    created_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`saveReferralForUser: ${error.message}`);
  }

  // ✅ clear after success
  clearOwnerrNetworkReferral();

  return true;
}

export type UpdateNetworkUserInput = {
  name?: string;
  username?: string;
  profile_verified?: boolean;
  points?: number;
};

export async function updateNetworkUser(
  userId: string,
  input: UpdateNetworkUserInput,
): Promise<void> {
  const supabase = getSupabase();
  await ensureNetworkTablesDetected(supabase);

  if (isUsersTableActive()) {
    const payload: Record<string, unknown> = {};
    if (input.name !== undefined) payload.full_name = input.name;
    if (input.username !== undefined) payload.username = input.username;
    if (input.profile_verified !== undefined) {
      payload.verification_status = input.profile_verified
        ? "verified"
        : "unverified";
    }
    const { error } = await supabase
      .from("users")
      .update(payload)
      .eq("id", userId);
    if (error) throw new Error(`updateNetworkUser: ${error.message}`);

    if (input.points !== undefined) {
      const { error: scoreErr } = await supabase
        .from("user_scores")
        .upsert({ user_id: userId, points: input.points, updated_at: new Date().toISOString() });
      if (scoreErr) throw new Error(`updateNetworkUser: ${scoreErr.message}`);
    }
    return;
  }

  const tables = networkTables();
  const payload: Record<string, unknown> = { ...input };
  const { error } = await supabase
    .from(tables.users)
    .update(payload)
    .eq("id", userId);
  if (error) throw new Error(`updateNetworkUser: ${error.message}`);
}

export async function deleteNetworkUser(userId: string): Promise<void> {
  const supabase = getSupabase();
  await ensureNetworkTablesDetected(supabase);

  if (isUsersTableActive()) {
    const { error } = await supabase
      .from("users")
      .update({ status: "suspended", deleted_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw new Error(`deleteNetworkUser: ${error.message}`);
    return;
  }

  const tables = networkTables();
  const { error } = await supabase.from(tables.users).delete().eq("id", userId);
  if (error) throw new Error(`deleteNetworkUser: ${error.message}`);
}

export type UpdateNetworkProfileInput = {
  display_name?: string | null;
  user_type?: string | null;
  experience_level?: string | null;
  work_preference?: string | null;
};

export async function updateNetworkProfile(
  profileId: string,
  input: UpdateNetworkProfileInput,
): Promise<void> {
  const supabase = getSupabase();
  await ensureNetworkTablesDetected(supabase);

  if (isUsersTableActive()) {
    const payload: Record<string, unknown> = {};
    if (input.display_name !== undefined) payload.headline = input.display_name;
    if (input.user_type !== undefined) payload.user_type = input.user_type;
    if (input.experience_level !== undefined) {
      payload.experience_level = input.experience_level;
    }
    if (input.work_preference !== undefined) {
      payload.remote_preference = input.work_preference;
    }
    const { error } = await supabase
      .from("user_profiles")
      .update(payload)
      .eq("user_id", profileId);
    if (error) throw new Error(`updateNetworkProfile: ${error.message}`);
    return;
  }

  const tables = networkTables();
  const { error } = await supabase
    .from(tables.profiles)
    .update(input)
    .eq("id", profileId);
  if (error) throw new Error(`updateNetworkProfile: ${error.message}`);
}

export async function updateReferralStatus(
  referralId: string,
  status: string,
): Promise<void> {
  const supabase = getSupabase();
  await ensureNetworkTablesDetected(supabase);

  if (isUsersTableActive()) {
    const { error } = await supabase
      .from("referrals")
      .update({ status })
      .eq("id", referralId);
    if (error) throw new Error(`updateReferralStatus: ${error.message}`);
    return;
  }

  const tables = networkTables();
  const { error } = await supabase
    .from(tables.referrals)
    .update({ status })
    .eq("id", referralId);
  if (error) throw new Error(`updateReferralStatus: ${error.message}`);
}

export async function deleteReferral(referralId: string): Promise<void> {
  const supabase = getSupabase();
  await ensureNetworkTablesDetected(supabase);

  const table = isUsersTableActive()
    ? "referrals"
    : networkTables().referrals;
  const { error } = await supabase.from(table).delete().eq("id", referralId);
  if (error) throw new Error(`deleteReferral: ${error.message}`);
}