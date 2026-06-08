import type { ProviderAdapter, SyncContext, SyncResult } from "../types.js";
import {
  buildVerifiedRevenueMetrics,
  finishRevenueSync,
} from "../revenueSyncHelpers.js";

function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7) + "-01";
}

export const stripeAdapter: ProviderAdapter = {
  slug: "stripe",
  category: "revenue",
  async sync(ctx: SyncContext): Promise<SyncResult> {
    const key = ctx.secret.trim();
    const res = await fetch(
      "https://api.stripe.com/v1/balance_transactions?limit=100",
      {
        headers: { Authorization: `Bearer ${key}` },
      },
    );
    const body = (await res.json()) as {
      error?: { message: string };
      data?: { amount: number; type: string; created: number }[];
    };
    if (!res.ok) {
      return finishRevenueSync(
        "stripe",
        buildVerifiedRevenueMetrics({
          source_provider: "stripe",
          verified_revenue_amount: 0,
          verification_status: "fail",
        }),
        {
          lastError: body.error?.message ?? `Stripe HTTP ${res.status}`,
          recordsWritten: 0,
        },
      );
    }

    const byMonth = new Map<string, number>();
    let txCount = 0;
    for (const tx of body.data ?? []) {
      if (tx.type === "payout") continue;
      txCount += 1;
      const d = new Date(tx.created * 1000);
      const k = monthKey(d);
      byMonth.set(k, (byMonth.get(k) ?? 0) + tx.amount / 100);
    }

    const amounts = [...byMonth.values()];
    const latest = amounts.length > 0 ? amounts[amounts.length - 1]! : 0;

    const metrics = buildVerifiedRevenueMetrics({
      source_provider: "stripe",
      verified_revenue_amount: latest,
      annualized_revenue: latest > 0 ? latest * 12 : null,
      transaction_count: txCount,
      currency: "USD",
    });

    const financialMetrics = [...byMonth.entries()].map(
      ([periodStart, netRevenue]) => {
        const end = new Date(periodStart);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        return {
          periodStart,
          periodEnd: end.toISOString().slice(0, 10),
          granularity: "month" as const,
          mrr: netRevenue,
          arr: netRevenue * 12,
          netRevenue,
          refunds: null,
          currency: "USD",
        };
      },
    );

    return finishRevenueSync("stripe", metrics, {
      financialMetrics,
      recordsWritten: financialMetrics.length,
    });
  },
};
