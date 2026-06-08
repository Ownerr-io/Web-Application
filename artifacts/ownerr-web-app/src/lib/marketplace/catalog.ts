import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { mapStartupRow, type ListingGateRow } from "@/lib/marketplace/mappers";
import type { Startup, StartupRow } from "@/lib/marketplace/types";
import { SchemaTables as T } from "@/lib/supabase/schemaTables";

const MC = T.marketplace.companies;
const TG = T.trust.listingGates;

const STARTUP_COLUMNS =
  "id, slug, founder_user_id, founder_handle, title, tagline, description, industry, asking_price, currency, annual_revenue, profit, growth_rate, team_size, founded_year, verified, visibility, status, listing_lifecycle, metadata, created_at, updated_at";

const GATE_COLUMNS =
  "startup_id, identity_status, domain_status, business_email_status, revenue_status, registration_status, verified_revenue_amount, revenue_source_provider, revenue_currency, verified_mrr, verified_arr, verified_domain, fraud_risk";

export async function fetchListingGatesByStartupIds(
  startupIds: string[],
): Promise<Map<string, ListingGateRow>> {
  const map = new Map<string, ListingGateRow>();
  if (!isSupabaseConfigured() || startupIds.length === 0) return map;
  const { data, error } = await getSupabase()
    .from(TG)
    .select(GATE_COLUMNS)
    .in("startup_id", startupIds);
  if (error) throw error;
  for (const row of data ?? []) {
    map.set(row.startup_id as string, row as ListingGateRow);
  }
  return map;
}

export async function fetchPublicStartupRows(): Promise<StartupRow[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await getSupabase()
    .from(MC)
    .select(STARTUP_COLUMNS)
    .eq("visibility", "public")
    .eq("listing_lifecycle", "published")
    .eq("status", "published")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as StartupRow[];
}

export async function fetchPublicStartups(): Promise<Startup[]> {
  const rows = await fetchPublicStartupRows();
  const ids = rows.map((r) => r.id).filter(Boolean) as string[];
  const gates = await fetchListingGatesByStartupIds(ids);
  return rows.map((row) =>
    mapStartupRow(row, row.id ? gates.get(row.id) : undefined),
  );
}

/** Founder/seller-owned rows (any lifecycle); RLS allows own unlisted startups. */
export async function fetchStartupsForSlugs(
  slugs: string[],
): Promise<Startup[]> {
  if (!isSupabaseConfigured() || slugs.length === 0) return [];
  const { data, error } = await getSupabase()
    .from(MC)
    .select(STARTUP_COLUMNS)
    .in("slug", slugs)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapStartupRow(row as StartupRow));
}

export async function fetchStartupBySlug(
  slug: string,
): Promise<Startup | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await getSupabase()
    .from(MC)
    .select(STARTUP_COLUMNS)
    .eq("slug", slug)
    .eq("visibility", "public")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as StartupRow;
  const gates = row.id
    ? (await fetchListingGatesByStartupIds([row.id])).get(row.id)
    : undefined;
  return mapStartupRow(row, gates);
}

/** Public catalog or founder-owned row (RLS); use for listing detail pages. */
export async function fetchStartupBySlugWithAccess(
  slug: string,
): Promise<Startup | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await getSupabase()
    .from(MC)
    .select(STARTUP_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as StartupRow;
  const gates = row.id
    ? (await fetchListingGatesByStartupIds([row.id])).get(row.id)
    : undefined;
  return mapStartupRow(row, gates);
}
