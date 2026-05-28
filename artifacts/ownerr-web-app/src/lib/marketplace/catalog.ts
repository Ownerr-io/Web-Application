import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { mapStartupRow } from "@/lib/marketplace/mappers";
import type { Startup, StartupRow } from "@/lib/marketplace/types";

const STARTUP_COLUMNS =
  "id, slug, founder_user_id, founder_handle, title, tagline, description, industry, asking_price, currency, annual_revenue, profit, growth_rate, team_size, founded_year, verified, visibility, status, metadata, created_at, updated_at";

export async function fetchPublicStartupRows(): Promise<StartupRow[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await getSupabase()
    .from("startups")
    .select(STARTUP_COLUMNS)
    .eq("visibility", "public")
    .eq("status", "published")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as StartupRow[];
}

export async function fetchPublicStartups(): Promise<Startup[]> {
  const rows = await fetchPublicStartupRows();
  return rows.map(mapStartupRow);
}

export async function fetchStartupBySlug(
  slug: string,
): Promise<Startup | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await getSupabase()
    .from("startups")
    .select(STARTUP_COLUMNS)
    .eq("slug", slug)
    .eq("visibility", "public")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapStartupRow(data as StartupRow);
}
