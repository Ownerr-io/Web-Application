import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type {
  BusinessProofType,
  SellerIntakePayload,
} from "@/lib/marketplace/sellerIntakeTypes";
import { sellerIntakeToRpcPayload } from "@/lib/marketplace/sellerIntakeTypes";

const PROOF_BUCKET = "listing-business-proofs";

export type SaveSellerIntakeResult = {
  startupId: string;
  slug: string;
  finalized: boolean;
};

export async function saveSellerIntake(
  intake: SellerIntakePayload,
  finalize: boolean,
): Promise<SaveSellerIntakeResult> {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured");

  const { data, error } = await getSupabase().rpc(
    "founder_save_seller_intake",
    {
      p_payload: sellerIntakeToRpcPayload(intake),
      p_finalize: finalize,
    },
  );
  if (error) throw new Error(error.message);

  const row = (data ?? {}) as Record<string, unknown>;
  const startupId = String(row.startup_id ?? "");
  const slug = String(row.slug ?? "");
  if (!startupId || !slug) throw new Error("Could not save listing intake");

  return {
    startupId,
    slug,
    finalized: Boolean(row.finalized),
  };
}

export async function fetchSellerIntakeBySlug(
  slug: string,
): Promise<(SellerIntakePayload & { startupId: string; slug: string }) | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await getSupabase().rpc("founder_get_seller_intake", {
    p_slug: slug,
  });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object") return null;

  const root = data as Record<string, unknown>;
  const intake = (root.intake ?? {}) as Record<string, unknown>;

  return {
    startupId: String(root.startup_id),
    slug: String(root.slug),
    company_name: String(root.company_name ?? ""),
    one_line_pitch: String(root.one_line_pitch ?? ""),
    description: String(root.description ?? ""),
    industry: String(root.industry ?? "SaaS"),
    business_model: String(root.business_model ?? ""),
    currency: String(root.currency ?? "USD"),
    founded_year: root.founded_year != null ? String(root.founded_year) : "",
    asking_price_usd:
      root.asking_price_usd != null ? String(root.asking_price_usd) : "",
    founder_name: String(intake.founder_name ?? ""),
    founder_email: String(intake.founder_email ?? ""),
    founder_linkedin: String(intake.founder_linkedin ?? ""),
    founder_role: String(intake.founder_role ?? ""),
    monthly_visitors:
      intake.monthly_visitors != null ? String(intake.monthly_visitors) : "",
    traffic_source: String(intake.traffic_source ?? ""),
    analytics_platform: String(intake.analytics_platform ?? ""),
    declared_domain: String(intake.declared_domain ?? ""),
    domain_registrar: String(intake.domain_registrar ?? ""),
    dns_provider: (intake.dns_provider
      ? String(intake.dns_provider)
      : "") as SellerIntakePayload["dns_provider"],
    nameserver_1: String(intake.nameserver_1 ?? ""),
    nameserver_2: String(intake.nameserver_2 ?? ""),
    dns_record_acknowledged: Boolean(intake.dns_txt_acknowledged_at),
    api_available: Boolean(intake.api_available),
    api_documentation_url: String(intake.api_documentation_url ?? ""),
    api_base_url: String(intake.api_base_url ?? ""),
    api_access_type: String(
      intake.api_access_type ?? "",
    ) as SellerIntakePayload["api_access_type"],
    accounting_software: String(intake.accounting_software ?? ""),
    tax_id: String(intake.tax_id ?? ""),
    accounting_api_url: String(intake.accounting_api_url ?? ""),
    sub_category: String(intake.sub_category ?? ""),
    reported_monthly_revenue_usd:
      intake.reported_monthly_revenue_usd != null
        ? String(intake.reported_monthly_revenue_usd)
        : "",
    reported_monthly_profit_usd:
      intake.reported_monthly_profit_usd != null
        ? String(intake.reported_monthly_profit_usd)
        : "",
    revenue_model: String(intake.revenue_model ?? ""),
    revenue_source: String(intake.revenue_source ?? ""),
    gross_margin_pct:
      intake.gross_margin_pct != null ? String(intake.gross_margin_pct) : "",
    revenue_api_url: String(intake.revenue_api_url ?? ""),
    revenue_since: intake.revenue_since ? String(intake.revenue_since) : "",
    tech_frontend: String(intake.tech_frontend ?? ""),
    tech_backend: String(intake.tech_backend ?? ""),
    tech_database: String(intake.tech_database ?? ""),
    tech_hosting: String(intake.tech_hosting ?? ""),
    tech_other: String(intake.tech_other ?? ""),
    reason_for_selling: String(intake.reason_for_selling ?? ""),
    transition_support: String(intake.transition_support ?? ""),
    legal_status: String(intake.legal_status ?? ""),
  };
}

export async function uploadBusinessProof(
  startupId: string,
  proofType: BusinessProofType,
  file: File,
): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured");

  const { data: alloc, error: allocErr } = await getSupabase().rpc(
    "storage_create_upload_url",
    {
      p_bucket: PROOF_BUCKET,
      p_filename: file.name,
      p_mime_type: file.type || "application/pdf",
      p_startup_id: startupId,
    },
  );
  if (allocErr) throw new Error(allocErr.message);
  const path = String((alloc as { objectPath?: string }).objectPath ?? "");
  if (!path) throw new Error("Upload path not allocated");

  const { error: uploadErr } = await getSupabase()
    .storage.from(PROOF_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (uploadErr) throw new Error(uploadErr.message);

  const { error: regErr } = await getSupabase().rpc(
    "founder_register_business_proof",
    {
      p_startup_id: startupId,
      p_proof_type: proofType,
      p_storage_path: path,
      p_file_name: file.name,
      p_mime_type: file.type || null,
      p_byte_size: file.size,
    },
  );
  if (regErr) throw new Error(regErr.message);
}

export async function uploadBusinessProofs(
  startupId: string,
  files: Partial<Record<BusinessProofType, File | null>>,
): Promise<void> {
  const entries = Object.entries(files).filter(
    (pair): pair is [BusinessProofType, File] => pair[1] instanceof File,
  );
  for (const [type, file] of entries) {
    await uploadBusinessProof(startupId, type, file);
  }
}
