import type { AuthRole } from "@/lib/auth/types";
import type { User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  fetchPublicStartups,
  fetchStartupBySlugWithAccess,
  fetchStartupsForSlugs,
} from "@/lib/marketplace/catalog";
import { enrichListingWithIntelligence } from "@/lib/marketplace/enrichListing";
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
import { SchemaTables as T } from "@/lib/supabase/schemaTables";

const MC = T.marketplace.companies;
const MSell = T.marketplace.sellerPublications;

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
  return Promise.all(startups.map((s) => enrichListingWithIntelligence(s)));
}

export async function fetchMarketplaceListingBySlug(
  slug: string,
): Promise<MarketplaceListing | null> {
  const startup = await fetchStartupBySlugWithAccess(slug);
  if (!startup) return null;
  return enrichListingWithIntelligence(startup, {
    ownerUserId: startup.founderUserId ?? undefined,
  });
}

export async function upsertMarketplaceListing(
  listing: MarketplaceListing,
): Promise<MarketplaceListing> {
  const { updateMarketplaceListing } =
    await import("@/lib/marketplace/updateListingApi");
  return updateMarketplaceListing(listing);
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
      .from(MSell)
      .select("marketplace_companies(slug)")
      .eq("seller_profile_id", sellerProfileId);
    if (linkErr) throw linkErr;
    for (const row of links ?? []) {
      const st = row.marketplace_companies as
        | { slug?: string }
        | { slug?: string }[]
        | null;
      const slug = Array.isArray(st) ? st[0]?.slug : st?.slug;
      if (slug) slugs.add(slug);
    }
  }
  const { data: founderRows, error: founderErr } = await supabase
    .from(MC)
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
  const startups = await fetchStartupsForSlugs([...slugs]);
  return Promise.all(
    startups.map((s) =>
      enrichListingWithIntelligence(s, {
        ownerUserId: s.founderUserId ?? undefined,
      }),
    ),
  );
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
  _listing: MarketplaceListing,
  _kind: keyof MarketplaceListing["verification"],
  _nextStatus: VerificationStatus,
  _provider?: string | null,
): Promise<MarketplaceListing> {
  throw new Error(
    "Manual verification toggles are disabled. Use provider connections in the Verification Center.",
  );
}

export async function runDomainVerification(
  _listing: MarketplaceListing,
): Promise<MarketplaceListing> {
  throw new Error(
    "Use domain verification flow (TXT/CNAME) from the Verification Center.",
  );
}

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
