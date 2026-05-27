import type { Startup, MarketplaceListing, TimeSeriesPoint, TrustLabel } from '@/lib/marketplace/types';
function hash(seed: string): number {
  let value = 0;
  for (let i = 0; i < seed.length; i++) {
    value = (value * 33 + seed.charCodeAt(i)) >>> 0;
  }
  return value;
}

function startOfMonthOffset(offset: number): Date {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  date.setMonth(date.getMonth() + offset);
  return date;
}

function monthLabel(date: Date): string {
  return date.toLocaleString("en-US", { month: "short" });
}

function roundSeries(series: number[], target: number): number[] {
  const rounded = series.map((value) => Math.max(0, Math.round(value)));
  const drift = Math.round(target) - rounded.reduce((sum, value) => sum + value, 0);
  rounded[rounded.length - 1] = Math.max(0, rounded[rounded.length - 1] + drift);
  return rounded;
}

function buildHistorySeries(seed: string, currentValue: number, months: number, variance: number): TimeSeriesPoint[] {
  const values: number[] = [];
  let pointer = hash(seed) || 17;
  const next = () => {
    pointer = (pointer * 1103515245 + 12345) >>> 0;
    return pointer / 4294967296;
  };

  let totalWeight = 0;
  const weights: number[] = [];
  for (let index = 0; index < months; index++) {
    const seasonal = 0.84 + Math.sin(index / 2.8) * variance;
    const noise = 0.9 + next() * variance;
    const weight = Math.max(0.3, seasonal * noise);
    weights.push(weight);
    totalWeight += weight;
  }

  for (let index = 0; index < months; index++) {
    const base = (weights[index] / totalWeight) * currentValue * months;
    values.push(base);
  }

  const normalized = roundSeries(values, currentValue * months);
  return normalized.map((value, index) => {
    const date = startOfMonthOffset(index - (months - 1));
    return {
      label: monthLabel(date),
      timestamp: date.toISOString(),
      value,
    };
  });
}

function inferNicheTags(startup: Startup): string[] {
  const base: string[] = [startup.category];
  const description = startup.description.toLowerCase();
  if (description.includes("ai")) base.push("AI");
  if (description.includes("seo")) base.push("SEO");
  if (description.includes("chat")) base.push("Chat");
  if (description.includes("video")) base.push("Video");
  if (description.includes("analytics")) base.push("Analytics");
  if (startup.forSale) base.push("Acquisition");
  return Array.from(new Set(base));
}

function buildKeywords(startup: Startup, nicheTags: string[]): string[] {
  return Array.from(
    new Set(
      [startup.name, startup.slug, startup.category, startup.description, ...nicheTags]
        .join(" ")
        .toLowerCase()
        .split(/[^a-z0-9]+/g)
        .filter(Boolean),
    ),
  );
}

export function calculateGrowthPct(revenueHistory: TimeSeriesPoint[]): number {
  if (revenueHistory.length < 2) return 0;
  const last = revenueHistory[revenueHistory.length - 1]?.value ?? 0;
  const prev = revenueHistory[revenueHistory.length - 2]?.value ?? 0;
  if (prev <= 0) return last > 0 ? 100 : 0;
  return Math.round(((last - prev) / prev) * 100);
}

function buildVerification(startup: Startup): MarketplaceListing["verification"] {
  const now = new Date().toISOString();
  return {
    revenue: {
      status: startup.revenueVerified ? "verified" : "unverified",
      provider: startup.revenueProvider,
      updatedAt: startup.revenueVerified ? now : null,
      requestedAt: startup.revenueVerified ? now : null,
      note: startup.revenueVerified
        ? `Revenue connected via ${startup.revenueProvider ?? "provider"}`
        : "No revenue provider connected yet",
      sourceLabel: startup.revenueProvider ?? "Manual revenue data",
    },
    domain: {
      status: startup.domainVerified ? "verified" : "unverified",
      provider: "DNS TXT",
      updatedAt: startup.domainVerified ? now : null,
      requestedAt: startup.domainVerified ? now : null,
      note: startup.domainVerified ? "DNS ownership confirmed" : "DNS check not started",
      mode: "dns_txt",
      sourceLabel: "TXT record",
      expectedValue: `ownerr-verification=${startup.slug}-${Math.abs(hash(startup.slug)).toString(36)}`,
    },
    traffic: {
      status: startup.trafficVerified ? "verified" : "unverified",
      provider: startup.trafficVerified ? "Google Analytics" : null,
      updatedAt: startup.trafficVerified ? now : null,
      requestedAt: startup.trafficVerified ? now : null,
      note: startup.trafficVerified ? "Analytics property connected" : "Analytics not connected",
      mode: startup.trafficVerified ? "google_analytics" : "manual",
      sourceLabel: startup.trafficVerified ? "Google Analytics connected (mock)" : "Manual upload",
    },
  };
}

export function computeTrustScore(listing: Pick<MarketplaceListing, "revenueVerified" | "domainVerified" | "trafficVerified">): number {
  const score =
    (listing.revenueVerified ? 40 : 0) +
    (listing.domainVerified ? 30 : 0) +
    (listing.trafficVerified ? 30 : 0);
  return Math.max(0, Math.min(100, score));
}

export function trustLabelFromScore(score: number): TrustLabel {
  if (score >= 70) return "High Trust";
  if (score >= 40) return "Medium Trust";
  return "Low Trust";
}

function normalizeRevenueVerification(
  revenueHistory: TimeSeriesPoint[],
  revenue: number,
  verification: MarketplaceListing["verification"]["revenue"],
): MarketplaceListing["verification"]["revenue"] {
  const historyIsSufficient = revenueHistory.filter((point) => point.value > 0).length >= 3;
  const hasMrr = revenue > 0;
  if (!historyIsSufficient || !hasMrr) {
    return {
      ...verification,
      status: "unverified",
      note: "Requires at least 3 months of revenue history and non-zero MRR.",
    };
  }
  return verification;
}

export function buildMarketplaceListingFromStartup(
  startup: Startup,
  overrides?: Partial<MarketplaceListing>,
): MarketplaceListing {
  const revenueHistory =
    overrides?.revenueHistory ??
    buildHistorySeries(`${startup.slug}:revenue`, Math.max(1, Math.round(startup.revenue)), 12, 0.18);
  const growthPct = overrides?.growthPct ?? calculateGrowthPct(revenueHistory);
  const trafficBase =
    startup.trafficMonthlyVisitors ?? Math.max(400, Math.round(startup.customers * 2.2) || startup.revenue * 2);
  const trafficHistory =
    overrides?.trafficHistory ??
    buildHistorySeries(`${startup.slug}:traffic`, Math.max(1, Math.round(trafficBase)), 12, 0.22);
  const nicheTags = overrides?.nicheTags ?? inferNicheTags(startup);
  const createdAt =
    overrides?.createdAt ??
    new Date(startup.foundedYear, Math.min(hash(startup.slug) % 12, 11), 1).toISOString();
  const updatedAt = overrides?.updatedAt ?? new Date().toISOString();
  const verificationBase = overrides?.verification ?? buildVerification(startup);
  const verification = {
    ...verificationBase,
    revenue: normalizeRevenueVerification(revenueHistory, startup.revenue, verificationBase.revenue),
  };

  const enriched: MarketplaceListing = {
    ...startup,
    ownerUserId: overrides?.ownerUserId ?? startup.founderHandle,
    createdAt,
    updatedAt,
    nicheTags,
    keywords: overrides?.keywords ?? buildKeywords(startup, nicheTags),
    revenueHistory,
    trafficHistory,
    growthPct,
    trustScore: 0,
    trustLabel: "Low Trust",
    trafficMonthlyVisitors: trafficHistory.at(-1)?.value ?? startup.trafficMonthlyVisitors ?? null,
    trafficTrend:
      trafficHistory.length >= 2
        ? trafficHistory.at(-1)!.value > trafficHistory.at(-2)!.value
          ? "up"
          : trafficHistory.at(-1)!.value < trafficHistory.at(-2)!.value
            ? "down"
            : "flat"
        : startup.trafficTrend,
    revenueGrowth30dPct: growthPct,
    verification,
  };

  enriched.revenueVerified = verification.revenue.status === "verified";
  enriched.revenueProvider =
    verification.revenue.status === "verified"
      ? (verification.revenue.provider as Startup["revenueProvider"])
      : null;
  enriched.domainVerified = verification.domain.status === "verified";
  enriched.trafficVerified = verification.traffic.status === "verified";
  enriched.trustScore = computeTrustScore(enriched);
  enriched.trustLabel = trustLabelFromScore(enriched.trustScore);
  return enriched;
}
export function bestDealScore(listing: Pick<MarketplaceListing, "revenue" | "growthPct" | "multiple" | "trustScore">): number {
  const normalizedRevenue = Math.min(listing.revenue / 1000, 200);
  const normalizedGrowth = Math.max(-20, Math.min(100, listing.growthPct + 20));
  const multiplePenalty = Math.max(0, 20 - (listing.multiple ?? 0) * 4);
  return normalizedRevenue * 0.35 + normalizedGrowth * 0.25 + multiplePenalty * 0.15 + listing.trustScore * 0.25;
}
