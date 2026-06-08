import type {
  Startup,
  MarketplaceListing,
  TimeSeriesPoint,
  TrustLabel,
} from "@/lib/marketplace/types";

function revenueHistoryFromStartup(startup: Startup): TimeSeriesPoint[] {
  const series = startup.monthlyRevenueSeries ?? [];
  if (series.length > 0) {
    return series.map((p) => ({
      label: p.month,
      timestamp: p.month,
      value: Math.max(0, Math.round(p.value)),
    }));
  }
  return [];
}

function trafficHistoryFromStartup(startup: Startup): TimeSeriesPoint[] {
  const meta = startup.metadata ?? {};
  const raw = meta.traffic_history;
  if (!Array.isArray(raw)) return [];
  const out: TimeSeriesPoint[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as { label?: string; timestamp?: string; value?: number };
    if (typeof row.value !== "number") continue;
    out.push({
      label: row.label ?? row.timestamp ?? "",
      timestamp: row.timestamp ?? row.label ?? "",
      value: Math.max(0, Math.round(row.value)),
    });
  }
  return out;
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
      [
        startup.name,
        startup.slug,
        startup.category,
        startup.description,
        ...nicheTags,
      ]
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

function dimensionStatus(
  dimensions: { dimension: string; status: string }[] | undefined,
  dimension: string,
): "verified" | "unverified" | "pending" | "failed" {
  const row = dimensions?.find((d) => d.dimension === dimension);
  if (!row) return "unverified";
  if (row.status === "pass") return "verified";
  if (row.status === "pending" || row.status === "partial") return "pending";
  if (row.status === "fail") return "failed";
  return "unverified";
}

export function buildVerificationFromServer(input: {
  slug: string;
  dimensions?: {
    dimension: string;
    status: string;
    computed_at?: string;
    summary?: Record<string, unknown>;
  }[];
  connections?: { provider: string; status: string }[];
}): MarketplaceListing["verification"] {
  const dims = input.dimensions ?? [];
  const revPass = dimensionStatus(dims, "revenue") === "verified";
  const domainPass = dimensionStatus(dims, "domain") === "verified";
  const trafficPass = dimensionStatus(dims, "traffic") === "verified";
  const revConn = input.connections?.find((c) =>
    [
      "stripe",
      "paddle",
      "lemonsqueezy",
      "revenuecat",
      "razorpay",
      "shopify",
    ].includes(c.provider),
  );
  return {
    revenue: {
      status: revPass ? "verified" : "unverified",
      provider: revConn?.provider ?? null,
      updatedAt:
        dims.find((d) => d.dimension === "revenue")?.computed_at ?? null,
      requestedAt: null,
      note: revPass
        ? "Revenue verified from provider sync"
        : "Connect a revenue provider to verify",
      sourceLabel: revConn?.provider ?? "Provider integration",
    },
    domain: {
      status: domainPass ? "verified" : "unverified",
      provider: "DNS",
      updatedAt:
        dims.find((d) => d.dimension === "domain")?.computed_at ?? null,
      requestedAt: null,
      note: domainPass ? "DNS ownership confirmed" : "Add TXT or CNAME record",
      mode: "dns_txt",
      sourceLabel: "TXT / CNAME",
      expectedValue: `ownerr-verification=${input.slug}`,
    },
    traffic: {
      status: trafficPass ? "verified" : "unverified",
      provider: trafficPass ? "Analytics" : null,
      updatedAt:
        dims.find((d) => d.dimension === "traffic")?.computed_at ?? null,
      requestedAt: null,
      note: trafficPass
        ? "Traffic verified from analytics provider"
        : "Connect GA4 or traffic provider",
      mode: "google_analytics",
      sourceLabel: "Analytics integration",
    },
  };
}

function buildVerification(
  startup: Startup,
): MarketplaceListing["verification"] {
  return buildVerificationFromServer({ slug: startup.slug, dimensions: [] });
}

/** @deprecated Trust score is server-authoritative; pass overrides.trustScore from RPC. */
export function computeTrustScore(
  listing: Pick<
    MarketplaceListing,
    "revenueVerified" | "domainVerified" | "trafficVerified" | "trustScore"
  >,
): number {
  if (typeof listing.trustScore === "number" && listing.trustScore > 0) {
    return listing.trustScore;
  }
  return 0;
}

export function trustLabelFromScore(score: number): TrustLabel {
  if (score >= 65) return "High Trust";
  if (score >= 40) return "Medium Trust";
  return "Low Trust";
}

function normalizeRevenueVerification(
  revenueHistory: TimeSeriesPoint[],
  revenue: number,
  verification: MarketplaceListing["verification"]["revenue"],
): MarketplaceListing["verification"]["revenue"] {
  // Server verification (provider sync) wins — do not downgrade with local heuristics.
  if (verification.status === "verified") {
    return verification;
  }
  const historyIsSufficient =
    revenueHistory.filter((point) => point.value > 0).length >= 3;
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
    overrides?.revenueHistory ?? revenueHistoryFromStartup(startup);
  const growthPct =
    overrides?.growthPct ??
    (revenueHistory.length >= 2
      ? calculateGrowthPct(revenueHistory)
      : (startup.momGrowth ?? 0));
  const trafficHistory =
    overrides?.trafficHistory ?? trafficHistoryFromStartup(startup);
  const nicheTags = overrides?.nicheTags ?? inferNicheTags(startup);
  const createdAt =
    overrides?.createdAt ??
    startup.listingCreatedAt ??
    new Date().toISOString();
  const updatedAt =
    overrides?.updatedAt ?? startup.listingUpdatedAt ?? createdAt;
  const verificationBase =
    overrides?.verification ?? buildVerification(startup);
  const verification = {
    ...verificationBase,
    revenue: normalizeRevenueVerification(
      revenueHistory,
      startup.revenue,
      verificationBase.revenue,
    ),
  };

  const enriched: MarketplaceListing = {
    ...startup,
    ownerUserId:
      overrides?.ownerUserId ?? startup.founderUserId ?? startup.founderHandle,
    createdAt,
    updatedAt,
    nicheTags,
    keywords: overrides?.keywords ?? buildKeywords(startup, nicheTags),
    revenueHistory,
    trafficHistory,
    growthPct,
    trustScore: 0,
    trustLabel: "Low Trust",
    trafficMonthlyVisitors:
      startup.trafficMonthlyVisitors ??
      (trafficHistory.length > 0
        ? (trafficHistory.at(-1)?.value ?? null)
        : null),
    trafficTrend:
      startup.trafficTrend ??
      (trafficHistory.length >= 2
        ? trafficHistory.at(-1)!.value > trafficHistory.at(-2)!.value
          ? "up"
          : trafficHistory.at(-1)!.value < trafficHistory.at(-2)!.value
            ? "down"
            : "flat"
        : null),
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
  enriched.trustScore = overrides?.trustScore ?? 0;
  enriched.trustLabel =
    overrides?.trustLabel ?? trustLabelFromScore(enriched.trustScore);
  return enriched;
}
export function bestDealScore(
  listing: Pick<
    MarketplaceListing,
    "revenue" | "growthPct" | "multiple" | "trustScore"
  >,
): number {
  const normalizedRevenue = Math.min(listing.revenue / 1000, 200);
  const normalizedGrowth = Math.max(-20, Math.min(100, listing.growthPct + 20));
  const multiplePenalty = Math.max(0, 20 - (listing.multiple ?? 0) * 4);
  return (
    normalizedRevenue * 0.35 +
    normalizedGrowth * 0.25 +
    multiplePenalty * 0.15 +
    listing.trustScore * 0.25
  );
}
