import type { User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { MarketplaceError, mapSupabaseError } from "@/lib/marketplace/errors";
import {
  ensureBuyerProfile,
  getBuyerProfileId,
  getSellerProfileId,
} from "@/lib/marketplace/profiles";
import type {
  ConversationMessage,
  InboxThread,
  MarketplaceInterestRecord,
  MarketplaceThreadMessage,
} from "@/lib/marketplace/types";
import type { AuthRole } from "@/lib/auth/types";

function requireSupabase() {
  if (!isSupabaseConfigured())
    throw new MarketplaceError("Supabase is not configured", "not_configured");
  return getSupabase();
}

async function resolveStartup(slug: string): Promise<{
  id: string;
  slug: string;
  title: string;
  founderUserId: string | null;
}> {
  const { data, error } = await requireSupabase()
    .from("startups")
    .select("id, slug, title, founder_user_id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw mapSupabaseError(error);
  if (!data?.id) throw new MarketplaceError("Startup not found", "not_found");
  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    founderUserId: data.founder_user_id,
  };
}

async function sellerProfileIdForStartup(startup: {
  founderUserId: string | null;
}): Promise<string> {
  if (!startup.founderUserId) {
    throw new MarketplaceError("Listing has no seller", "not_found");
  }
  let sellerId = await getSellerProfileId(startup.founderUserId);
  if (!sellerId) {
    const { data: profile } = await requireSupabase()
      .from("marketplace_profiles")
      .select("id")
      .eq("auth_user_id", startup.founderUserId)
      .in("desk_role", ["seller", "founder"])
      .maybeSingle();
    sellerId = profile?.id ?? null;
  }
  if (!sellerId)
    throw new MarketplaceError("Seller profile required", "profile_required");
  return sellerId;
}

export async function findOrCreateConversation(input: {
  startupSlug: string;
  buyerUser: User;
}): Promise<string> {
  const startup = await resolveStartup(input.startupSlug);
  const buyerProfile = await ensureBuyerProfile(input.buyerUser);
  const sellerProfileId = await sellerProfileIdForStartup(startup);

  const { data: existing } = await requireSupabase()
    .from("conversations")
    .select("id")
    .eq("startup_id", startup.id)
    .eq("buyer_profile_id", buyerProfile.id)
    .eq("seller_profile_id", sellerProfileId)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created, error } = await requireSupabase()
    .from("conversations")
    .insert({
      startup_id: startup.id,
      buyer_profile_id: buyerProfile.id,
      seller_profile_id: sellerProfileId,
      status: "open",
    })
    .select("id")
    .single();
  if (error) throw mapSupabaseError(error);
  return created.id;
}

export async function sendMessage(input: {
  conversationId: string;
  senderUser: User;
  body: string;
}): Promise<ConversationMessage> {
  const trimmed = input.body.trim();
  if (!trimmed)
    throw new MarketplaceError("Message cannot be empty", "validation");
  const { data, error } = await requireSupabase()
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      sender_user_id: input.senderUser.id,
      body: trimmed,
    })
    .select("id, conversation_id, sender_user_id, body, read_at, created_at")
    .single();
  if (error) throw mapSupabaseError(error);
  return {
    id: data.id,
    conversationId: data.conversation_id,
    senderUserId: data.sender_user_id,
    body: data.body,
    readAt: data.read_at,
    createdAt: data.created_at,
  };
}

export async function listMessages(
  conversationId: string,
): Promise<ConversationMessage[]> {
  const { data, error } = await requireSupabase()
    .from("messages")
    .select("id, conversation_id, sender_user_id, body, read_at, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw mapSupabaseError(error);
  return (data ?? []).map((m) => ({
    id: m.id,
    conversationId: m.conversation_id,
    senderUserId: m.sender_user_id,
    body: m.body,
    readAt: m.read_at,
    createdAt: m.created_at,
  }));
}

export async function markConversationRead(
  conversationId: string,
  readerUserId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await requireSupabase()
    .from("messages")
    .update({ read_at: now })
    .eq("conversation_id", conversationId)
    .neq("sender_user_id", readerUserId)
    .is("read_at", null);
  if (error) throw mapSupabaseError(error);
}

type ConvRow = {
  id: string;
  startup_id: string;
  updated_at?: string;
  created_at: string;
  startups:
    | { slug: string; title: string }
    | { slug: string; title: string }[]
    | null;
  buyer_profile: { metadata: Record<string, unknown> } | null;
  seller_profile: { metadata: Record<string, unknown> } | null;
};

function startupFrom(row: ConvRow): { slug: string; title: string } {
  const s = row.startups;
  if (Array.isArray(s)) return s[0] ?? { slug: "", title: "" };
  return s ?? { slug: "", title: "" };
}

async function enrichThread(
  row: ConvRow,
  authUserId: string,
): Promise<InboxThread> {
  const st = startupFrom(row);
  const { data: lastMsg } = await requireSupabase()
    .from("messages")
    .select("body, created_at")
    .eq("conversation_id", row.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { count } = await requireSupabase()
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", row.id)
    .neq("sender_user_id", authUserId)
    .is("read_at", null);

  const buyerMeta = row.buyer_profile?.metadata ?? {};
  const sellerMeta = row.seller_profile?.metadata ?? {};
  return {
    conversationId: row.id,
    startupSlug: st.slug,
    startupTitle: st.title,
    buyerName: (buyerMeta.display_name as string) ?? "Buyer",
    sellerName: (sellerMeta.display_name as string) ?? "Seller",
    lastMessage: lastMsg?.body ?? "",
    updatedAt: lastMsg?.created_at ?? row.created_at,
    unreadCount: count ?? 0,
  };
}

export async function listInboxForUser(
  authUserId: string,
): Promise<InboxThread[]> {
  const buyerId = await getBuyerProfileId(authUserId);
  const sellerId = await getSellerProfileId(authUserId);
  const selectCols = `
      id, startup_id, created_at,
      startups(slug, title),
      buyer_profile:marketplace_profiles!conversations_buyer_profile_id_fkey(metadata),
      seller_profile:marketplace_profiles!conversations_seller_profile_id_fkey(metadata)
    `;
  const byId = new Map<string, ConvRow>();

  async function load(
    filterCol: "buyer_profile_id" | "seller_profile_id",
    profileId: string,
  ) {
    const { data, error } = await requireSupabase()
      .from("conversations")
      .select(selectCols)
      .eq(filterCol, profileId);
    if (error) throw mapSupabaseError(error);
    for (const row of (data ?? []) as unknown as ConvRow[]) {
      byId.set(row.id, row);
    }
  }

  if (buyerId) await load("buyer_profile_id", buyerId);
  if (sellerId) await load("seller_profile_id", sellerId);
  return Promise.all(
    [...byId.values()].map((r) => enrichThread(r, authUserId)),
  );
}

async function conversationIdForInterest(interestId: string): Promise<string> {
  const { data: interest, error } = await requireSupabase()
    .from("startup_interests")
    .select("startup_id, buyer_profile_id, startups(slug)")
    .eq("id", interestId)
    .single();
  if (error) throw mapSupabaseError(error);
  const slug = slugFromInterest(interest);
  const startup = await resolveStartup(slug);
  const sellerProfileId = await sellerProfileIdForStartup(startup);

  const { data: existing } = await requireSupabase()
    .from("conversations")
    .select("id")
    .eq("startup_id", interest.startup_id)
    .eq("buyer_profile_id", interest.buyer_profile_id)
    .eq("seller_profile_id", sellerProfileId)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: created, error: insErr } = await requireSupabase()
    .from("conversations")
    .insert({
      startup_id: interest.startup_id,
      buyer_profile_id: interest.buyer_profile_id,
      seller_profile_id: sellerProfileId,
      status: "open",
    })
    .select("id")
    .single();
  if (insErr) throw mapSupabaseError(insErr);
  return created.id;
}

function slugFromInterest(row: {
  startups?: { slug: string } | { slug: string }[] | null;
}): string {
  const s = row.startups;
  if (Array.isArray(s)) return s[0]?.slug ?? "";
  return s?.slug ?? "";
}

/** Interest id is used as thread id in seller inbox UI */
export async function appendMarketplaceThreadMessage(input: {
  threadId: string;
  senderUserId: string;
  senderName: string;
  senderRole: AuthRole;
  body: string;
}): Promise<MarketplaceInterestRecord> {
  const { data: auth } = await requireSupabase().auth.getUser();
  const sender = auth.user;
  if (!sender || sender.id !== input.senderUserId) {
    throw new MarketplaceError("Authenticated sender required", "forbidden");
  }
  const conversationId = await conversationIdForInterest(input.threadId);
  await sendMessage({ conversationId, senderUser: sender, body: input.body });

  const { data: interest } = await requireSupabase()
    .from("startup_interests")
    .select(
      "id, startup_id, status, message, created_at, updated_at, startups(slug)",
    )
    .eq("id", input.threadId)
    .single();

  const slug = interest ? slugFromInterest(interest) : "";
  return {
    id: input.threadId,
    listingId: slug,
    buyerUserId: input.senderUserId,
    buyerName: input.senderName,
    buyerRole: input.senderRole,
    email: sender.email ?? "",
    offerAmount: null,
    createdAt: interest?.created_at ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stage:
      (interest?.status as MarketplaceInterestRecord["stage"]) ?? "interested",
    messages: [
      {
        id: crypto.randomUUID(),
        senderUserId: input.senderUserId,
        senderName: input.senderName,
        senderRole: input.senderRole,
        body: input.body,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

export function toThreadMessages(
  rows: ConversationMessage[],
  nameByUserId: Map<string, string>,
): MarketplaceThreadMessage[] {
  return rows.map((m) => ({
    id: m.id,
    senderUserId: m.senderUserId,
    senderName: nameByUserId.get(m.senderUserId) ?? "User",
    senderRole: "buyer",
    body: m.body,
    createdAt: m.createdAt,
  }));
}
