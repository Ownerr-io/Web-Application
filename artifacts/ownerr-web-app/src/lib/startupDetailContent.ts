import type { Founder, Startup } from "@/lib/mockData";

export interface StartupDetailDailyPoint {
  label: string;
  prevLabel: string;
  current: number;
  prev: number;
  charges: number;
}

export interface StartupDetailRich {
  foundedLabel: string;
  allTimeRevenue: number | null;
  leaderboardRank: number | null;
  mrrDisplay: number;
  activeSubscriptions: number | null;
  buyersViewed: number | null;
  offersReceived: number | null;
  chartPeriodTotal: number | null;
  chartVsPrevPct: number | null;
  chartMetricLabel: string;
  verifiedProvider: "paddle" | "stripe" | null;
  lastUpdated: string | null;
  visitUrl: string | null;
  dailyChart: StartupDetailDailyPoint[];
  trafficMonthlyVisitors: number | null;
  trafficTrend: "up" | "down" | "flat" | null;
  trafficVerified: boolean;
  domainVerified: boolean;
  revenueVerified: boolean;
  revenueProvider: string | null;
  insights: {
    valueProposition: string;
    problemSolved: string | null;
    pricing: string | null;
    targetAudience: string | null;
    businessPills: string[];
    userCountLabel: string | null;
    additionalInfo: string | null;
    tags: string[];
  };
  techStack: {
    frontend: string[];
    backend: string[];
  };
  founderQuote: string | null;
}

function readMetaString(startup: Startup, key: string): string | null {
  const meta = (startup as Startup & { metadata?: Record<string, unknown> })
    .metadata;
  if (!meta) return null;
  const v = meta[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function readMetaStringArray(startup: Startup, key: string): string[] {
  const meta = (startup as Startup & { metadata?: Record<string, unknown> })
    .metadata;
  if (!meta) return [];
  const v = meta[key];
  if (!Array.isArray(v)) return [];
  return v.filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0,
  );
}

function buildDefaultDetail(
  startup: Startup,
  founder: Founder | undefined,
  leaderboardRank: number,
): StartupDetailRich {
  const mrrDisplay = startup.revenue > 0 ? startup.revenue : 0;

  const ttm =
    startup.ttmProfit != null && startup.ttmProfit > 0
      ? Math.round(startup.ttmProfit)
      : null;

  const foundedLabel = startup.foundedYear ? String(startup.foundedYear) : "—";

  const verifiedProvider: "paddle" | "stripe" | null =
    startup.revenueProvider === "Stripe"
      ? "stripe"
      : startup.revenueProvider === "RevenueCat"
        ? "paddle"
        : null;

  const tags = readMetaStringArray(startup, "niche_tags");
  const displayTags =
    tags.length > 0 ? tags : startup.category ? [startup.category] : [];

  const teamSize = startup.customers > 0 ? startup.customers : null;

  return {
    foundedLabel,
    allTimeRevenue: ttm,
    leaderboardRank:
      leaderboardRank > 0 && leaderboardRank < 900 ? leaderboardRank : null,
    mrrDisplay,
    activeSubscriptions: readMetaNumber(startup, "active_subscriptions"),
    buyersViewed:
      startup.listingViews != null && startup.listingViews > 0
        ? startup.listingViews
        : null,
    offersReceived:
      startup.listingFavorites != null && startup.listingFavorites > 0
        ? startup.listingFavorites
        : null,
    chartPeriodTotal: null,
    chartVsPrevPct: startup.revenueGrowth30dPct ?? null,
    chartMetricLabel: "Revenue",
    verifiedProvider,
    lastUpdated: startup.listingUpdatedAt ?? null,
    visitUrl: startup.companyWebsiteUrl ?? null,
    dailyChart: [],
    trafficMonthlyVisitors: startup.trafficMonthlyVisitors,
    trafficTrend: startup.trafficTrend,
    trafficVerified: startup.trafficVerified ?? false,
    domainVerified: startup.domainVerified ?? false,
    revenueVerified: startup.revenueVerified ?? false,
    revenueProvider: startup.revenueProvider,
    insights: {
      valueProposition: startup.description?.trim() || startup.name,
      problemSolved: readMetaString(startup, "problem_solved"),
      pricing: readMetaString(startup, "pricing"),
      targetAudience: readMetaString(startup, "target_audience"),
      businessPills: readMetaStringArray(startup, "business_pills"),
      userCountLabel:
        teamSize != null
          ? `${teamSize.toLocaleString("en-US")} team size`
          : null,
      additionalInfo: readMetaString(startup, "additional_info"),
      tags: displayTags,
    },
    techStack: {
      frontend: readMetaStringArray(startup, "tech_stack_frontend"),
      backend: readMetaStringArray(startup, "tech_stack_backend"),
    },
    founderQuote:
      founder?.bio?.trim() || readMetaString(startup, "founder_quote"),
  };
}

function readMetaNumber(startup: Startup, key: string): number | null {
  const meta = (startup as Startup & { metadata?: Record<string, unknown> })
    .metadata;
  if (!meta) return null;
  const v = meta[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return null;
}

export function getStartupDetailModel(
  startup: Startup,
  founder: Founder | undefined,
  leaderboardRank: number,
): StartupDetailRich {
  return buildDefaultDetail(startup, founder, leaderboardRank);
}
