import type { FinancialMetricRow, SyncResult } from "./types.js";

export type RevenueVerificationStatus = "pass" | "partial" | "fail" | "pending";

/** Normalized revenue evidence consumed by gates, trust, and publish logic. */
export type VerifiedRevenueMetrics = {
  verified_revenue_amount: number;
  annualized_revenue: number | null;
  customer_count: number | null;
  transaction_count: number | null;
  currency: string;
  verification_status: RevenueVerificationStatus;
  source_provider: string;
  evidence_timestamp: string;
};

export type RevenueProviderClass =
  | "subscription"
  | "transaction"
  | "commerce"
  | "accounting"
  | "banking";

export type RevenueProviderCapabilities = {
  slug: string;
  displayName: string;
  revenueClass: RevenueProviderClass;
  authType: "api_key" | "oauth2" | "link";
  supports_mrr: boolean;
  supports_arr: boolean;
  supports_transactions: boolean;
  supports_customers: boolean;
  requiresExternalAccount?: boolean;
  externalAccountLabel?: string;
  apiKeyPlaceholder?: string;
  apiKeyHint?: string;
  connectDescription?: string;
  partialHint?: string;
};

export function buildVerifiedRevenueMetrics(input: {
  source_provider: string;
  verified_revenue_amount: number;
  currency?: string;
  annualized_revenue?: number | null;
  customer_count?: number | null;
  transaction_count?: number | null;
  verification_status?: RevenueVerificationStatus;
  evidence_timestamp?: string;
}): VerifiedRevenueMetrics {
  const amount = Math.max(0, Number(input.verified_revenue_amount) || 0);
  const status: RevenueVerificationStatus =
    input.verification_status ?? (amount > 0 ? "pass" : "partial");
  return {
    verified_revenue_amount: amount,
    annualized_revenue:
      input.annualized_revenue != null
        ? Number(input.annualized_revenue)
        : amount > 0
          ? amount * 12
          : null,
    customer_count:
      input.customer_count != null ? Number(input.customer_count) : null,
    transaction_count:
      input.transaction_count != null ? Number(input.transaction_count) : null,
    currency: (input.currency ?? "USD").toUpperCase(),
    verification_status: status,
    source_provider: input.source_provider,
    evidence_timestamp: input.evidence_timestamp ?? new Date().toISOString(),
  };
}

/** Maps normalized metrics into worker SyncResult (+ optional legacy financial_metrics). */
export function syncResultFromVerifiedRevenue(
  metrics: VerifiedRevenueMetrics,
  opts?: {
    financialMetrics?: FinancialMetricRow[];
    verificationSummary?: Record<string, unknown>;
    connectionStatus?: SyncResult["connectionStatus"];
    healthStatus?: SyncResult["healthStatus"];
    lastError?: string;
    recordsWritten?: number;
  },
): SyncResult {
  const pass =
    metrics.verification_status === "pass" &&
    metrics.verified_revenue_amount > 0;

  return {
    recordsWritten: opts?.recordsWritten ?? (pass ? 1 : 0),
    verificationDimension: "revenue",
    verificationStatus: metrics.verification_status,
    verificationSummary: {
      ...(opts?.verificationSummary ?? {}),
      verified_revenue: metrics,
    },
    verifiedRevenue: metrics,
    financialMetrics: opts?.financialMetrics,
    connectionStatus:
      opts?.connectionStatus ?? (pass ? "connected" : "degraded"),
    healthStatus:
      opts?.healthStatus ??
      (metrics.verification_status === "fail"
        ? "unhealthy"
        : pass
          ? "healthy"
          : "degraded"),
    lastError: opts?.lastError,
  };
}
