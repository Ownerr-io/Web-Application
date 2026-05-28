import type { AuthRole } from "@/lib/auth/types";
import type { User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  fetchPublicStartups,
  fetchStartupBySlug,
} from "@/lib/marketplace/catalog";
import { buildMarketplaceListingFromStartup } from "@/lib/marketplace/listingModel";
import {
  ensureMarketplaceProfile,
  fetchMarketplaceProfilesForUser,
  getSellerProfileId,
} from "@/lib/marketplace/profiles";
import { listBidsForBuyer } from "@/lib/marketplace/bidService";
import {
  expressInterest,
  listBuyerInterests,
  listInterestsForStartupSlug,
  listSellerInterestsForOwner,
  updateInterestStage,
} from "@/lib/marketplace/interestService";
import { listInboxForUser } from "@/lib/marketplace/messageService";
import type {
  DealRelationshipStage,
  MarketplaceInterestRecord,
  MarketplaceListing,
  VerificationStatus,
} from "@/lib/marketplace/types";

export {
  buildMarketplaceListingFromStartup,
  calculateGrowthPct,
  computeTrustScore,
  trustLabelFromScore,
  bestDealScore,
} from "@/lib/marketplace/listingModel";
export type {
  DealRelationshipStage,
  MarketplaceInterestRecord,
  MarketplaceListing,
  MarketplaceThreadMessage,
  TimeSeriesPoint,
  TrustLabel,
  VerificationSnapshot,
  VerificationStatus,
  MarketplaceBid,
  BidStatus,
  InboxThread,
} from "@/lib/marketplace/types";

export async function fetchMarketplaceListings(): Promise<
  MarketplaceListing[]
> {
  const startups = await fetchPublicStartups();
  return startups.map((s) => buildMarketplaceListingFromStartup(s));
}

export async function fetchMarketplaceListingBySlug(
  slug: string,
): Promise<MarketplaceListing | null> {
  const startup = await fetchStartupBySlug(slug);
  if (!startup) return null;
  return buildMarketplaceListingFromStartup(startup);
}

export async function upsertMarketplaceListing(
  listing: MarketplaceListing,
): Promise<MarketplaceListing> {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured");
  const enriched = buildMarketplaceListingFromStartup(listing, {
    ...listing,
    updatedAt: new Date().toISOString(),
  });
  const { error } = await getSupabase()
    .from("startups")
    .update({
      title: enriched.name,
      description: enriched.description,
      industry: enriched.category,
      asking_price: enriched.price ?? null,
      annual_revenue: enriched.revenue * 12,
      profit: enriched.ttmProfit ?? null,
      growth_rate: enriched.momGrowth,
      team_size: enriched.customers,
      founded_year: enriched.foundedYear,
      verified: enriched.revenueVerified,
      metadata: {
        monthly_revenue_series: enriched.monthlyRevenueSeries,
        logo_color: enriched.logoColor,
        business_score: enriched.businessScore,
        lend_score: enriched.lendScore,
        acquisition_power: enriched.acquisitionPower,
        revenue_verified: enriched.revenueVerified,
        revenue_provider: enriched.revenueProvider,
        domain_verified: enriched.domainVerified,
        traffic_verified: enriched.trafficVerified,
        traffic_monthly_visitors: enriched.trafficMonthlyVisitors,
        traffic_trend: enriched.trafficTrend,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("slug", enriched.slug);
  if (error) throw error;
  return enriched;
}

export async function submitMarketplaceInterest(record: {
  listingId: string;
  buyerUserId: string;
  buyerName: string;
  buyerRole: AuthRole;
  email: string;
  message: string;
  offerAmount: number | null;
}): Promise<MarketplaceInterestRecord> {
  const { data: user } = await getSupabase().auth.getUser();
  const authUser = user.user;
  if (!authUser || authUser.id !== record.buyerUserId) {
    throw new Error("Authenticated buyer required");
  }
  return expressInterest({
    user: authUser,
    listingSlug: record.listingId,
    message: record.message,
    offerAmount: record.offerAmount,
  });
}

export async function getUserInterests(
  userId: string,
): Promise<MarketplaceInterestRecord[]> {
  return listBuyerInterests(userId);
}

export async function getUserBids(userId: string) {
  return listBidsForBuyer(userId);
}

async function startupSlugsForSellerAuthUser(
  authUserId: string,
): Promise<Set<string>> {
  const slugs = new Set<string>();
  if (!isSupabaseConfigured()) return slugs;
  const supabase = getSupabase();
  const sellerProfileId = await getSellerProfileId(authUserId);
  if (sellerProfileId) {
    const { data: links, error: linkErr } = await supabase
      .from("seller_listings")
      .select("startups(slug)")
      .eq("seller_profile_id", sellerProfileId);
    if (linkErr) throw linkErr;
    for (const row of links ?? []) {
      const st = row.startups as { slug?: string } | { slug?: string }[] | null;
      const slug = Array.isArray(st) ? st[0]?.slug : st?.slug;
      if (slug) slugs.add(slug);
    }
  }
  const { data: founderRows, error: founderErr } = await supabase
    .from("startups")
    .select("slug")
    .eq("founder_user_id", authUserId);
  if (founderErr) throw founderErr;
  for (const row of founderRows ?? []) {
    if (row.slug) slugs.add(row.slug as string);
  }
  return slugs;
}

export async function getUserListings(
  authUserId: string,
): Promise<MarketplaceListing[]> {
  if (!isSupabaseConfigured()) return [];
  const slugs = await startupSlugsForSellerAuthUser(authUserId);
  if (!slugs.size) return [];
  const all = await fetchMarketplaceListings();
  return all.filter((l) => slugs.has(l.slug));
}

export async function getAllThreadsForOwner(
  ownerId: string,
): Promise<MarketplaceInterestRecord[]> {
  const interests = await listSellerInterestsForOwner(ownerId);
  if (interests.length) return interests;
  const inbox = await listInboxForUser(ownerId);
  return inbox.map((t) => ({
    id: t.conversationId,
    listingId: t.startupSlug,
    buyerUserId: "",
    buyerName: t.buyerName,
    buyerRole: "buyer" as const,
    email: "",
    offerAmount: null,
    createdAt: t.updatedAt,
    updatedAt: t.updatedAt,
    stage: "interested" as DealRelationshipStage,
    messages: t.lastMessage
      ? [
          {
            id: t.conversationId,
            senderUserId: "",
            senderName: t.buyerName,
            senderRole: "buyer",
            body: t.lastMessage,
            createdAt: t.updatedAt,
          },
        ]
      : [],
  }));
}

export async function fetchMarketplaceInterests(
  listingId: string,
): Promise<MarketplaceInterestRecord[]> {
  return listInterestsForStartupSlug(listingId);
}

export { appendMarketplaceThreadMessage } from "@/lib/marketplace/messageService";

export async function updateMarketplaceInterestStage(
  record: MarketplaceInterestRecord,
  stage: DealRelationshipStage,
): Promise<MarketplaceInterestRecord> {
  await updateInterestStage(record.id, stage);
  return { ...record, stage, updatedAt: new Date().toISOString() };
}

export async function updateMarketplaceVerification(
  listing: MarketplaceListing,
  kind: keyof MarketplaceListing["verification"],
  nextStatus: VerificationStatus,
  provider?: string | null,
): Promise<MarketplaceListing> {
  const next = {
    ...listing,
    verification: {
      ...listing.verification,
      [kind]: {
        ...listing.verification[kind],
        status: nextStatus,
        provider: provider ?? listing.verification[kind].provider,
      },
    },
  };
  return upsertMarketplaceListing(
    buildMarketplaceListingFromStartup(next, next),
  );
}

export async function runDomainVerification(
  listing: MarketplaceListing,
): Promise<MarketplaceListing> {
  return updateMarketplaceVerification(
    listing,
    "domain",
    "verified",
    "DNS TXT",
  );
}

/** @deprecated use runDomainVerification */
export const runMockDomainVerification = runDomainVerification;

export async function provisionBuyerForUser(user: User): Promise<void> {
  await ensureMarketplaceProfile(user, "buyer");
}

export async function provisionSellerForUser(user: User): Promise<void> {
  await ensureMarketplaceProfile(user, "seller");
}

export async function resolveMarketplaceDeskRoles(authUserId: string): Promise<{
  hasBuyer: boolean;
  hasSeller: boolean;
}> {
  const rows = await fetchMarketplaceProfilesForUser(authUserId);
  return {
    hasBuyer: rows.some((r) => r.desk_role === "buyer"),
    hasSeller: rows.some(
      (r) => r.desk_role === "seller" || r.desk_role === "founder",
    ),
  };
}
