import { getSupabase } from "@/lib/supabase/client";
import type {
  DiscoverProfile,
  LeaderboardEntry,
  OwnerrNetworkBadge,
  OwnerrNetworkLedgerRow,
  OwnerrNetworkProfileRow,
  OwnerrNetworkReferralRow,
  OwnerrNetworkUser,
} from "./types";
import type { McqAnswers } from "./mcqQuestions";
import { collectDeviceInfo } from "./analytics";
import { computeNetworkScore, withNetworkScore } from "./score";
import {
  ensureNetworkTablesDetected,
  isUsersTableActive,
  networkTables,
} from "./dbTables";

export function normalizeOwnerrNetworkUserRow(
  data: unknown,
): OwnerrNetworkUser | null {
  if (data == null) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const id = (row as OwnerrNetworkUser).id;
  if (typeof id !== "string" || id.length === 0) return null;

  const res = { ...row } as any;
  if (res.verification_status !== undefined) {
    res.profile_verified = res.verification_status === "verified";
  } else if (res.profile_verified !== undefined) {
    res.profile_verified = Boolean(res.profile_verified);
  }
  return res as OwnerrNetworkUser;
}

export async function provisionOwnerrNetworkUser(
  name: string,
  referralCode: string | null,
  signupSource?: string,
): Promise<OwnerrNetworkUser> {
  const supabase = getSupabase();
  await ensureNetworkTablesDetected(supabase);
  let { data, error } = await supabase.rpc("ownerr_network_provision_user", {
    p_name: name,
    p_referral_code_input: referralCode,
    p_signup_source: signupSource ?? null,
    p_device_info: collectDeviceInfo(),
  });
  if (error && isMissingRpcOrTable(error)) {
    ({ data, error } = await supabase.rpc("unemployed_provision_user", {
      p_name: name,
      p_referral_code_input: referralCode,
      p_signup_source: signupSource ?? null,
      p_device_info: collectDeviceInfo(),
    }));
  }
  if (error) {
    if (error.code === "23505") {
      const existing = await fetchCurrentOwnerrNetworkUser();
      if (existing) return existing;
    }
    throw error;
  }
  const row = normalizeOwnerrNetworkUserRow(data);
  if (!row)
    throw new Error("ownerr_network_provision_user returned no user row");
  return row;
}

function isMissingRpcOrTable(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  const status = (err as { status?: number })?.status;
  return code === "PGRST202" || code === "PGRST205" || status === 404;
}

/** Fallback when PostgREST has not picked up RPC yet (PGRST202). */
async function fetchCurrentOwnerrNetworkUserFromTable(): Promise<OwnerrNetworkUser | null> {
  const supabase = getSupabase();
  await ensureNetworkTablesDetected(supabase);
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData.user?.id;
  if (!uid) return null;

  const { data, error } = await supabase
    .from(networkTables().users)
    .select("*")
    .eq("auth_user_id", uid)
    .maybeSingle();
  if (error && isMissingRpcOrTable(error)) return null;
  if (error) throw error;
  return normalizeOwnerrNetworkUserRow(data);
}

export async function fetchCurrentOwnerrNetworkUser(): Promise<OwnerrNetworkUser | null> {
  const supabase = getSupabase();
  await ensureNetworkTablesDetected(supabase);
  let { data, error } = await supabase.rpc("ownerr_network_current_user_row");
  if (error && isMissingRpcOrTable(error)) {
    ({ data, error } = await supabase.rpc("unemployed_current_user_row"));
  }
  if (!error && data) {
    const normalized = normalizeOwnerrNetworkUserRow(data);
    if (
      normalized &&
      (normalized.points === undefined ||
        normalized.wallet_balance === undefined)
    ) {
      return fetchCurrentOwnerrNetworkUserFromTable();
    }
    return normalized;
  }
  if (isMissingRpcOrTable(error)) {
    return fetchCurrentOwnerrNetworkUserFromTable();
  }
  throw error;
}

export async function completeOnboarding(
  name: string,
  username: string,
  answers: McqAnswers,
): Promise<OwnerrNetworkUser> {
  const supabase = getSupabase();
  await ensureNetworkTablesDetected(supabase);
  const payload = {
    ...answers,
    name,
    username,
    skills: answers.skills ? [answers.skills] : [],
  };
  let { data, error } = await supabase.rpc(
    "ownerr_network_complete_onboarding",
    {
      p_name: name,
      p_username: username,
      p_answers: payload,
    },
  );
  if (error && isMissingRpcOrTable(error)) {
    ({ data, error } = await supabase.rpc("unemployed_complete_mcq", {
      p_answers: payload,
    }));
  }
  if (error) throw error;
  return normalizeOwnerrNetworkUserRow(data) as OwnerrNetworkUser;
}

export async function claimDailyActivity(): Promise<boolean> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc(
    "ownerr_network_claim_daily_activity",
  );
  if (error) throw error;
  return Boolean(data);
}

export async function verifyProfileBonus(): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.rpc("ownerr_network_verify_profile_bonus");
  if (error) throw error;
}

export async function fetchLedger(
  userId: string,
  limit = 30,
): Promise<OwnerrNetworkLedgerRow[]> {
  const supabase = getSupabase();
  await ensureNetworkTablesDetected(supabase);
  const isNew = isUsersTableActive();

  if (isNew) {
    const { data, error } = await supabase
      .from("wallets")
      .select(
        `
        id,
        wallet_transactions (
          id,
          transaction_type,
          amount,
          source_reference,
          metadata,
          created_at
        )
      `,
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return [];

    const txs = (data.wallet_transactions || []) as any[];
    txs.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    return txs.slice(0, limit).map((t) => ({
      id: t.id,
      user_id: userId,
      type: t.transaction_type,
      amount: Number(t.amount),
      idempotency_key: t.source_reference || t.id,
      metadata: t.metadata || null,
      created_at: t.created_at,
    })) as OwnerrNetworkLedgerRow[];
  } else {
    const { data, error } = await supabase
      .from(networkTables().pointsLedger)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as OwnerrNetworkLedgerRow[];
  }
}

export async function fetchReferrals(
  referrerId: string,
): Promise<OwnerrNetworkReferralRow[]> {
  const supabase = getSupabase();
  await ensureNetworkTablesDetected(supabase);
  const isNew = isUsersTableActive();

  if (isNew) {
    const { data, error } = await supabase
      .from("referrals")
      .select("id, referrer_user_id, referred_user_id, status, created_at")
      .eq("referrer_user_id", referrerId)
      .eq("product_slug", "ownerr_network")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      referrer_id: r.referrer_user_id,
      referee_id: r.referred_user_id,
      status: r.status,
      created_at: r.created_at,
      completed_at: r.created_at,
    })) as OwnerrNetworkReferralRow[];
  } else {
    const { data, error } = await supabase
      .from(networkTables().referrals)
      .select("*")
      .eq("referrer_id", referrerId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as OwnerrNetworkReferralRow[];
  }
}

async function profileMetaByAuthIds(
  authIds: string[],
): Promise<Map<string, OwnerrNetworkProfileRow>> {
  if (authIds.length === 0) return new Map();
  const supabase = getSupabase();
  await ensureNetworkTablesDetected(supabase);
  const { data, error } = await supabase
    .from(networkTables().profiles)
    .select(
      "auth_user_id, profile_completion_pct, onboarding_completed_at, user_type, skill_tags",
    )
    .in("auth_user_id", authIds);
  if (error) throw error;
  const map = new Map<string, OwnerrNetworkProfileRow>();
  for (const row of data ?? []) {
    map.set(row.auth_user_id as string, row as OwnerrNetworkProfileRow);
  }
  return map;
}

export async function fetchLeaderboard(
  limit = 20,
): Promise<LeaderboardEntry[]> {
  const supabase = getSupabase();
  await ensureNetworkTablesDetected(supabase);
  const { data: users, error } = await supabase
    .from(networkTables().users)
    .select(
      "id, auth_user_id, username, name, profile_image, points, total_referrals, profile_verified",
    )
    .limit(100);
  if (error) throw error;
  const list = (users ?? []) as (LeaderboardEntry & {
    auth_user_id: string;
    profile_verified: boolean;
  })[];
  const profiles = await profileMetaByAuthIds(list.map((u) => u.auth_user_id));
  const scored = list.map((u) => {
    const p = profiles.get(u.auth_user_id);
    const pct =
      p?.profile_completion_pct ?? (p?.onboarding_completed_at ? 100 : 0);
    return withNetworkScore(u, pct, u.profile_verified);
  });
  scored.sort((a, b) => (b.network_score ?? 0) - (a.network_score ?? 0));
  return scored.slice(0, limit);
}

export async function fetchWeeklyLeaderboard(
  limit = 20,
): Promise<LeaderboardEntry[]> {
  const supabase = getSupabase();
  await ensureNetworkTablesDetected(supabase);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: ledger, error: ledgerErr } = await supabase
    .from(networkTables().pointsLedger)
    .select("user_id, amount")
    .gte("created_at", weekAgo);
  if (ledgerErr) throw ledgerErr;

  const totals = new Map<string, number>();
  for (const row of ledger ?? []) {
    totals.set(
      row.user_id,
      (totals.get(row.user_id) ?? 0) + Number(row.amount),
    );
  }
  const sortedIds = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
  if (sortedIds.length === 0) return [];

  const { data: users, error } = await supabase
    .from(networkTables().users)
    .select(
      "id, auth_user_id, username, name, profile_image, points, total_referrals, profile_verified",
    )
    .in("id", sortedIds);
  if (error) throw error;
  const byId = new Map(
    (users ?? []).map((u) => [
      u.id,
      u as LeaderboardEntry & {
        auth_user_id: string;
        profile_verified: boolean;
      },
    ]),
  );
  const authIds = [...byId.values()].map((u) => u.auth_user_id);
  const profiles = await profileMetaByAuthIds(authIds);
  return sortedIds
    .map((id) => {
      const u = byId.get(id);
      if (!u) return null;
      const p = profiles.get(u.auth_user_id);
      const pct = p?.profile_completion_pct ?? 0;
      return withNetworkScore(u, pct, u.profile_verified);
    })
    .filter(Boolean) as LeaderboardEntry[];
}

export async function fetchUserBadges(
  userId: string,
): Promise<OwnerrNetworkBadge[]> {
  const supabase = getSupabase();
  await ensureNetworkTablesDetected(supabase);
  const tbl = networkTables();
  const isNew = isUsersTableActive();

  if (isNew) {
    const { data, error } = await supabase
      .from("user_badges")
      .select("badge_slug")
      .eq("user_id", userId);
    if (error) throw error;

    const badgeDetails: Record<string, { name: string; description: string }> =
      {
        builder: {
          name: "Builder",
          description: "Completed onboarding survey",
        },
        recruiter: {
          name: "Recruiter",
          description: "5+ successful referrals",
        },
        connector: {
          name: "Connector",
          description: "10+ successful referrals",
        },
        hustler: { name: "Hustler", description: "Daily activity streak" },
      };

    return (data ?? []).map((row) => {
      const slug = row.badge_slug;
      return {
        id: slug,
        code: slug,
        name: badgeDetails[slug]?.name ?? slug,
        description: badgeDetails[slug]?.description ?? "",
      };
    }) as OwnerrNetworkBadge[];
  } else {
    const badgeFk = `${tbl.badges}(id, code, name, description)`;
    const { data, error } = await supabase
      .from(tbl.userBadges)
      .select(`badge_id, ${badgeFk}`)
      .eq("user_id", userId);
    if (error) throw error;
    return (data ?? [])
      .map((row) => {
        const nested = row as unknown as Record<
          string,
          OwnerrNetworkBadge | OwnerrNetworkBadge[] | null
        >;
        const b = nested[tbl.badges] as
          | OwnerrNetworkBadge
          | OwnerrNetworkBadge[]
          | null;
        if (Array.isArray(b)) return b[0];
        return b;
      })
      .filter(Boolean) as OwnerrNetworkBadge[];
  }
}

export async function fetchOwnerrNetworkProfile(
  authUserId: string,
): Promise<OwnerrNetworkProfileRow | null> {
  const supabase = getSupabase();
  await ensureNetworkTablesDetected(supabase);
  const { data, error } = await supabase
    .from(networkTables().profiles)
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const isNew = isUsersTableActive();
  if (isNew) {
    const raw = data as Record<string, any>;
    const metadata = raw.metadata as Record<string, any> | undefined;
    const answers = metadata?.onboarding_answers;
    return {
      id: raw.id,
      auth_user_id: raw.auth_user_id,
      display_name: raw.display_name,
      username: raw.username,
      user_type: raw.user_type,
      skill_tags: raw.skill_tags ?? [],
      work_preference: raw.work_preference,
      goals: (answers?.goals as string | null) ?? null,
      experience_level: raw.experience_level,
      availability: (answers?.availability as string | null) ?? null,
      seriousness_score: null,
      onboarding_completed_at: raw.onboarding_completed_at,
      profile_completion_pct: raw.profile_completion_pct ?? 0,
    };
  }
  return data as OwnerrNetworkProfileRow;
}

export async function fetchPublicProfileByUsername(
  username: string,
): Promise<LeaderboardEntry | null> {
  const supabase = getSupabase();
  await ensureNetworkTablesDetected(supabase);
  const { data: user, error } = await supabase
    .from(networkTables().users)
    .select(
      "id, auth_user_id, username, name, profile_image, points, total_referrals, profile_verified",
    )
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  if (!user) return null;
  const networkProfile = await fetchOwnerrNetworkProfile(
    user.auth_user_id as string,
  );
  const pct = networkProfile?.profile_completion_pct ?? 0;
  const scored = withNetworkScore(
    user as LeaderboardEntry,
    pct,
    user.profile_verified as boolean,
  );
  return {
    ...scored,
    user_type: networkProfile?.user_type ?? null,
    skill_tags: networkProfile?.skill_tags ?? [],
    goals: networkProfile?.goals ?? null,
    work_preference: networkProfile?.work_preference ?? null,
    experience_level: networkProfile?.experience_level ?? null,
    availability: networkProfile?.availability ?? null,
    profile_completion_pct: pct,
  };
}

export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const supabase = getSupabase();
  await ensureNetworkTablesDetected(supabase);
  const { data, error } = await supabase
    .from(networkTables().onboardingSessions)
    .select("completed_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error && isMissingRpcOrTable(error)) return false;
  if (error) throw error;
  return Boolean(data?.completed_at);
}

export async function fetchDiscoverProfiles(filters: {
  userType?: string;
  skill?: string;
  workPreference?: string;
  verifiedOnly?: boolean;
  availability?: string;
}): Promise<DiscoverProfile[]> {
  const supabase = getSupabase();
  await ensureNetworkTablesDetected(supabase);
  const tbl = networkTables();
  const isNew = isUsersTableActive();
  console.log("[Discover] fetchDiscoverProfiles isNew:", isNew, "tbl:", tbl);

  let query: any;

  if (isNew) {
    query = supabase
      .from(tbl.profiles)
      .select(
        "auth_user_id, display_name, username, user_type, skill_tags, work_preference, experience_level, profile_completion_pct, onboarding_completed_at, metadata",
      )
      .not("onboarding_completed_at", "is", null);
  } else {
    query = supabase
      .from(tbl.profiles)
      .select(
        "auth_user_id, display_name, username, user_type, skill_tags, work_preference, goals, experience_level, availability, profile_completion_pct, onboarding_completed_at",
      )
      .not("onboarding_completed_at", "is", null);
  }

  if (filters.userType) query = query.eq("user_type", filters.userType);
  if (filters.workPreference)
    query = query.eq("work_preference", filters.workPreference);

  if (filters.availability) {
    if (isNew) {
      query = query.eq(
        "metadata->onboarding_answers->>availability",
        filters.availability,
      );
    } else {
      query = query.eq("availability", filters.availability);
    }
  }

  const { data: profiles, error } = await query.limit(60);
  if (error) throw error;

  const authIds = ((profiles ?? []) as any[]).map(
    (p) => p.auth_user_id as string,
  );
  if (authIds.length === 0) return [];

  let userQuery = supabase
    .from(tbl.users)
    .select(
      "id, auth_user_id, name, username, profile_image, points, total_referrals, profile_verified",
    )
    .in("auth_user_id", authIds);

  if (filters.verifiedOnly) userQuery = userQuery.eq("profile_verified", true);

  const { data: users, error: userErr } = await userQuery;
  if (userErr) throw userErr;

  const userByAuth = new Map(
    (users ?? []).map((u) => [u.auth_user_id as string, u]),
  );

  const rows: DiscoverProfile[] = [];
  for (const p of (profiles ?? []) as any[]) {
    const u = userByAuth.get(p.auth_user_id as string);
    if (!u) continue;
    if (filters.skill) {
      const tags = (p.skill_tags as string[]) ?? [];
      if (
        !tags.some((t) =>
          t.toLowerCase().includes(filters.skill!.toLowerCase()),
        )
      )
        continue;
    }
    const pct = (p.profile_completion_pct as number) ?? 0;

    const raw = p as Record<string, any>;
    const metadata = raw.metadata as Record<string, any> | undefined;
    const answers = metadata?.onboarding_answers;

    const goalsVal = isNew
      ? ((answers?.goals as string | null) ?? null)
      : ((p as any).goals as string | null);

    const availabilityVal = isNew
      ? ((answers?.availability as string | null) ?? null)
      : ((p as any).availability as string | null);

    rows.push({
      user_id: u.id as string,
      auth_user_id: u.auth_user_id as string,
      name: (p.display_name as string) || (u.name as string),
      username: (p.username as string) || (u.username as string),
      profile_image: u.profile_image as string | null,
      user_type: p.user_type as string | null,
      skill_tags: (p.skill_tags as string[]) ?? [],
      work_preference: p.work_preference as string | null,
      goals: goalsVal,
      experience_level: p.experience_level as string | null,
      availability: availabilityVal,
      points: Number(u.points),
      total_referrals: Number(u.total_referrals),
      profile_verified: Boolean(u.profile_verified),
      profile_completion_pct: pct,
      network_score: computeNetworkScore({
        points: Number(u.points),
        total_referrals: Number(u.total_referrals),
        profile_completion_pct: pct,
        profile_verified: Boolean(u.profile_verified),
      }),
    });
  }
  rows.sort((a, b) => b.network_score - a.network_score);
  return rows;
}
