import type { ProviderAdapter, SyncContext, SyncResult } from "../types.js";
import {
  buildVerifiedRevenueMetrics,
  finishRevenueSync,
} from "../revenueSyncHelpers.js";

function accountingRevenueSync(
  slug: string,
  amount: number,
  currency: string,
  opts?: { recordsWritten?: number; lastError?: string; pass?: boolean },
): SyncResult {
  if (opts?.lastError) {
    return finishRevenueSync(
      slug,
      buildVerifiedRevenueMetrics({
        source_provider: slug,
        verified_revenue_amount: 0,
        verification_status: "fail",
      }),
      { lastError: opts.lastError, recordsWritten: 0 },
    );
  }
  const metrics = buildVerifiedRevenueMetrics({
    source_provider: slug,
    verified_revenue_amount: amount,
    currency,
    annualized_revenue: amount > 0 ? amount * 12 : null,
  });
  return finishRevenueSync(slug, metrics, {
    recordsWritten: opts?.recordsWritten ?? (amount > 0 ? 1 : 0),
    verificationSummary: { accounting_backed: true },
  });
}

function oauthBundle(ctx: SyncContext): Record<string, string> {
  try {
    return JSON.parse(ctx.secret) as Record<string, string>;
  } catch {
    return { access_token: ctx.secret };
  }
}

export const xeroAdapter: ProviderAdapter = {
  slug: "xero",
  category: "accounting",
  async sync(ctx) {
    const tokens = oauthBundle(ctx);
    const res = await fetch(
      "https://api.xero.com/api.xro/2.0/Reports/ProfitAndLoss",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: "application/json",
          "Xero-tenant-id": ctx.externalAccountId ?? "",
        },
      },
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return accountingRevenueSync("xero", 0, "USD", {
        lastError: `Xero HTTP ${res.status}`,
      });
    }
    const today = new Date().toISOString().slice(0, 10);
    const revenue = extractXeroRevenue(json);
    const result = accountingRevenueSync("xero", revenue, "USD", {
      recordsWritten: revenue > 0 ? 1 : 0,
    });
    return {
      ...result,
      accountingMetrics: [
        {
          periodStart: today.slice(0, 8) + "01",
          periodEnd: today,
          revenue,
          cogs: null,
          opex: null,
          netIncome: null,
          currency: "USD",
        },
      ],
    };
  },
};

export const quickbooksAdapter: ProviderAdapter = {
  slug: "quickbooks",
  category: "accounting",
  async sync(ctx) {
    const tokens = oauthBundle(ctx);
    const realmId = ctx.externalAccountId ?? "";
    const res = await fetch(
      `https://quickbooks.api.intuit.com/v3/company/${realmId}/reports/ProfitAndLoss?minorversion=65`,
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: "application/json",
        },
      },
    );
    if (!res.ok) {
      return accountingRevenueSync("quickbooks", 0, "USD", {
        lastError: `QuickBooks HTTP ${res.status}`,
      });
    }
    const body = (await res.json().catch(() => ({}))) as unknown;
    const revenue = extractQuickBooksRevenue(body);
    return accountingRevenueSync("quickbooks", revenue, "USD", {
      recordsWritten: revenue > 0 ? 1 : 0,
    });
  },
};

export const zohoBooksAdapter: ProviderAdapter = {
  slug: "zoho_books",
  category: "accounting",
  async sync(ctx) {
    const tokens = oauthBundle(ctx);
    const orgId = ctx.externalAccountId ?? "";
    const res = await fetch(
      `https://www.zohoapis.com/books/v3/chartofaccounts?organization_id=${orgId}`,
      {
        headers: { Authorization: `Zoho-oauthtoken ${tokens.access_token}` },
      },
    );
    if (!res.ok) {
      return accountingRevenueSync("zoho_books", 0, "USD", {
        lastError: `Zoho Books HTTP ${res.status}`,
      });
    }
    return accountingRevenueSync("zoho_books", 0, "USD", { recordsWritten: 0 });
  },
};

export const plaidAdapter: ProviderAdapter = {
  slug: "plaid",
  category: "banking",
  async sync(ctx) {
    const bundle = oauthBundle(ctx);
    const clientId = process.env.PLAID_CLIENT_ID ?? "";
    const secret = process.env.PLAID_SECRET ?? "";
    const res = await fetch("https://production.plaid.com/transactions/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        secret,
        access_token: bundle.access_token ?? ctx.secret,
        start_date: new Date(Date.now() - 30 * 864e5)
          .toISOString()
          .slice(0, 10),
        end_date: new Date().toISOString().slice(0, 10),
      }),
    });
    const json = (await res.json()) as {
      error_message?: string;
      transactions?: { amount: number }[];
    };
    if (!res.ok) {
      return accountingRevenueSync("plaid", 0, "USD", {
        lastError: json.error_message ?? `Plaid HTTP ${res.status}`,
      });
    }
    const inflows = (json.transactions ?? [])
      .filter((t) => t.amount < 0)
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    const outflows = (json.transactions ?? [])
      .filter((t) => t.amount > 0)
      .reduce((s, t) => s + t.amount, 0);
    const start = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const result = finishRevenueSync(
      "plaid",
      buildVerifiedRevenueMetrics({
        source_provider: "plaid",
        verified_revenue_amount: inflows,
        currency: "USD",
        transaction_count: json.transactions?.length ?? 0,
      }),
      { recordsWritten: json.transactions?.length ?? 0 },
    );
    return {
      ...result,
      bankMetrics: [
        {
          periodStart: start,
          periodEnd: new Date().toISOString().slice(0, 10),
          inflows,
          outflows,
          balanceAvg: null,
          currency: "USD",
        },
      ],
    };
  },
};

export const tinkAdapter: ProviderAdapter = {
  slug: "tink",
  category: "banking",
  async sync(ctx) {
    const tokens = oauthBundle(ctx);
    const res = await fetch("https://api.tink.com/data/v2/transactions", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const json = (await res.json().catch(() => ({}))) as {
      transactions?: { amount?: { value?: { unscaledValue?: string } } }[];
    };
    if (!res.ok) {
      return finishRevenueSync(
        "tink",
        buildVerifiedRevenueMetrics({
          source_provider: "tink",
          verified_revenue_amount: 0,
          verification_status: "fail",
        }),
        { lastError: `Tink HTTP ${res.status}`, recordsWritten: 0 },
      );
    }
    let inflows = 0;
    let count = 0;
    for (const t of json.transactions ?? []) {
      const raw = Number(t.amount?.value?.unscaledValue ?? 0);
      if (raw > 0) {
        inflows += raw / 100;
        count += 1;
      }
    }
    return finishRevenueSync(
      "tink",
      buildVerifiedRevenueMetrics({
        source_provider: "tink",
        verified_revenue_amount: inflows,
        transaction_count: count,
      }),
      { recordsWritten: count },
    );
  },
};

export const diroAdapter: ProviderAdapter = {
  slug: "diro",
  category: "banking",
  async sync(ctx) {
    const res = await fetch("https://api.diro.io/v1/verify/status", {
      headers: { Authorization: `Bearer ${ctx.secret}` },
    });
    if (!res.ok) {
      return {
        recordsWritten: 0,
        connectionStatus: "error",
        healthStatus: "unhealthy",
        lastError: `Diro HTTP ${res.status}`,
      };
    }
    return {
      recordsWritten: 1,
      verificationDimension: "banking",
      verificationStatus: "pass",
      connectionStatus: "connected",
      healthStatus: "healthy",
    };
  },
};

export const shopifyAdapter: ProviderAdapter = {
  slug: "shopify",
  category: "revenue",
  async sync(ctx) {
    const tokens = oauthBundle(ctx);
    const shop = (ctx.externalAccountId ?? "").trim();
    if (!shop) {
      return finishRevenueSync(
        "shopify",
        buildVerifiedRevenueMetrics({
          source_provider: "shopify",
          verified_revenue_amount: 0,
          verification_status: "fail",
        }),
        {
          lastError: "Shopify shop domain is required (myshop.myshopify.com)",
          recordsWritten: 0,
        },
      );
    }
    let res;
    try {
      res = await fetch(
        `https://${shop}/admin/api/2024-04/orders.json?status=any&limit=50`,
        {
          headers: {
            "X-Shopify-Access-Token": tokens.access_token ?? ctx.secret,
          },
        },
      );
    } catch (e) {
      return finishRevenueSync(
        "shopify",
        buildVerifiedRevenueMetrics({
          source_provider: "shopify",
          verified_revenue_amount: 0,
          verification_status: "fail",
        }),
        {
          lastError: e instanceof Error ? e.message : "Shopify request failed",
          recordsWritten: 0,
        },
      );
    }
    const json = (await res.json()) as {
      orders?: { total_price?: string; currency?: string }[];
    };
    if (!res.ok) {
      return finishRevenueSync(
        "shopify",
        buildVerifiedRevenueMetrics({
          source_provider: "shopify",
          verified_revenue_amount: 0,
          verification_status: "fail",
        }),
        { lastError: `Shopify HTTP ${res.status}`, recordsWritten: 0 },
      );
    }
    let total = 0;
    let currency = "USD";
    for (const o of json.orders ?? []) {
      total += Number(o.total_price ?? 0);
      if (o.currency) currency = o.currency;
    }
    const metrics = buildVerifiedRevenueMetrics({
      source_provider: "shopify",
      verified_revenue_amount: total,
      currency,
      transaction_count: json.orders?.length ?? 0,
    });
    return finishRevenueSync("shopify", metrics, {
      recordsWritten: json.orders?.length ?? 0,
    });
  },
};

function extractXeroRevenue(json: unknown): number {
  const rows = (
    json as {
      Reports?: { Rows?: { Rows?: { Cells?: { Value?: string }[] }[] }[] }[];
    }
  )?.Reports?.[0]?.Rows;
  if (!rows) return 0;
  for (const section of rows) {
    for (const row of section.Rows ?? []) {
      const label = row.Cells?.[0]?.Value?.toLowerCase() ?? "";
      if (label.includes("total income") || label.includes("total revenue")) {
        const raw = row.Cells?.[1]?.Value ?? "0";
        return Math.abs(Number(String(raw).replace(/[^0-9.-]/g, "")) || 0);
      }
    }
  }
  return 0;
}

function extractQuickBooksRevenue(json: unknown): number {
  const rows = (
    json as {
      Rows?: { Row?: { ColData?: { value?: string }[]; type?: string }[] };
    }
  )?.Rows?.Row;
  if (!rows) return 0;
  for (const row of rows) {
    const label = row.ColData?.[0]?.value?.toLowerCase() ?? "";
    if (label.includes("total income") || label.includes("total revenue")) {
      const raw = row.ColData?.[1]?.value ?? "0";
      return Math.abs(Number(String(raw).replace(/[^0-9.-]/g, "")) || 0);
    }
  }
  return 0;
}
