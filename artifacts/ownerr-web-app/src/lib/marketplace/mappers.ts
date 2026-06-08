import { computeStartupScores } from "@/lib/startupScores";
import type { Category, Startup, StartupRow } from "@/lib/marketplace/types";

export type ListingGateRow = {
  startup_id: string;
  identity_status?: string;
  domain_status?: string;
  business_email_status?: string;
  revenue_status?: string;
  registration_status?: string;
  verified_revenue_amount?: number | null;
  revenue_source_provider?: string | null;
  revenue_currency?: string | null;
  verified_mrr?: number | null;
  verified_arr?: number | null;
  verified_domain?: string | null;
  fraud_risk?: string;
};

function readMeta<T>(
  meta: Record<string, unknown>,
  key: string,
  fallback: T,
): T {
  const v = meta[key];
  return (v as T) ?? fallback;
}

/** Accept bare domains or full URLs; never use slug.example placeholders. */
export function normalizeWebsiteUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    if (!u.hostname || u.hostname.endsWith(".example")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function companyWebsiteFromRow(
  meta: Record<string, unknown>,
  gates?: ListingGateRow,
): string | null {
  const verified = gates?.verified_domain?.trim();
  if (verified) return normalizeWebsiteUrl(verified);

  for (const key of [
    "website",
    "website_url",
    "company_website",
    "declared_domain",
  ]) {
    const raw = meta[key];
    if (typeof raw === "string" && raw.trim()) {
      return normalizeWebsiteUrl(raw.trim());
    }
  }
  return null;
}

export function mapStartupRow(
  row: StartupRow,
  gates?: ListingGateRow,
): Startup {
  const meta = row.metadata ?? {};
  const verifiedAmount =
    gates?.revenue_status === "verified" &&
    gates.verified_revenue_amount != null &&
    gates.verified_revenue_amount > 0
      ? Math.round(gates.verified_revenue_amount)
      : gates?.revenue_status === "verified" &&
          gates.verified_mrr != null &&
          gates.verified_mrr > 0
        ? Math.round(gates.verified_mrr)
        : 0;
  const mrr =
    verifiedAmount > 0
      ? verifiedAmount
      : typeof row.annual_revenue === "number" && row.annual_revenue > 0
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
    founderUserId: row.founder_user_id,
    founderDisplayName: readMeta<string | undefined>(
      meta,
      "founder_display_name",
      undefined,
    ),
    description: row.description,
    monthlyRevenueSeries: readMeta(meta, "monthly_revenue_series", []),
    logoColor: readMeta(meta, "logo_color", "#E6EAFF"),
    foundedYear: row.founded_year ?? 2020,
    listingCreatedAt: row.created_at ?? null,
    listingUpdatedAt: row.updated_at ?? null,
    metadata: meta,
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
    revenueVerified:
      gates?.revenue_status === "verified" &&
      ((gates.verified_revenue_amount ?? 0) > 0 ||
        (gates.verified_mrr ?? 0) > 0),
    revenueProvider:
      gates?.revenue_source_provider != null
        ? gates.revenue_source_provider
        : readMeta(meta, "revenue_provider", null),
    domainVerified: gates?.domain_status === "verified",
    companyWebsiteUrl: companyWebsiteFromRow(meta, gates),
    trafficVerified: false,
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
