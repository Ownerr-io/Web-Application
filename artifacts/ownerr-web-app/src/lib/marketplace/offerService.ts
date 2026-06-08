import type { User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { MarketplaceError, mapSupabaseError } from "@/lib/marketplace/errors";
import { trackOfferEvent } from "@/lib/marketplace/offerAnalytics";
import type {
  AcquisitionStage,
  BidStatus,
  BidVersion,
  BuyerOfferRow,
  SellerOfferStartupGroup,
} from "@/lib/marketplace/types";
import { SchemaTables as T } from "@/lib/supabase/schemaTables";

function requireSupabase() {
  if (!isSupabaseConfigured())
    throw new MarketplaceError("Supabase is not configured", "not_configured");
  return getSupabase();
}

function parseRpcJsonRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data as Record<string, unknown>[];
  }
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data) as unknown;
      return Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function asStatus(s: string): BidStatus {
  return (s === "rejected" ? "declined" : s) as BidStatus;
}

function mapBuyerRow(raw: Record<string, unknown>): BuyerOfferRow {
  return {
    id: String(raw.id),
    startupId: String(raw.startupId),
    startupSlug: String(raw.startupSlug),
    startupTitle: String(raw.startupTitle ?? ""),
    buyerProfileId: "",
    buyerAuthUserId: "",
    buyerDisplayName: "",
    amount: Number(raw.amount),
    currency: String(raw.currency ?? "USD"),
    status: asStatus(String(raw.status)),
    message: raw.message != null ? String(raw.message) : null,
    proofOfFunds: raw.proofOfFunds != null ? String(raw.proofOfFunds) : null,
    expiresAt: raw.expiresAt != null ? String(raw.expiresAt) : null,
    conversationId:
      raw.conversationId != null ? String(raw.conversationId) : null,
    acquisitionStage: (raw.acquisitionStage as AcquisitionStage | null) ?? null,
    lastActorRole:
      raw.lastActorRole === "buyer" || raw.lastActorRole === "seller"
        ? raw.lastActorRole
        : null,
    acceptedAt: raw.acceptedAt != null ? String(raw.acceptedAt) : null,
    createdAt: String(raw.createdAt),
    updatedAt: String(raw.updatedAt),
    trustScore: raw.trustScore != null ? Number(raw.trustScore) : null,
    listingLifecycle: String(raw.listingLifecycle ?? ""),
    offersOpen: Boolean(raw.offersOpen ?? true),
  };
}

function mapSellerOffer(raw: Record<string, unknown>) {
  return {
    id: String(raw.id),
    buyerName: String(raw.buyerName ?? "Buyer"),
    buyerAuthUserId: String(raw.buyerAuthUserId ?? ""),
    amount: Number(raw.amount),
    currency: String(raw.currency ?? "USD"),
    status: asStatus(String(raw.status)),
    message: raw.message != null ? String(raw.message) : null,
    proofOfFunds: raw.proofOfFunds != null ? String(raw.proofOfFunds) : null,
    expiresAt: raw.expiresAt != null ? String(raw.expiresAt) : null,
    conversationId:
      raw.conversationId != null ? String(raw.conversationId) : null,
    acquisitionStage: (raw.acquisitionStage as AcquisitionStage | null) ?? null,
    lastActorRole: raw.lastActorRole != null ? String(raw.lastActorRole) : null,
    createdAt: String(raw.createdAt),
    updatedAt: String(raw.updatedAt),
    acceptedAt: raw.acceptedAt != null ? String(raw.acceptedAt) : null,
  };
}

export async function listBuyerOffers(): Promise<BuyerOfferRow[]> {
  const {
    data: { user },
  } = await requireSupabase().auth.getUser();
  if (!user) return [];

  const { data, error } = await requireSupabase().rpc(
    "marketplace_list_offers_buyer",
  );
  if (error) {
    if (error.code === "PGRST202") {
      return [];
    }
    throw mapSupabaseError(error);
  }

  return parseRpcJsonRows(data).map(mapBuyerRow);
}

export async function listSellerOfferGroups(): Promise<
  SellerOfferStartupGroup[]
> {
  const { data, error } = await requireSupabase().rpc(
    "marketplace_list_offers_seller",
  );
  if (error) throw mapSupabaseError(error);
  if (!Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((g) => ({
    startupId: String(g.startupId),
    startupSlug: String(g.startupSlug),
    startupTitle: String(g.startupTitle),
    listingLifecycle: String(g.listingLifecycle ?? ""),
    offersOpen: Boolean(g.offersOpen ?? true),
    offerCount: Number(g.offerCount ?? 0),
    highestOffer: g.highestOffer != null ? Number(g.highestOffer) : null,
    latestActivity: String(g.latestActivity ?? ""),
    offers: Array.isArray(g.offers)
      ? (g.offers as Record<string, unknown>[]).map(mapSellerOffer)
      : [],
  }));
}

export async function listOffersForStartupSlug(
  slug: string,
): Promise<SellerOfferStartupGroup["offers"]> {
  const groups = await listSellerOfferGroups();
  const group = groups.find((g) => g.startupSlug === slug);
  if (group) return group.offers;
  return [];
}

export async function fetchBidDetail(bidId: string): Promise<{
  bid: Record<string, unknown>;
  versions: BidVersion[];
} | null> {
  const { data, error } = await requireSupabase().rpc(
    "marketplace_get_bid_detail",
    { p_bid_id: bidId },
  );
  if (error) throw mapSupabaseError(error);
  if (!data || typeof data !== "object") return null;
  const payload = data as {
    bid?: Record<string, unknown>;
    versions?: unknown[];
  };
  const versions = (payload.versions ?? []).map((v) => {
    const row = v as Record<string, unknown>;
    return {
      versionNumber: Number(row.versionNumber),
      actorRole: row.actorRole as BidVersion["actorRole"],
      actorUserId: row.actorUserId != null ? String(row.actorUserId) : null,
      amount: Number(row.amount),
      currency: String(row.currency ?? "USD"),
      message: row.message != null ? String(row.message) : null,
      proofOfFunds: row.proofOfFunds != null ? String(row.proofOfFunds) : null,
      createdAt: String(row.createdAt),
    };
  });
  return { bid: payload.bid ?? {}, versions };
}

export async function submitOffer(input: {
  user: User;
  startupSlug: string;
  amount: number;
  currency?: string;
  message?: string | null;
  proofOfFunds?: string | null;
  expiresAt?: string | null;
  conversationId?: string | null;
}): Promise<string> {
  const { data, error } = await requireSupabase().rpc(
    "marketplace_submit_offer",
    {
      p_startup_slug: input.startupSlug,
      p_amount: input.amount,
      p_currency: input.currency ?? "USD",
      p_message: input.message ?? null,
      p_proof_of_funds: input.proofOfFunds ?? null,
      p_expires_at: input.expiresAt ?? null,
      p_conversation_id: input.conversationId ?? null,
    },
  );
  if (error) throw mapSupabaseError(error);
  if (!data) throw new MarketplaceError("Offer submit failed", "unknown");
  trackOfferEvent("offer_submitted", {
    startup_slug: input.startupSlug,
    amount: input.amount,
  });
  return String(data);
}

async function rpcVoid(
  fn: string,
  args: Record<string, unknown>,
  event?: Parameters<typeof trackOfferEvent>[0],
): Promise<void> {
  const { error } = await requireSupabase().rpc(fn, args);
  if (error) throw mapSupabaseError(error);
  if (event) trackOfferEvent(event, args);
}

export async function counterOffer(
  bidId: string,
  amount: number,
  message?: string,
): Promise<void> {
  await rpcVoid(
    "marketplace_counter_offer",
    { p_bid_id: bidId, p_amount: amount, p_message: message ?? null },
    "offer_countered",
  );
}

export async function acceptOffer(bidId: string): Promise<void> {
  await rpcVoid(
    "marketplace_accept_offer",
    { p_bid_id: bidId },
    "offer_accepted",
  );
  trackOfferEvent("due_diligence_started", { bid_id: bidId });
}

export async function declineOffer(
  bidId: string,
  message?: string,
): Promise<void> {
  await rpcVoid(
    "marketplace_decline_offer",
    { p_bid_id: bidId, p_message: message ?? null },
    "offer_declined",
  );
}

export async function withdrawOffer(bidId: string): Promise<void> {
  await rpcVoid("marketplace_withdraw_offer", { p_bid_id: bidId });
}

export async function acceptCounterOffer(bidId: string): Promise<void> {
  await rpcVoid("marketplace_accept_counter", { p_bid_id: bidId });
}

export async function advanceAcquisitionStage(
  bidId: string,
  stage: AcquisitionStage,
): Promise<void> {
  await rpcVoid("marketplace_advance_acquisition_stage", {
    p_bid_id: bidId,
    p_stage: stage,
  });
  if (stage === "closed") trackOfferEvent("deal_closed", { bid_id: bidId });
}

export async function ensureConversationForBid(bidId: string): Promise<string> {
  const { data, error } = await requireSupabase().rpc(
    "marketplace_ensure_conversation_for_bid",
    { p_bid_id: bidId },
  );
  if (error) throw mapSupabaseError(error);
  if (!data) throw new MarketplaceError("Conversation not found", "not_found");
  return String(data);
}

export async function fetchAdminOffersDashboard(filters: {
  status?: string;
  startupSlug?: string;
  from?: string;
  to?: string;
}) {
  const { data, error } = await requireSupabase().rpc(
    "admin_marketplace_offers_dashboard",
    {
      p_status: filters.status ?? null,
      p_startup_slug: filters.startupSlug ?? null,
      p_from: filters.from ?? null,
      p_to: filters.to ?? null,
    },
  );
  if (error) throw new Error(error.message);
  return data as {
    metrics: Record<string, number>;
    offers: Record<string, unknown>[];
  };
}

export async function fetchOfferNotifications(limit = 20) {
  const {
    data: { user },
  } = await requireSupabase().auth.getUser();
  if (!user) return [];
  const { data, error } = await requireSupabase()
    .from(T.marketplace.offerNotifications)
    .select("id, event_type, payload, read_at, created_at, bid_id, startup_id")
    .eq("recipient_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw mapSupabaseError(error);
  return data ?? [];
}
