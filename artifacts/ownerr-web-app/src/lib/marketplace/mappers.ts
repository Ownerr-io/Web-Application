import { computeStartupScores } from "@/lib/startupScores";
import type { Category, Startup, StartupRow } from "@/lib/marketplace/types";

function readMeta<T>(
  meta: Record<string, unknown>,
  key: string,
  fallback: T,
): T {
  const v = meta[key];
  return (v as T) ?? fallback;
}

export function mapStartupRow(row: StartupRow): Startup {
  const meta = row.metadata ?? {};
  const mrr =
    typeof row.annual_revenue === "number" && row.annual_revenue > 0
      ? Math.round(row.annual_revenue / 12)
      : 0;
  const asking =
    row.asking_price != null ? Number(row.asking_price) : undefined;
  const base: Startup = {
    slug: row.slug,
    name: row.title,
    category: (row.industry ?? "SaaS") as Category,
    revenue: mrr,
    peakMrr: readMeta<number | undefined>(meta, "peak_mrr", mrr),
    price: asking,
    multiple:
      asking && mrr > 0
        ? Math.round((asking / (mrr * 12)) * 10) / 10
        : undefined,
    forSale: row.status === "published" && asking != null,
    founderHandle: row.founder_handle ?? "unknown",
    founderDisplayName: readMeta<string | undefined>(
      meta,
      "founder_display_name",
      undefined,
    ),
    description: row.description,
    monthlyRevenueSeries: readMeta(meta, "monthly_revenue_series", []),
    logoColor: readMeta(meta, "logo_color", "#E6EAFF"),
    foundedYear: row.founded_year ?? 2020,
    ttmProfit: row.profit != null ? Number(row.profit) : undefined,
    customers: row.team_size ?? readMeta(meta, "customers", 0),
    momGrowth: row.growth_rate != null ? Number(row.growth_rate) : 0,
    listingViews: readMeta(meta, "listing_views", 0),
    listingFavorites: readMeta(meta, "listing_favorites", 0),
    revenueGrowth30dPct: readMeta(meta, "revenue_growth_30d_pct", null),
    askingPriceStrike: readMeta(meta, "asking_price_strike", undefined),
    businessScore: readMeta(meta, "business_score", 0),
    lendScore: readMeta(meta, "lend_score", 0),
    acquisitionPower: readMeta(meta, "acquisition_power", 0),
    revenueVerified: readMeta(meta, "revenue_verified", row.verified),
    revenueProvider: readMeta(meta, "revenue_provider", null),
    domainVerified: readMeta(meta, "domain_verified", false),
    trafficVerified: readMeta(meta, "traffic_verified", false),
    trafficMonthlyVisitors: readMeta(meta, "traffic_monthly_visitors", null),
    trafficTrend: readMeta(meta, "traffic_trend", null),
  };
  const scored = { ...base, ...computeStartupScores(base) };
  return {
    ...scored,
    businessScore: readMeta(meta, "business_score", scored.businessScore),
    lendScore: readMeta(meta, "lend_score", scored.lendScore),
    acquisitionPower: readMeta(
      meta,
      "acquisition_power",
      scored.acquisitionPower,
    ),
  };
}
