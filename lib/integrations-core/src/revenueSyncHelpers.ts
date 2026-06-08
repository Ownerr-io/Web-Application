import type { VerifiedRevenueMetrics } from "./verifiedRevenueMetrics.js";
import {
  buildVerifiedRevenueMetrics,
  syncResultFromVerifiedRevenue,
} from "./verifiedRevenueMetrics.js";
import { getRevenueProviderCapabilities } from "./revenueProviderCatalog.js";
import type { FinancialMetricRow, SyncResult } from "./types.js";

export function finishRevenueSync(
  slug: string,
  metrics: VerifiedRevenueMetrics,
  opts?: {
    financialMetrics?: FinancialMetricRow[];
    verificationSummary?: Record<string, unknown>;
    lastError?: string;
    recordsWritten?: number;
  },
): SyncResult {
  const cap = getRevenueProviderCapabilities(slug);
  const useMrrLegacy = cap?.supports_mrr ?? false;
  const financialMetrics =
    opts?.financialMetrics ??
    (metrics.verification_status === "pass" &&
    metrics.verified_revenue_amount > 0
      ? [
          {
            periodStart: metrics.evidence_timestamp.slice(0, 8) + "01",
            periodEnd: metrics.evidence_timestamp.slice(0, 10),
            granularity: "month" as const,
            mrr: useMrrLegacy ? metrics.verified_revenue_amount : null,
            arr: metrics.annualized_revenue,
            netRevenue: metrics.verified_revenue_amount,
            refunds: null,
            currency: metrics.currency,
          },
        ]
      : []);

  return syncResultFromVerifiedRevenue(metrics, {
    ...opts,
    financialMetrics,
    verificationSummary: {
      provider: slug,
      revenue_class: cap?.revenueClass,
      ...opts?.verificationSummary,
    },
  });
}

export { buildVerifiedRevenueMetrics };
