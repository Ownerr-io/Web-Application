import type { User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { MarketplaceError, mapSupabaseError } from "@/lib/marketplace/errors";
import {
  getBuyerProfileId,
  getMarketplaceProfileIdsForUser,
} from "@/lib/marketplace/profiles";
import type { BidStatus, MarketplaceBid } from "@/lib/marketplace/types";
import { SchemaTables as T } from "@/lib/supabase/schemaTables";

const BID_COLUMNS = `id, startup_id, buyer_profile_id, amount, currency, status, message, created_at, updated_at, ${T.marketplace.companies}(slug), ${T.marketplace.accounts}(auth_user_id, metadata)`;

type BidRow = {
  id: string;
  startup_id: string;
  buyer_profile_id: string;
  amount: number;
  currency: string;
  status: BidStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
  marketplace_companies: { slug: string } | { slug: string }[] | null;
  marketplace_accounts:
    | { auth_user_id: string; metadata: Record<string, unknown> }
    | { auth_user_id: string; metadata: Record<string, unknown> }[]
    | null;
};

function profileFrom(
  row: BidRow,
): { auth_user_id: string; metadata: Record<string, unknown> } | null {
  const p = row.marketplace_accounts;
  if (!p) return null;
  if (Array.isArray(p)) return p[0] ?? null;
  return p;
}

function slugFrom(row: BidRow): string {
  const s = row.marketplace_companies;
  if (Array.isArray(s)) return s[0]?.slug ?? "";
  return s?.slug ?? "";
}

function mapBid(row: BidRow): MarketplaceBid {
  const profile = profileFrom(row);
  const meta = profile?.metadata ?? {};
  return {
    id: row.id,
    startupId: row.startup_id,
    startupSlug: slugFrom(row),
    buyerProfileId: row.buyer_profile_id,
    buyerAuthUserId: profile?.auth_user_id ?? "",
    buyerDisplayName: (meta.display_name as string) ?? "Buyer",
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status === "rejected" ? "declined" : row.status,
    message: row.message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function requireSupabase() {
  if (!isSupabaseConfigured())
    throw new MarketplaceError("Supabase is not configured", "not_configured");
  return getSupabase();
}

async function startupIdForSlug(slug: string): Promise<string> {
  const { data, error } = await requireSupabase()
    .from(T.marketplace.companies)
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw mapSupabaseError(error);
  if (!data?.id) throw new MarketplaceError("Startup not found", "not_found");
  return data.id;
}

export async function listBidsForStartupSlug(
  slug: string,
): Promise<MarketplaceBid[]> {
  const startupId = await startupIdForSlug(slug);
  const { data, error } = await requireSupabase()
    .from(T.marketplace.offers)
    .select(BID_COLUMNS)
    .eq("startup_id", startupId)
    .order("amount", { ascending: false });
  if (error) throw mapSupabaseError(error);
  return (data ?? []).map((r) => mapBid(r as unknown as BidRow));
}

export async function listBidsForBuyer(
  authUserId: string,
): Promise<MarketplaceBid[]> {
  const profileIds = await getMarketplaceProfileIdsForUser(authUserId);
  const buyerOnly = await getBuyerProfileId(authUserId);
  const ids = profileIds.length ? profileIds : buyerOnly ? [buyerOnly] : [];
  if (!ids.length) return [];
  const { data, error } = await requireSupabase()
    .from(T.marketplace.offers)
    .select(BID_COLUMNS)
    .in("buyer_profile_id", ids)
    .order("updated_at", { ascending: false });
  if (error) throw mapSupabaseError(error);
  return (data ?? []).map((r) => mapBid(r as unknown as BidRow));
}

export async function createBid(input: {
  user: User;
  startupSlug: string;
  amount: number;
  message?: string | null;
  status?: BidStatus;
}): Promise<MarketplaceBid> {
  const { submitOffer, fetchBidDetail } =
    await import("@/lib/marketplace/offerService");
  const bidId = await submitOffer({
    user: input.user,
    startupSlug: input.startupSlug,
    amount: input.amount,
    message: input.message,
  });
  const detail = await fetchBidDetail(bidId);
  if (!detail?.bid) {
    throw new MarketplaceError("Offer created but detail missing", "unknown");
  }
  const b = detail.bid;
  return {
    id: String(b.id),
    startupId: String(b.startupId ?? b.startup_id ?? ""),
    startupSlug: input.startupSlug,
    buyerProfileId: String(b.buyerProfileId ?? b.buyer_profile_id ?? ""),
    buyerAuthUserId: input.user.id,
    buyerDisplayName: "Buyer",
    amount: Number(b.amount),
    currency: String(b.currency ?? "USD"),
    status: (b.status === "rejected" ? "declined" : b.status) as BidStatus,
    message: b.message != null ? String(b.message) : null,
    createdAt: String(b.createdAt ?? b.created_at ?? new Date().toISOString()),
    updatedAt: String(b.updatedAt ?? b.updated_at ?? new Date().toISOString()),
  };
}

export async function updateBidStatus(input: {
  bidId: string;
  status: BidStatus;
  asAuthUserId: string;
}): Promise<MarketplaceBid> {
  const { declineOffer, withdrawOffer, acceptOffer, fetchBidDetail } =
    await import("@/lib/marketplace/offerService");
  if (input.status === "declined") await declineOffer(input.bidId);
  else if (input.status === "withdrawn") await withdrawOffer(input.bidId);
  else if (input.status === "accepted") await acceptOffer(input.bidId);
  else
    throw new MarketplaceError("Use offer RPCs for this status", "validation");
  const detail = await fetchBidDetail(input.bidId);
  if (!detail?.bid) throw new MarketplaceError("Offer not found", "not_found");
  const b = detail.bid;
  return {
    id: input.bidId,
    startupId: String(b.startupId ?? ""),
    startupSlug: String(b.startupSlug ?? ""),
    buyerProfileId: "",
    buyerAuthUserId: input.asAuthUserId,
    buyerDisplayName: "Buyer",
    amount: Number(b.amount),
    currency: String(b.currency ?? "USD"),
    status: input.status,
    message: b.message != null ? String(b.message) : null,
    createdAt: String(b.createdAt ?? ""),
    updatedAt: String(b.updatedAt ?? ""),
  };
}

export function highestActiveBidAmount(bids: MarketplaceBid[]): number | null {
  const active = bids.filter((b) =>
    ["submitted", "under_review"].includes(b.status),
  );
  if (!active.length) return null;
  return Math.max(...active.map((b) => b.amount));
}

export function minNextBidAmount(
  basePrice: number,
  highest: number | null,
): number {
  if (highest == null) return Math.max(1, Math.round(basePrice * 0.5));
  return Math.max(highest + 1, Math.round(basePrice * 0.5));
}
