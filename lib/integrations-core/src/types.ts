export type ProviderCategory =
  | "revenue"
  | "traffic"
  | "accounting"
  | "banking"
  | "domain";

export type SyncContext = {
  connectionId: string;
  startupId: string;
  providerSlug: string;
  secret: string;
  externalAccountId: string | null;
  syncCursor: Record<string, unknown>;
  jobPayload: Record<string, unknown>;
};

export type FinancialMetricRow = {
  periodStart: string;
  periodEnd: string;
  granularity: "day" | "month";
  mrr: number | null;
  arr: number | null;
  netRevenue: number | null;
  refunds: number | null;
  currency: string;
};

export type TrafficMetricRow = {
  periodStart: string;
  periodEnd: string;
  sessions: number | null;
  users: number | null;
  pageviews: number | null;
  source: string;
};

export type AccountingMetricRow = {
  periodStart: string;
  periodEnd: string;
  revenue: number | null;
  cogs: number | null;
  opex: number | null;
  netIncome: number | null;
  currency: string;
};

export type BankMetricRow = {
  periodStart: string;
  periodEnd: string;
  inflows: number | null;
  outflows: number | null;
  balanceAvg: number | null;
  currency: string;
};

export type SyncResult = {
  recordsWritten: number;
  verificationDimension?: ProviderCategory;
  verificationStatus?: "pass" | "fail" | "partial" | "pending";
  verificationSummary?: Record<string, unknown>;
  /** Provider-agnostic revenue evidence (gates + trust consume this). */
  verifiedRevenue?: import("./verifiedRevenueMetrics.js").VerifiedRevenueMetrics;
  financialMetrics?: FinancialMetricRow[];
  trafficMetrics?: TrafficMetricRow[];
  accountingMetrics?: AccountingMetricRow[];
  bankMetrics?: BankMetricRow[];
  connectionStatus: "connected" | "error" | "degraded";
  healthStatus: "healthy" | "degraded" | "unhealthy";
  lastError?: string;
  syncCursor?: Record<string, unknown>;
};

export interface ProviderAdapter {
  slug: string;
  category: ProviderCategory;
  sync(ctx: SyncContext): Promise<SyncResult>;
  healthCheck?(ctx: SyncContext): Promise<{ ok: boolean; message?: string }>;
}
