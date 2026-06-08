import type { ProviderAdapter, SyncContext, SyncResult } from "../types.js";
import {
  buildVerifiedRevenueMetrics,
  finishRevenueSync,
} from "../revenueSyncHelpers.js";

function basicAuthHeader(user: string, pass: string): Record<string, string> {
  return {
    Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`,
  };
}

async function fail(slug: string, message: string): Promise<SyncResult> {
  return finishRevenueSync(
    slug,
    buildVerifiedRevenueMetrics({
      source_provider: slug,
      verified_revenue_amount: 0,
      verification_status: "fail",
    }),
    { lastError: message, recordsWritten: 0 },
  );
}

export const chargebeeAdapter: ProviderAdapter = {
  slug: "chargebee",
  category: "revenue",
  async sync(ctx: SyncContext) {
    const site = ctx.externalAccountId?.trim();
    if (!site)
      return fail("chargebee", "Chargebee site name (subdomain) is required");
    const res = await fetch(
      `https://${site}.chargebee.com/api/v2/invoices?limit=50`,
      {
        headers: {
          ...basicAuthHeader(ctx.secret, ""),
          Accept: "application/json",
        },
      },
    );
    const json = (await res.json().catch(() => ({}))) as {
      list?: { invoice?: { total?: number; currency_code?: string } }[];
    };
    if (!res.ok) return fail("chargebee", `Chargebee HTTP ${res.status}`);
    let total = 0;
    let currency = "USD";
    let count = 0;
    for (const row of json.list ?? []) {
      total += Number(row.invoice?.total ?? 0) / 100;
      count += 1;
      if (row.invoice?.currency_code) currency = row.invoice.currency_code;
    }
    return finishRevenueSync(
      "chargebee",
      buildVerifiedRevenueMetrics({
        source_provider: "chargebee",
        verified_revenue_amount: total,
        currency,
        transaction_count: count,
      }),
      { recordsWritten: count },
    );
  },
};

export const recurlyAdapter: ProviderAdapter = {
  slug: "recurly",
  category: "revenue",
  async sync(ctx: SyncContext) {
    const sub = ctx.externalAccountId?.trim();
    if (!sub) return fail("recurly", "Recurly subdomain is required");
    const res = await fetch(
      `https://${sub}.recurly.com/v2/invoices?per_page=50`,
      {
        headers: {
          Authorization: ctx.secret,
          Accept: "application/xml",
        },
      },
    );
    if (!res.ok) return fail("recurly", `Recurly HTTP ${res.status}`);
    const text = await res.text();
    const amounts = [
      ...text.matchAll(
        /<total_in_cents type="integer">(\d+)<\/total_in_cents>/g,
      ),
    ];
    let total = 0;
    for (const m of amounts) total += Number(m[1] ?? 0) / 100;
    return finishRevenueSync(
      "recurly",
      buildVerifiedRevenueMetrics({
        source_provider: "recurly",
        verified_revenue_amount: total,
        transaction_count: amounts.length,
      }),
      { recordsWritten: amounts.length },
    );
  },
};

export const payuAdapter: ProviderAdapter = {
  slug: "payu",
  category: "revenue",
  async sync(ctx) {
    return fail(
      "payu",
      "PayU sync requires merchant credentials configured in PayU dashboard (coming soon)",
    );
  },
};

export const paypalAdapter: ProviderAdapter = {
  slug: "paypal",
  category: "revenue",
  async sync(ctx) {
    return fail(
      "paypal",
      "Connect PayPal via OAuth from Settings (OAuth flow not yet wired in this environment)",
    );
  },
};

export const squareAdapter: ProviderAdapter = {
  slug: "square",
  category: "revenue",
  async sync(ctx) {
    return fail(
      "square",
      "Connect Square via OAuth from Settings (OAuth flow not yet wired in this environment)",
    );
  },
};

export const woocommerceAdapter: ProviderAdapter = {
  slug: "woocommerce",
  category: "revenue",
  async sync(ctx) {
    const base = ctx.externalAccountId?.replace(/\/$/, "");
    const [key, secret] = ctx.secret.split(":");
    if (!base || !key || !secret) {
      return fail(
        "woocommerce",
        "Store URL and consumer_key:consumer_secret are required",
      );
    }
    const res = await fetch(
      `${base}/wp-json/wc/v3/orders?status=completed&per_page=50`,
      {
        headers: basicAuthHeader(key, secret),
      },
    );
    const json = (await res.json().catch(() => [])) as {
      total?: string;
      currency?: string;
    }[];
    if (!res.ok) return fail("woocommerce", `WooCommerce HTTP ${res.status}`);
    let total = 0;
    let currency = "USD";
    for (const o of json) {
      total += Number(o.total ?? 0);
      if (o.currency) currency = o.currency;
    }
    return finishRevenueSync(
      "woocommerce",
      buildVerifiedRevenueMetrics({
        source_provider: "woocommerce",
        verified_revenue_amount: total,
        currency,
        transaction_count: json.length,
      }),
      { recordsWritten: json.length },
    );
  },
};

export const bigcommerceAdapter: ProviderAdapter = {
  slug: "bigcommerce",
  category: "revenue",
  async sync(ctx) {
    const storeHash = ctx.externalAccountId?.trim();
    if (!storeHash) return fail("bigcommerce", "Store hash is required");
    const res = await fetch(
      `https://api.bigcommerce.com/stores/${storeHash}/v2/orders?limit=50`,
      {
        headers: {
          "X-Auth-Token": ctx.secret,
          Accept: "application/json",
        },
      },
    );
    const json = (await res.json().catch(() => [])) as {
      total_inc_tax?: string;
      currency_code?: string;
    }[];
    if (!res.ok) return fail("bigcommerce", `BigCommerce HTTP ${res.status}`);
    let total = 0;
    let currency = "USD";
    for (const o of json) {
      total += Number(o.total_inc_tax ?? 0);
      if (o.currency_code) currency = o.currency_code;
    }
    return finishRevenueSync(
      "bigcommerce",
      buildVerifiedRevenueMetrics({
        source_provider: "bigcommerce",
        verified_revenue_amount: total,
        currency,
        transaction_count: json.length,
      }),
      { recordsWritten: json.length },
    );
  },
};
