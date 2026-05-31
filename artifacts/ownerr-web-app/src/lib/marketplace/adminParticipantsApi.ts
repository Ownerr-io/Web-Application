import { getSupabase } from "@/lib/supabase/client";
import type {
  MarketplaceBuyerDetail,
  MarketplaceBuyerRow,
  MarketplaceCharts,
  MarketplaceSellerDetail,
  MarketplaceSellerRow,
} from "./adminParticipantsTypes";

function mapBuyer(raw: Record<string, unknown>): MarketplaceBuyerRow {
  const profileId = String(raw.profileId ?? "");
  return {
    id: profileId,
    profileId,
    authUserId: String(raw.authUserId ?? ""),
    status: String(raw.status ?? ""),
    createdAt: String(raw.createdAt ?? ""),
    email: String(raw.email ?? ""),
    username: String(raw.username ?? ""),
    fullName: String(raw.fullName ?? ""),
    interestCount: Number(raw.interestCount) || 0,
    bidCount: Number(raw.bidCount) || 0,
    conversationCount: Number(raw.conversationCount) || 0,
    closedDeals: Number(raw.closedDeals) || 0,
    lastActivityAt:
      raw.lastActivityAt != null ? String(raw.lastActivityAt) : null,
  };
}

function mapSeller(raw: Record<string, unknown>): MarketplaceSellerRow {
  const profileId = String(raw.profileId ?? "");
  return {
    id: profileId,
    profileId,
    authUserId: String(raw.authUserId ?? ""),
    status: String(raw.status ?? ""),
    createdAt: String(raw.createdAt ?? ""),
    email: String(raw.email ?? ""),
    username: String(raw.username ?? ""),
    fullName: String(raw.fullName ?? ""),
    listingCount: Number(raw.listingCount) || 0,
    publishedCount: Number(raw.publishedCount) || 0,
    inboundInterests: Number(raw.inboundInterests) || 0,
    inboundBids: Number(raw.inboundBids) || 0,
    pendingVerifications: Number(raw.pendingVerifications) || 0,
    lastActivityAt:
      raw.lastActivityAt != null ? String(raw.lastActivityAt) : null,
  };
}

export async function fetchAdminMarketplaceBuyers(): Promise<
  MarketplaceBuyerRow[]
> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("admin_marketplace_buyers");
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map(mapBuyer);
}

export async function fetchAdminMarketplaceSellers(): Promise<
  MarketplaceSellerRow[]
> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("admin_marketplace_sellers");
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map(mapSeller);
}

export async function fetchAdminMarketplaceBuyerDetail(
  profileId: string,
): Promise<MarketplaceBuyerDetail | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("admin_marketplace_buyer_detail", {
    p_profile_id: profileId,
  });
  if (error) throw new Error(error.message);
  if (!data) return null;
  return data as MarketplaceBuyerDetail;
}

export async function fetchAdminMarketplaceSellerDetail(
  profileId: string,
): Promise<MarketplaceSellerDetail | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc(
    "admin_marketplace_seller_detail",
    {
      p_profile_id: profileId,
    },
  );
  if (error) throw new Error(error.message);
  if (!data) return null;
  return data as MarketplaceSellerDetail;
}

export async function fetchAdminMarketplaceCharts(): Promise<MarketplaceCharts | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("admin_marketplace_charts");
  if (error) return null;
  const raw = data as Record<string, unknown>;
  return {
    interestsByDay: Array.isArray(raw.interestsByDay)
      ? (raw.interestsByDay as MarketplaceCharts["interestsByDay"])
      : [],
    bidsByDay: Array.isArray(raw.bidsByDay)
      ? (raw.bidsByDay as MarketplaceCharts["bidsByDay"])
      : [],
    listingStatusBreakdown: Array.isArray(raw.listingStatusBreakdown)
      ? (raw.listingStatusBreakdown as MarketplaceCharts["listingStatusBreakdown"])
      : [],
    funnel: Array.isArray(raw.funnel)
      ? (raw.funnel as MarketplaceCharts["funnel"])
      : [],
  };
}
