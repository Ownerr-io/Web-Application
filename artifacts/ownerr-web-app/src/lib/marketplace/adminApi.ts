import { getSupabase } from "@/lib/supabase/client";
import { SchemaTables as T } from "@/lib/supabase/schemaTables";
import type { StartupRow } from "@/lib/marketplace/types";

const COMPANIES = T.marketplace.companies;

const STARTUP_COLUMNS =
  "id, slug, founder_user_id, founder_handle, title, tagline, description, industry, asking_price, currency, annual_revenue, profit, growth_rate, team_size, founded_year, verified, visibility, status, metadata, created_at, updated_at";

export type AdminSubmissionRow = {
  id: string;
  founder_user_id: string | null;
  title: string;
  sector: string | null;
  pitch: string;
  stage: string | null;
  score: number | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export async function fetchAllMarketplaceListings(): Promise<StartupRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(COMPANIES)
    .select(STARTUP_COLUMNS)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`fetchAllMarketplaceListings: ${error.message}`);
  return (data ?? []) as StartupRow[];
}

export async function fetchAllMarketplaceSubmissions(): Promise<
  AdminSubmissionRow[]
> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("submissions")
    .select(
      "id, founder_user_id, title, sector, pitch, stage, score, status, created_at, updated_at",
    )
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(`fetchAllMarketplaceSubmissions: ${error.message}`);
  }
  return (data ?? []) as AdminSubmissionRow[];
}

export type UpdateMarketplaceListingInput = {
  title?: string;
  description?: string;
  industry?: string | null;
  asking_price?: number | null;
  status?: string;
  visibility?: string;
  verified?: boolean;
};

export async function updateMarketplaceListing(
  id: string,
  input: UpdateMarketplaceListingInput,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from(COMPANIES)
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`updateMarketplaceListing: ${error.message}`);
}

export async function deleteMarketplaceListing(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from(COMPANIES)
    .update({ status: "archived", visibility: "unlisted" })
    .eq("id", id);
  if (error) throw new Error(`deleteMarketplaceListing: ${error.message}`);
}

export type CreateMarketplaceListingInput = {
  slug: string;
  title: string;
  description: string;
  industry?: string;
  asking_price?: number;
  founder_handle?: string;
};

export async function createMarketplaceListing(
  input: CreateMarketplaceListingInput,
): Promise<StartupRow> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(COMPANIES)
    .insert({
      slug: input.slug,
      title: input.title,
      description: input.description,
      industry: input.industry ?? null,
      asking_price: input.asking_price ?? null,
      founder_handle: input.founder_handle ?? "admin",
      status: "draft",
      visibility: "unlisted",
    })
    .select(STARTUP_COLUMNS)
    .single();
  if (error) throw new Error(`createMarketplaceListing: ${error.message}`);
  return data as StartupRow;
}

export type UpdateSubmissionInput = {
  title?: string;
  sector?: string | null;
  pitch?: string;
  stage?: string | null;
  status?: string;
  score?: number | null;
};

export async function updateMarketplaceSubmission(
  id: string,
  input: UpdateSubmissionInput,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("submissions")
    .update(input)
    .eq("id", id);
  if (error) throw new Error(`updateMarketplaceSubmission: ${error.message}`);
}

export async function deleteMarketplaceSubmission(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("submissions")
    .update({ status: "archived" })
    .eq("id", id);
  if (error) throw new Error(`deleteMarketplaceSubmission: ${error.message}`);
}
