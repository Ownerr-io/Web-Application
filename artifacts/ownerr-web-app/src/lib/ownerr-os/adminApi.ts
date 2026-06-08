import { getSupabase } from "@/lib/supabase/client";
import { SchemaTables as T } from "@/lib/supabase/schemaTables";
import { fetchFounderAnalytics } from "@/lib/founderService";
import type { FounderAnalytics } from "@/lib/founderTypes";

export type AdminOsListingRow = {
  id: string;
  owner_user_id: string;
  listing_type: string;
  title: string;
  description: string;
  industry: string | null;
  price_range: string | null;
  status: string;
  visibility: string;
  created_at: string;
  updated_at: string;
};

export async function fetchAllOsListings(): Promise<AdminOsListingRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(T.catalog.listings)
    .select(
      "id, owner_user_id, listing_type, title, description, industry, price_range, status, visibility, created_at, updated_at",
    )
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`fetchAllOsListings: ${error.message}`);
  return (data ?? []) as AdminOsListingRow[];
}

export type UpdateOsListingInput = {
  title?: string;
  description?: string;
  industry?: string | null;
  price_range?: string | null;
  status?: string;
  visibility?: string;
};

export async function updateOsListing(
  id: string,
  input: UpdateOsListingInput,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.rpc("admin_update_catalog_listing", {
    p_id: id,
    p_patch: input,
  });
  if (error) throw new Error(`updateOsListing: ${error.message}`);
}

export async function deleteOsListing(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.rpc("admin_update_catalog_listing", {
    p_id: id,
    p_patch: { status: "archived", visibility: "unlisted" },
  });
  if (error) throw new Error(`deleteOsListing: ${error.message}`);
}

export type CreateOsListingInput = {
  owner_user_id: string;
  title: string;
  description?: string;
  industry?: string;
  listing_type?: string;
};

export async function createOsListing(
  input: CreateOsListingInput,
): Promise<AdminOsListingRow> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(T.catalog.listings)
    .insert({
      owner_user_id: input.owner_user_id,
      title: input.title,
      description: input.description ?? "",
      industry: input.industry ?? null,
      listing_type: input.listing_type ?? "startup",
      status: "draft",
      visibility: "private",
    })
    .select(
      "id, owner_user_id, listing_type, title, description, industry, price_range, status, visibility, created_at, updated_at",
    )
    .single();
  if (error) throw new Error(`createOsListing: ${error.message}`);
  return data as AdminOsListingRow;
}

export async function fetchOsFounderAnalytics(
  adminKey?: string,
): Promise<FounderAnalytics> {
  return fetchFounderAnalytics(adminKey);
}
