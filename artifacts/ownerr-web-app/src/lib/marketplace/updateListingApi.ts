import type { MarketplaceListing } from "@/lib/marketplace/types";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { buildMarketplaceListingFromStartup } from "@/lib/marketplace/listingModel";

export async function updateMarketplaceListing(
  listing: MarketplaceListing,
): Promise<MarketplaceListing> {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured");

  const enriched = buildMarketplaceListingFromStartup(listing, {
    ...listing,
    updatedAt: new Date().toISOString(),
  });

  const metadata = {
    monthly_revenue_series: enriched.monthlyRevenueSeries,
    logo_color: enriched.logoColor,
    business_score: enriched.businessScore,
    lend_score: enriched.lendScore,
    acquisition_power: enriched.acquisitionPower,
    traffic_monthly_visitors: enriched.trafficMonthlyVisitors,
    traffic_trend: enriched.trafficTrend,
    peak_mrr: enriched.peakMrr ?? enriched.revenue,
    founder_display_name: enriched.founderDisplayName ?? null,
    listing_username: enriched.listingUsername ?? null,
  };

  const { error } = await getSupabase().rpc("founder_update_startup", {
    p_slug: enriched.slug,
    p_title: enriched.name,
    p_description: enriched.description,
    p_industry: enriched.category,
    p_founded_year: enriched.foundedYear,
    p_asking_price: enriched.forSale ? (enriched.price ?? null) : null,
    p_annual_revenue: enriched.revenue > 0 ? enriched.revenue * 12 : null,
    p_profit: enriched.ttmProfit ?? null,
    p_growth_rate: enriched.momGrowth,
    p_team_size: enriched.customers,
    p_metadata: metadata,
  });

  if (error) throw error;
  return enriched;
}
