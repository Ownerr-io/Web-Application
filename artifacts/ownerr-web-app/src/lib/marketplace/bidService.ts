import type { User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { MarketplaceError, mapSupabaseError } from "@/lib/marketplace/errors";
import {
  ensureBuyerProfile,
  getBuyerProfileId,
} from "@/lib/marketplace/profiles";
import type { BidStatus, MarketplaceBid } from "@/lib/marketplace/types";

const BID_COLUMNS =
  "id, startup_id, buyer_profile_id, amount, currency, status, message, created_at, updated_at, startups(slug), marketplace_profiles(auth_user_id, metadata)";

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
  startups: { slug: string } | { slug: string }[] | null;
  marketplace_profiles:
    | { auth_user_id: string; metadata: Record<string, unknown> }
    | { auth_user_id: string; metadata: Record<string, unknown> }[]
    | null;
};

function profileFrom(
  row: BidRow,
): { auth_user_id: string; metadata: Record<string, unknown> } | null {
  const p = row.marketplace_profiles;
  if (!p) return null;
  if (Array.isArray(p)) return p[0] ?? null;
  return p;
}

function slugFrom(row: BidRow): string {
  const s = row.startups;
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
    status: row.status,
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
    .from("startups")
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
    .from("bids")
    .select(BID_COLUMNS)
    .eq("startup_id", startupId)
    .order("amount", { ascending: false });
  if (error) throw mapSupabaseError(error);
  return (data ?? []).map((r) => mapBid(r as unknown as BidRow));
}

export async function listBidsForBuyer(
  authUserId: string,
): Promise<MarketplaceBid[]> {
  const profileId = await getBuyerProfileId(authUserId);
  if (!profileId) return [];
  const { data, error } = await requireSupabase()
    .from("bids")
    .select(BID_COLUMNS)
    .eq("buyer_profile_id", profileId)
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
  const profile = await ensureBuyerProfile(input.user);
  const startupId = await startupIdForSlug(input.startupSlug);
  const status = input.status ?? "submitted";
  const { data, error } = await requireSupabase()
    .from("bids")
    .insert({
      startup_id: startupId,
      buyer_profile_id: profile.id,
      amount: input.amount,
      currency: "USD",
      status,
      message: input.message ?? null,
    })
    .select(BID_COLUMNS)
    .single();
  if (error) throw mapSupabaseError(error);
  return mapBid(data as unknown as BidRow);
}

export async function updateBidStatus(input: {
  bidId: string;
  status: BidStatus;
  asAuthUserId: string;
}): Promise<MarketplaceBid> {
  const { data, error } = await requireSupabase()
    .from("bids")
    .update({ status: input.status, updated_at: new Date().toISOString() })
    .eq("id", input.bidId)
    .select(BID_COLUMNS)
    .single();
  if (error) throw mapSupabaseError(error);
  void input.asAuthUserId;
  return mapBid(data as unknown as BidRow);
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
