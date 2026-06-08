import type { SupabaseClient } from "@supabase/supabase-js";
import { SchemaTables as T } from "@/lib/supabase/schemaTables";
import { getSupabase } from "@/lib/supabase/client";
import { devLog } from "@/lib/observability/devLog";

/** PostgREST-exposed names for marketplace desk tables (v2 physical vs legacy). */
export type MarketplaceTableSet = {
  accounts: string;
  companies: string;
  buyerInterests: string;
  offers: string;
  conversations: string;
  messages: string;
  sellerPublications: string;
};

const V2: MarketplaceTableSet = {
  accounts: T.marketplace.accounts,
  companies: T.marketplace.companies,
  buyerInterests: T.marketplace.buyerInterests,
  offers: T.marketplace.offers,
  conversations: T.marketplace.conversations,
  messages: T.marketplace.messages,
  sellerPublications: T.marketplace.sellerPublications,
};

const LEGACY: MarketplaceTableSet = {
  accounts: "marketplace_profiles",
  companies: "startups",
  buyerInterests: "startup_interests",
  offers: "bids",
  conversations: "conversations",
  messages: "messages",
  sellerPublications: "seller_listings",
};

let tables: MarketplaceTableSet = V2;
let detectPromise: Promise<MarketplaceTableSet> | null = null;

function isMissingResource(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  const status = (err as { status?: number })?.status;
  const msg =
    typeof (err as { message?: string })?.message === "string"
      ? (err as { message: string }).message
      : "";
  return (
    code === "PGRST205" ||
    code === "PGRST204" ||
    code === "42P01" ||
    status === 404 ||
    msg.includes("does not exist")
  );
}

async function probeTable(
  supabase: SupabaseClient,
  name: string,
): Promise<boolean> {
  const { error } = await supabase.from(name).select("id").limit(1);
  if (!error) return true;
  return !isMissingResource(error);
}

async function resolvePair(
  supabase: SupabaseClient,
  v2Name: string,
  legacyName: string,
): Promise<string> {
  if (await probeTable(supabase, v2Name)) return v2Name;
  if (await probeTable(supabase, legacyName)) return legacyName;
  return v2Name;
}

export function getMarketplaceTables(): MarketplaceTableSet {
  return tables;
}

export async function ensureMarketplaceTablesDetected(
  supabase: SupabaseClient = getSupabase(),
): Promise<MarketplaceTableSet> {
  if (detectPromise) return detectPromise;
  detectPromise = (async () => {
    const resolved: MarketplaceTableSet = {
      accounts: await resolvePair(supabase, V2.accounts, LEGACY.accounts),
      companies: await resolvePair(supabase, V2.companies, LEGACY.companies),
      buyerInterests: await resolvePair(
        supabase,
        V2.buyerInterests,
        LEGACY.buyerInterests,
      ),
      offers: await resolvePair(supabase, V2.offers, LEGACY.offers),
      conversations: await resolvePair(
        supabase,
        V2.conversations,
        LEGACY.conversations,
      ),
      messages: await resolvePair(supabase, V2.messages, LEGACY.messages),
      sellerPublications: await resolvePair(
        supabase,
        V2.sellerPublications,
        LEGACY.sellerPublications,
      ),
    };
    tables = resolved;
    if (resolved.accounts !== V2.accounts) {
      devLog(
        "[Schema Detection] Marketplace accounts table:",
        resolved.accounts,
        "(legacy fallback; run migration 20260702720000)",
      );
    }
    return resolved;
  })();
  return detectPromise;
}
