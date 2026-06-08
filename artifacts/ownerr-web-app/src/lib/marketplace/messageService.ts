import type { User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { MarketplaceError, mapSupabaseError } from "@/lib/marketplace/errors";
import {
  ensureBuyerProfile,
  getBuyerProfileId,
  getSellerProfileId,
  getSellerProfileIds,
} from "@/lib/marketplace/profiles";
import type {
  ConversationMessage,
  InboxThread,
  MarketplaceInterestRecord,
  MarketplaceThreadMessage,
} from "@/lib/marketplace/types";
import type { AuthRole } from "@/lib/auth/types";
import {
  ensureMarketplaceTablesDetected,
  getMarketplaceTables,
} from "@/lib/marketplace/dbTables";

function requireSupabase() {
  if (!isSupabaseConfigured())
    throw new MarketplaceError("Supabase is not configured", "not_configured");
  return getSupabase();
}

async function mpTables() {
  await ensureMarketplaceTablesDetected();
  return getMarketplaceTables();
}

/** Dynamic account table name breaks Supabase select literal inference — use plain string. */
function conversationThreadSelect(
  accountsTable: string,
  includeParticipantIds: boolean,
): string {
  const buyerEmbed = `${accountsTable}!conversations_buyer_profile_id_fkey`;
  const sellerEmbed = `${accountsTable}!conversations_seller_profile_id_fkey`;
  const base = includeParticipantIds
    ? "id, startup_id, status, created_at, buyer_profile_id, seller_profile_id,"
    : "id, startup_id, status, created_at,";
  const companyCols = includeParticipantIds
    ? "marketplace_companies(slug, title, founder_user_id)"
    : "marketplace_companies(slug, title)";
  return `${base}
      ${companyCols},
      buyer_profile:${buyerEmbed}(metadata),
      seller_profile:${sellerEmbed}(metadata)`;
}

async function resolveStartup(slug: string): Promise<{
  id: string;
  slug: string;
  title: string;
  founderUserId: string | null;
}> {
  const { companies: MC } = await mpTables();
  const { data, error } = await requireSupabase()
    .from(MC)
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

async function bootstrapConversationViaRpc(
  startupSlug: string,
  message: string | null,
): Promise<string | null> {
  const { data, error } = await requireSupabase().rpc(
    "marketplace_bootstrap_conversation",
    {
      p_startup_slug: startupSlug,
      p_message: message ?? "",
    },
  );
  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "PGRST202" || error.message?.includes("Could not find")) {
      return null;
    }
    throw mapSupabaseError(error);
  }
  return typeof data === "string" ? data : null;
}

async function sellerProfileIdForStartup(startup: {
  id: string;
  founderUserId: string | null;
}): Promise<string> {
  if (!startup.founderUserId) {
    throw new MarketplaceError("Listing has no seller", "not_found");
  }

  const { sellerPublications: MSell, accounts: MAcc } = await mpTables();
  const { data: link, error: linkErr } = await requireSupabase()
    .from(MSell)
    .select("seller_profile_id")
    .eq("startup_id", startup.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (linkErr) throw mapSupabaseError(linkErr);
  if (link?.seller_profile_id) return link.seller_profile_id as string;

  const { data: profiles, error: profErr } = await requireSupabase()
    .from(MAcc)
    .select("id, desk_role, updated_at")
    .eq("auth_user_id", startup.founderUserId)
    .in("desk_role", ["seller", "founder"])
    .eq("status", "active")
    .order("updated_at", { ascending: false });
  if (profErr) throw mapSupabaseError(profErr);
  const sorted = [...(profiles ?? [])].sort((a, b) => {
    const rank = (r: string | null) =>
      r === "seller" ? 0 : r === "founder" ? 1 : 2;
    return rank(a.desk_role) - rank(b.desk_role);
  });
  const sellerId =
    sorted[0]?.id ?? (await getSellerProfileId(startup.founderUserId));
  if (!sellerId)
    throw new MarketplaceError("Seller profile required", "profile_required");
  return sellerId;
}

export async function findOrCreateConversation(input: {
  startupSlug: string;
  buyerUser: User;
  openingMessage?: string | null;
}): Promise<string> {
  const viaRpc = await bootstrapConversationViaRpc(
    input.startupSlug,
    input.openingMessage ?? null,
  );
  if (viaRpc) return viaRpc;

  const startup = await resolveStartup(input.startupSlug);
  const buyerProfile = await ensureBuyerProfile(input.buyerUser);
  const sellerProfileId = await sellerProfileIdForStartup(startup);
  const { conversations: MConv } = await mpTables();

  const { data: existing } = await requireSupabase()
    .from(MConv)
    .select("id")
    .eq("startup_id", startup.id)
    .eq("buyer_profile_id", buyerProfile.id)
    .eq("seller_profile_id", sellerProfileId)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created, error } = await requireSupabase()
    .from(MConv)
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

/** Creates conversation + first buyer message so seller inbox updates immediately. */
export async function ensureConversationWithOpeningMessage(input: {
  startupSlug: string;
  buyerUser: User;
  body: string;
}): Promise<string> {
  const trimmed = input.body.trim();
  if (!trimmed) {
    return findOrCreateConversation({
      startupSlug: input.startupSlug,
      buyerUser: input.buyerUser,
    });
  }
  const conversationId = await findOrCreateConversation({
    startupSlug: input.startupSlug,
    buyerUser: input.buyerUser,
    openingMessage: trimmed,
  });
  if (trimmed) {
    const existing = await listMessages(conversationId);
    const alreadySent = existing.some(
      (m) => m.senderUserId === input.buyerUser.id && m.body === trimmed,
    );
    if (!alreadySent) {
      await sendMessage({
        conversationId,
        senderUser: input.buyerUser,
        body: trimmed,
      });
    }
  }
  return conversationId;
}

export async function fetchConversationThread(
  conversationId: string,
  authUserId: string,
): Promise<InboxThread | null> {
  const buyerId = await getBuyerProfileId(authUserId);
  const sellerIds = await getSellerProfileIds(authUserId);
  const { conversations: MConv, accounts: accTbl } = await mpTables();
  const { data, error } = await requireSupabase()
    .from(MConv)
    .select(conversationThreadSelect(accTbl, true))
    .eq("id", conversationId)
    .maybeSingle();
  if (error) throw mapSupabaseError(error);
  if (!data) return null;
  const full = data as unknown as {
    buyer_profile_id: string;
    seller_profile_id: string;
    marketplace_companies:
      | { founder_user_id: string | null }
      | { founder_user_id: string | null }[]
      | null;
  };
  const st = full.marketplace_companies;
  const founderUserId = Array.isArray(st)
    ? st[0]?.founder_user_id
    : st?.founder_user_id;
  const ok =
    (buyerId && full.buyer_profile_id === buyerId) ||
    sellerIds.includes(full.seller_profile_id) ||
    founderUserId === authUserId;
  if (!ok) throw new MarketplaceError("Not a participant", "forbidden");
  return enrichThread(data as unknown as ConvRow, authUserId);
}

export async function sendMessage(input: {
  conversationId: string;
  senderUser: User;
  body: string;
}): Promise<ConversationMessage> {
  const trimmed = input.body.trim();
  if (!trimmed)
    throw new MarketplaceError("Message cannot be empty", "validation");

  const { data, error } = await requireSupabase().rpc(
    "marketplace_send_message",
    {
      p_conversation_id: input.conversationId,
      p_body: trimmed,
    },
  );
  if (error) throw mapSupabaseError(error);
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    conversationId: String(row.conversationId),
    senderUserId: String(row.senderUserId),
    body: String(row.body),
    readAt: row.readAt != null ? String(row.readAt) : null,
    createdAt: String(row.createdAt),
  };
}

export async function listMessages(
  conversationId: string,
): Promise<ConversationMessage[]> {
  const mapRpc = (raw: unknown) => {
    const rows = Array.isArray(raw)
      ? raw
      : typeof raw === "string"
        ? (JSON.parse(raw) as unknown[])
        : [];
    return rows.map((m) => {
      const row = m as Record<string, unknown>;
      return {
        id: String(row.id),
        conversationId: String(row.conversationId),
        senderUserId: String(row.senderUserId),
        body: String(row.body),
        readAt: row.readAt != null ? String(row.readAt) : null,
        createdAt: String(row.createdAt),
      };
    });
  };

  const { data, error } = await requireSupabase().rpc(
    "marketplace_list_messages",
    {
      p_conversation_id: conversationId,
      p_limit: 200,
      p_cursor_created_at: null,
      p_cursor_id: null,
    },
  );
  if (!error && data != null) {
    return mapRpc(data);
  }

  const { messages: MMsg } = await mpTables();
  const { data: rows, error: qErr } = await requireSupabase()
    .from(MMsg)
    .select("id, conversation_id, sender_user_id, body, read_at, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (qErr) throw mapSupabaseError(qErr);
  return (rows ?? []).map((m) => ({
    id: String(m.id),
    conversationId: String(m.conversation_id),
    senderUserId: String(m.sender_user_id),
    body: String(m.body),
    readAt: m.read_at != null ? String(m.read_at) : null,
    createdAt: String(m.created_at),
  }));
}

export async function markConversationRead(
  conversationId: string,
  readerUserId: string,
): Promise<void> {
  const { error } = await requireSupabase().rpc(
    "marketplace_mark_conversation_read",
    {
      p_conversation_id: conversationId,
    },
  );
  if (!error) return;

  const { messages: MMsg } = await mpTables();
  const { error: upErr } = await requireSupabase()
    .from(MMsg)
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_user_id", readerUserId)
    .is("read_at", null);
  if (upErr) {
    const code = (upErr as { code?: string })?.code;
    const status = (upErr as { status?: number })?.status;
    if (code === "42501" || status === 403) return;
    throw mapSupabaseError(error ?? upErr);
  }
}

type ConvRow = {
  id: string;
  startup_id: string;
  status?: string;
  updated_at?: string;
  created_at: string;
  marketplace_companies:
    | { slug: string; title: string }
    | { slug: string; title: string }[]
    | null;
  buyer_profile: { metadata: Record<string, unknown> } | null;
  seller_profile: { metadata: Record<string, unknown> } | null;
};

function startupFrom(row: ConvRow): { slug: string; title: string } {
  const s = row.marketplace_companies;
  if (Array.isArray(s)) return s[0] ?? { slug: "", title: "" };
  return s ?? { slug: "", title: "" };
}

async function enrichThread(
  row: ConvRow,
  authUserId: string,
): Promise<InboxThread> {
  const st = startupFrom(row);
  const { messages: MMsg } = await mpTables();
  const { data: lastMsg } = await requireSupabase()
    .from(MMsg)
    .select("body, created_at")
    .eq("conversation_id", row.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { count } = await requireSupabase()
    .from(MMsg)
    .select("id", { count: "exact" })
    .eq("conversation_id", row.id)
    .neq("sender_user_id", authUserId)
    .is("read_at", null)
    .limit(0);

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
    status:
      row.status === "closed" || row.status === "archived"
        ? row.status
        : "open",
  };
}

export async function repairBuyerInterestConversations(): Promise<number> {
  const { data, error } = await requireSupabase().rpc(
    "marketplace_repair_buyer_interest_conversations",
  );
  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "PGRST202" || error.message?.includes("Could not find")) {
      return 0;
    }
    throw mapSupabaseError(error);
  }
  return typeof data === "number" ? data : Number(data ?? 0);
}

export async function listInboxForUser(
  authUserId: string,
): Promise<InboxThread[]> {
  const { data, error } = await requireSupabase().rpc(
    "marketplace_list_conversations",
    {
      p_limit: 50,
      p_cursor_created_at: null,
      p_cursor_id: null,
    },
  );
  if (!error && data) {
    const rows = Array.isArray(data)
      ? data
      : typeof data === "string"
        ? (JSON.parse(data) as unknown[])
        : [];
    return rows.map((raw) => {
      const row = raw as Record<string, unknown>;
      return {
        conversationId: String(row.conversationId),
        startupSlug: String(row.startupSlug ?? ""),
        startupTitle: String(row.startupTitle ?? ""),
        buyerName: String(row.buyerName ?? "Buyer"),
        sellerName: String(row.sellerName ?? "Seller"),
        lastMessage: String(row.lastMessage ?? ""),
        updatedAt: String(row.updatedAt ?? row.createdAt ?? ""),
        unreadCount: Number(row.unreadCount ?? 0),
        status:
          row.status === "closed" || row.status === "archived"
            ? (row.status as "closed" | "archived")
            : "open",
      };
    });
  }

  const buyerId = await getBuyerProfileId(authUserId);
  const sellerProfileIds = await getSellerProfileIds(authUserId);
  const {
    conversations: MConv,
    companies: MC,
    accounts: accTbl,
  } = await mpTables();
  const selectCols = conversationThreadSelect(accTbl, false);
  const byId = new Map<string, ConvRow>();

  async function load(
    filterCol: "buyer_profile_id" | "seller_profile_id" | "startup_id",
    value: string,
  ) {
    const { data, error } = await requireSupabase()
      .from(MConv)
      .select(selectCols)
      .eq(filterCol, value);
    if (error) throw mapSupabaseError(error);
    for (const row of (data ?? []) as unknown as ConvRow[]) {
      byId.set(row.id, row);
    }
  }

  if (buyerId) await load("buyer_profile_id", buyerId);
  for (const sid of sellerProfileIds) {
    await load("seller_profile_id", sid);
  }

  const { data: founderStartups, error: fsErr } = await requireSupabase()
    .from(MC)
    .select("id")
    .eq("founder_user_id", authUserId);
  if (fsErr) throw mapSupabaseError(fsErr);
  for (const row of founderStartups ?? []) {
    await load("startup_id", row.id as string);
  }

  const threads = await Promise.all(
    [...byId.values()].map((r) => enrichThread(r, authUserId)),
  );
  return threads.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

async function conversationIdForInterest(interestId: string): Promise<string> {
  const { buyerInterests: MInt, conversations: MConv } = await mpTables();
  const { data: interest, error } = await requireSupabase()
    .from(MInt)
    .select("startup_id, buyer_profile_id, marketplace_companies(slug)")
    .eq("id", interestId)
    .single();
  if (error) throw mapSupabaseError(error);
  const slug = slugFromInterest(interest);
  const startup = await resolveStartup(slug);
  const sellerProfileId = await sellerProfileIdForStartup(startup);

  const { data: existing } = await requireSupabase()
    .from(MConv)
    .select("id")
    .eq("startup_id", interest.startup_id)
    .eq("buyer_profile_id", interest.buyer_profile_id)
    .eq("seller_profile_id", sellerProfileId)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: created, error: insErr } = await requireSupabase()
    .from(MConv)
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
  marketplace_companies?: { slug: string } | { slug: string }[] | null;
}): string {
  const s = row.marketplace_companies;
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

  const { buyerInterests: MInt } = await mpTables();
  const { data: interest } = await requireSupabase()
    .from(MInt)
    .select(
      "id, startup_id, status, message, created_at, updated_at, marketplace_companies(slug)",
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
