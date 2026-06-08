import type { ProviderAdapter, SyncContext, SyncResult } from "../types.js";
import {
  buildVerifiedRevenueMetrics,
  finishRevenueSync,
} from "../revenueSyncHelpers.js";

async function apiKeySync(
  ctx: SyncContext,
  slug: string,
  opts: {
    url: string;
    headers: Record<string, string>;
    parse: (json: unknown) => {
      amount: number;
      currency?: string;
      transaction_count?: number;
      customer_count?: number;
      annualized?: number | null;
    };
  },
): Promise<SyncResult> {
  const res = await fetch(opts.url, { headers: opts.headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof json === "object" &&
      json &&
      "error" in json &&
      typeof (json as { error: unknown }).error === "string"
        ? (json as { error: string }).error
        : `HTTP ${res.status}`;
    return finishRevenueSync(
      slug,
      buildVerifiedRevenueMetrics({
        source_provider: slug,
        verified_revenue_amount: 0,
        verification_status: "fail",
      }),
      { lastError: msg, recordsWritten: 0 },
    );
  }
  const parsed = opts.parse(json);
  const metrics = buildVerifiedRevenueMetrics({
    source_provider: slug,
    verified_revenue_amount: parsed.amount,
    currency: parsed.currency,
    annualized_revenue: parsed.annualized,
    transaction_count: parsed.transaction_count,
    customer_count: parsed.customer_count,
  });
  return finishRevenueSync(slug, metrics, {
    recordsWritten: parsed.amount > 0 ? 1 : 0,
  });
}

function parsePaddleTransactions(json: unknown): {
  amount: number;
  currency?: string;
  transaction_count?: number;
  annualized?: number | null;
} {
  const data = (json as { data?: Record<string, unknown>[] }).data ?? [];
  const countable = new Set(["completed", "billed", "paid", "ready"]);
  let totalMinor = 0;
  let currency = "USD";
  let count = 0;
  for (const row of data) {
    const status = String(row.status ?? "").toLowerCase();
    if (status && !countable.has(status)) continue;
    const details = row.details as
      | {
          totals?: {
            grand_total?: string;
            total?: string;
            currency_code?: string;
          };
        }
      | undefined;
    const totals = details?.totals;
    const raw = totals?.grand_total ?? totals?.total ?? "0";
    const minor = Number(raw);
    if (!Number.isFinite(minor) || minor <= 0) continue;
    totalMinor += minor;
    count += 1;
    if (totals?.currency_code) currency = totals.currency_code;
  }
  const amount = totalMinor / 100;
  return {
    amount,
    currency,
    transaction_count: count,
    annualized: amount > 0 ? amount * 12 : null,
  };
}

export const paddleAdapter: ProviderAdapter = {
  slug: "paddle",
  category: "revenue",
  async sync(ctx) {
    return apiKeySync(ctx, "paddle", {
      url: "https://api.paddle.com/transactions?per_page=50&status=completed,billed,paid",
      headers: {
        Authorization: `Bearer ${ctx.secret}`,
        "Content-Type": "application/json",
      },
      parse: parsePaddleTransactions,
    });
  },
};

export const lemonsqueezyAdapter: ProviderAdapter = {
  slug: "lemonsqueezy",
  category: "revenue",
  async sync(ctx) {
    const ordersRes = await fetch(
      "https://api.lemonsqueezy.com/v1/orders?page[size]=50",
      {
        headers: {
          Authorization: `Bearer ${ctx.secret}`,
          Accept: "application/vnd.api+json",
        },
      },
    );
    const json = await ordersRes.json().catch(() => ({}));
    if (!ordersRes.ok) {
      return finishRevenueSync(
        "lemonsqueezy",
        buildVerifiedRevenueMetrics({
          source_provider: "lemonsqueezy",
          verified_revenue_amount: 0,
          verification_status: "fail",
        }),
        {
          lastError: `Lemon Squeezy HTTP ${ordersRes.status}`,
          recordsWritten: 0,
        },
      );
    }
    const rows =
      (
        json as {
          data?: { attributes?: { total?: number; currency?: string } }[];
        }
      ).data ?? [];
    let total = 0;
    let currency = "USD";
    for (const row of rows) {
      const cents = Number(row.attributes?.total ?? 0);
      total += cents / 100;
      if (row.attributes?.currency) currency = row.attributes.currency;
    }
    const metrics = buildVerifiedRevenueMetrics({
      source_provider: "lemonsqueezy",
      verified_revenue_amount: total,
      currency,
      transaction_count: rows.length,
    });
    return finishRevenueSync("lemonsqueezy", metrics, {
      recordsWritten: rows.length,
    });
  },
};

export const revenuecatAdapter: ProviderAdapter = {
  slug: "revenuecat",
  category: "revenue",
  async sync(ctx) {
    const projectId = ctx.externalAccountId ?? ctx.syncCursor.project_id;
    if (!projectId || typeof projectId !== "string") {
      return finishRevenueSync(
        "revenuecat",
        buildVerifiedRevenueMetrics({
          source_provider: "revenuecat",
          verified_revenue_amount: 0,
          verification_status: "fail",
        }),
        {
          lastError: "RevenueCat requires project ID (external account)",
          recordsWritten: 0,
        },
      );
    }
    return apiKeySync(ctx, "revenuecat", {
      url: `https://api.revenuecat.com/v2/projects/${projectId}/metrics/overview`,
      headers: {
        Authorization: `Bearer ${ctx.secret}`,
        "Content-Type": "application/json",
      },
      parse(json) {
        const mrr = Number(
          (json as { mrr?: number; metrics?: { mrr?: number } }).mrr ??
            (json as { metrics?: { mrr?: number } }).metrics?.mrr ??
            0,
        );
        return {
          amount: mrr,
          annualized: mrr > 0 ? mrr * 12 : null,
        };
      },
    });
  },
};

export const razorpayAdapter: ProviderAdapter = {
  slug: "razorpay",
  category: "revenue",
  async sync(ctx) {
    const [keyId, keySecret] = ctx.secret.split(":");
    if (!keyId || !keySecret) {
      return finishRevenueSync(
        "razorpay",
        buildVerifiedRevenueMetrics({
          source_provider: "razorpay",
          verified_revenue_amount: 0,
          verification_status: "fail",
        }),
        {
          lastError: "Razorpay secret must be key_id:key_secret",
          recordsWritten: 0,
        },
      );
    }
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    return apiKeySync(ctx, "razorpay", {
      url: "https://api.razorpay.com/v1/payments?count=100",
      headers: { Authorization: `Basic ${auth}` },
      parse(json) {
        const items =
          (
            json as {
              items?: { amount?: number; currency?: string; status?: string }[];
            }
          ).items ?? [];
        let total = 0;
        let currency = "INR";
        let count = 0;
        for (const p of items) {
          if (p.status !== "captured") continue;
          total += Number(p.amount ?? 0) / 100;
          count += 1;
          if (p.currency) currency = p.currency;
        }
        return { amount: total, currency, transaction_count: count };
      },
    });
  },
};
