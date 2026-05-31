import { getSupabase } from "@/lib/supabase/client";
import type { FounderAnalytics } from "@/lib/founderTypes";
import type {
  AdminMarketplaceSummary,
  AdminNetworkSummary,
  AdminOperationsSummary,
  AdminOsSummary,
  AdminPlatformIntelligence,
  AdminPlatformSummary,
  AdminSystemHealth,
  FunnelStage,
} from "./summaryTypes";

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseFunnel(raw: unknown): FunnelStage[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      stage: String(r.stage ?? ""),
      count: num(r.count),
      note: r.note != null ? String(r.note) : undefined,
    };
  });
}

function parsePlatformIntel(
  raw: Record<string, unknown>,
): AdminPlatformIntelligence {
  const daily = Array.isArray(raw.dailySignups)
    ? (raw.dailySignups as { day: string; count: number }[])
    : [];
  const weekly = Array.isArray(raw.weeklyGrowth)
    ? (raw.weeklyGrowth as { week: string; count: number }[])
    : [];
  const productAdoption = Array.isArray(raw.productAdoption)
    ? (raw.productAdoption as { product: string; count: number }[])
    : [];
  return {
    totalUsers: num(raw.totalUsers),
    newUsersToday: num(raw.newUsersToday),
    newUsersWeek: num(raw.newUsersWeek),
    newUsersMonth: num(raw.newUsersMonth),
    activeUsers7d: num(raw.activeUsers7d),
    activeUsers30d: num(raw.activeUsers30d),
    growthPercentWeek: num(raw.growthPercentWeek),
    marketplaceUsers: num(raw.marketplaceUsers),
    ownerrOsUsers: num(raw.ownerrOsUsers),
    ownerrNetworkUsers: num(raw.ownerrNetworkUsers),
    multiProductUsers: num(raw.multiProductUsers),
    referralSignups: num(raw.referralSignups),
    organicSignups: num(raw.organicSignups),
    referralConversionPercent: num(raw.referralConversionPercent),
    returningUsers: num(raw.returningUsers),
    profileCompletionRate: num(raw.profileCompletionRate),
    dailySignups: daily,
    weeklyGrowth: weekly,
    productAdoption,
    trackingGaps: Array.isArray(raw.trackingGaps)
      ? (raw.trackingGaps as string[])
      : undefined,
  };
}

export async function fetchAdminPlatformSummary(): Promise<AdminPlatformSummary | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("admin_platform_summary");
  if (error || !data) return null;
  const root = data as Record<string, unknown>;
  const network = parseNetworkSummary(root.network);
  const marketplace = parseMarketplaceSummary(root.marketplace);
  const ownerrOs = parseOsSummary(root.ownerrOs);
  const platform =
    root.platform != null
      ? parsePlatformIntel(root.platform as Record<string, unknown>)
      : undefined;
  return {
    network,
    marketplace,
    ownerrOs,
    platform,
    generatedAt: String(root.generatedAt ?? new Date().toISOString()),
  };
}

function parseNetworkSummary(raw: unknown): AdminNetworkSummary {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    totalUsers: num(r.totalUsers),
    newUsers7d: num(r.newUsers7d),
    newUsers30d: num(r.newUsers30d),
    onboardingCompleted: num(r.onboardingCompleted),
    verifiedUsers: num(r.verifiedUsers),
    platformAdmins: num(r.platformAdmins),
    totalReferrals: num(r.totalReferrals),
    completedReferrals: num(r.completedReferrals),
    walletTransactions: num(r.walletTransactions),
    walletVolume: num(r.walletVolume),
    totalPoints: num(r.totalPoints),
    averageWalletBalance: num(r.averageWalletBalance),
    funnel: parseFunnel(r.funnel),
    topReferrers: Array.isArray(r.topReferrers)
      ? (r.topReferrers as { label: string; count: number }[])
      : [],
    topEarners: Array.isArray(r.topEarners)
      ? (r.topEarners as { label: string; earned: number }[])
      : [],
    mostActiveUsers: Array.isArray(r.mostActiveUsers)
      ? (r.mostActiveUsers as { label: string; score: number }[])
      : [],
    fastestGrowingUsers: Array.isArray(r.fastestGrowingUsers)
      ? (r.fastestGrowingUsers as { label: string; referrals7d: number }[])
      : [],
    referralsByDay: Array.isArray(r.referralsByDay)
      ? (r.referralsByDay as { day: string; count: number }[])
      : [],
    referralsBySource: Array.isArray(r.referralsBySource)
      ? (r.referralsBySource as { source: string; count: number }[])
      : [],
    userHealth: Array.isArray(r.userHealth)
      ? (r.userHealth as { flag: string; count: number; note?: string }[])
      : [],
  };
}

function parseMarketplaceSummary(raw: unknown): AdminMarketplaceSummary {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    totalListings: num(r.totalListings),
    publishedListings: num(r.publishedListings),
    draftListings: num(r.draftListings),
    archivedListings: num(r.archivedListings),
    verifiedListings: num(r.verifiedListings),
    totalSubmissions: num(r.totalSubmissions),
    pendingSubmissions: num(r.pendingSubmissions),
    avgSubmissionScore: num(r.avgSubmissionScore),
    topIndustries: Array.isArray(r.topIndustries)
      ? (r.topIndustries as AdminMarketplaceSummary["topIndustries"])
      : [],
    funnel: parseFunnel(r.funnel),
    dealPipeline: Array.isArray(r.dealPipeline)
      ? (r.dealPipeline as { status: string; count: number }[])
      : [],
    startupPerformance: Array.isArray(r.startupPerformance)
      ? (r.startupPerformance as AdminMarketplaceSummary["startupPerformance"])
      : [],
    industryAnalytics: Array.isArray(r.industryAnalytics)
      ? (r.industryAnalytics as AdminMarketplaceSummary["industryAnalytics"])
      : [],
    topBuyers: Array.isArray(r.topBuyers)
      ? (r.topBuyers as AdminMarketplaceSummary["topBuyers"])
      : [],
    trackingGaps: Array.isArray(r.trackingGaps)
      ? (r.trackingGaps as string[])
      : undefined,
  };
}

function parseOsSummary(raw: unknown): AdminOsSummary {
  const r = (raw ?? {}) as Record<string, unknown>;
  const founder = (r.founderAnalytics ?? {}) as Record<string, unknown>;
  return {
    totalListings: num(r.totalListings),
    publishedListings: num(r.publishedListings),
    draftListings: num(r.draftListings),
    founderAnalytics: founder as FounderAnalytics,
    founderFunnel: parseFunnel(r.founderFunnel),
    trackingGaps: Array.isArray(r.trackingGaps)
      ? (r.trackingGaps as string[])
      : undefined,
  };
}

export async function fetchAdminNetworkSummary(): Promise<AdminNetworkSummary | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("admin_network_summary");
  if (error || !data) return null;
  return parseNetworkSummary(data);
}

export async function fetchAdminMarketplaceSummary(): Promise<AdminMarketplaceSummary | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("admin_marketplace_summary");
  if (error || !data) return null;
  return parseMarketplaceSummary(data);
}

export async function fetchAdminOsSummary(): Promise<AdminOsSummary | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("admin_os_summary");
  if (error || !data) return null;
  return parseOsSummary(data);
}

export async function fetchAdminFounderAnalytics(): Promise<FounderAnalytics | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("admin_founder_analytics");
  if (error || !data) return null;
  return data as FounderAnalytics;
}

export async function fetchAdminOperationsSummary(): Promise<AdminOperationsSummary | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("admin_operations_summary");
  if (error || !data) return null;
  const raw = data as Record<string, unknown>;
  const mod = (raw.moderation ?? {}) as Record<string, unknown>;
  const gov = (raw.governance ?? {}) as Record<string, unknown>;
  return {
    auditLogsAvailable: Boolean(raw.auditLogsAvailable),
    auditLogsNote: String(raw.auditLogsNote ?? ""),
    activityFeed: Array.isArray(raw.activityFeed)
      ? (raw.activityFeed as AdminOperationsSummary["activityFeed"])
      : [],
    moderation: {
      suspendedUsers: num(mod.suspendedUsers),
      flaggedProfiles: num(mod.flaggedProfiles),
      suspendedMarketplaceProfiles: num(mod.suspendedMarketplaceProfiles),
      flaggedListingsNote:
        mod.flaggedListingsNote != null
          ? String(mod.flaggedListingsNote)
          : undefined,
    },
    governance: raw.governance
      ? {
          pendingSubmissions: num(gov.pendingSubmissions),
          draftListings: num(gov.draftListings),
          openBids: num(gov.openBids),
          pendingReferrals: num(gov.pendingReferrals),
          onboardingIncomplete: num(gov.onboardingIncomplete),
          newUsers24h: num(gov.newUsers24h),
          platformAdmins: num(gov.platformAdmins),
        }
      : undefined,
  };
}

export async function fetchAdminSystemHealth(): Promise<AdminSystemHealth | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("admin_system_health");
  if (error || !data) return null;
  const raw = data as Record<string, unknown>;
  const tableCounts = Array.isArray(raw.tableCounts)
    ? (raw.tableCounts as AdminSystemHealth["tableCounts"]).map((t) => ({
        name: String((t as { name: string }).name),
        rows: num((t as { rows: unknown }).rows),
        group:
          (t as { group?: string }).group != null
            ? String((t as { group?: string }).group)
            : undefined,
      }))
    : [];
  return {
    tableCounts,
    productSessionsTotal: num(raw.productSessionsTotal),
    productSessionsActive24h: num(raw.productSessionsActive24h),
    usersTotal: raw.usersTotal != null ? num(raw.usersTotal) : undefined,
    usersDeleted: raw.usersDeleted != null ? num(raw.usersDeleted) : undefined,
    platformAdmins:
      raw.platformAdmins != null ? num(raw.platformAdmins) : undefined,
    storageUsageAvailable: Boolean(raw.storageUsageAvailable),
    authFailuresAvailable: Boolean(raw.authFailuresAvailable),
    apiErrorsAvailable: Boolean(raw.apiErrorsAvailable),
    rpcErrorsAvailable: Boolean(raw.rpcErrorsAvailable),
    notes: Array.isArray(raw.notes) ? (raw.notes as string[]) : undefined,
  };
}
