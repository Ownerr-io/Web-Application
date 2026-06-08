import type { Category } from "@/lib/marketplace/types";
import type { DomainDnsProviderId } from "@/lib/marketplace/domainDnsProviders";

export type BusinessProofType =
  | "analytics"
  | "revenue"
  | "accounting"
  | "bank"
  | "other";

export type ApiAccessType = "public" | "private" | "limited";

export type SellerIntakePayload = {
  slug?: string;
  company_name: string;
  founder_name: string;
  founder_email: string;
  founder_linkedin?: string;
  founder_role?: string;
  monthly_visitors?: string;
  traffic_source?: string;
  analytics_platform?: string;
  declared_domain: string;
  domain_registrar?: string;
  dns_provider?: DomainDnsProviderId | "";
  nameserver_1?: string;
  nameserver_2?: string;
  dns_record_acknowledged?: boolean;
  api_available?: boolean;
  api_documentation_url?: string;
  api_base_url?: string;
  api_access_type?: ApiAccessType | "";
  accounting_software?: string;
  tax_id?: string;
  accounting_api_url?: string;
  industry: Category | string;
  sub_category?: string;
  business_model?: string;
  currency: string;
  one_line_pitch: string;
  description: string;
  reported_monthly_revenue_usd?: string;
  reported_monthly_profit_usd?: string;
  revenue_model?: string;
  revenue_source?: string;
  gross_margin_pct?: string;
  revenue_api_url?: string;
  revenue_since?: string;
  tech_frontend?: string;
  tech_backend?: string;
  tech_database?: string;
  tech_hosting?: string;
  tech_other?: string;
  asking_price_usd: string;
  reason_for_selling?: string;
  transition_support?: string;
  legal_status?: string;
  founded_year?: string;
};

export const SELLER_INTAKE_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "INR",
  "AUD",
  "CAD",
  "SGD",
] as const;

export const SELLER_FOUNDER_ROLES = [
  "CEO / Founder",
  "Co-founder",
  "CTO",
  "COO",
  "Other",
] as const;

export const SELLER_TRAFFIC_SOURCES = [
  "Organic",
  "Paid ads",
  "Social",
  "Referral",
  "Partnerships",
  "App store",
  "Other",
] as const;

export const SELLER_REVENUE_MODELS = [
  "Subscription",
  "Ads",
  "Product",
  "Service",
  "Other",
] as const;

export const SELLER_REASONS_FOR_SELLING = [
  "New venture",
  "Burnout",
  "Strategic exit",
  "Life change",
  "Other",
] as const;

export function emptySellerIntake(): SellerIntakePayload {
  return {
    company_name: "",
    founder_name: "",
    founder_email: "",
    declared_domain: "",
    industry: "SaaS",
    currency: "USD",
    one_line_pitch: "",
    description: "",
    asking_price_usd: "",
    dns_record_acknowledged: false,
    api_available: false,
  };
}

export function sellerIntakeToRpcPayload(
  intake: SellerIntakePayload,
): Record<string, unknown> {
  return { ...intake };
}
