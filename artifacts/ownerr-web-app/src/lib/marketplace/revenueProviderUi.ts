export type RevenueProviderClass =
  | "subscription"
  | "transaction"
  | "commerce"
  | "accounting"
  | "banking";

export type RevenueProviderUiMeta = {
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
  satisfiesRevenueGate?: boolean;
};

const CLASS_LABEL: Record<RevenueProviderClass, string> = {
  subscription: "Subscription billing",
  transaction: "Payments & transactions",
  commerce: "Commerce & storefronts",
  accounting: "Accounting",
  banking: "Banking & cash flow",
};

export function revenueClassLabel(c: RevenueProviderClass): string {
  return CLASS_LABEL[c];
}

/** Static UI catalog — kept in sync with lib/integrations-core revenueProviderCatalog. */
const catalog: RevenueProviderUiMeta[] = [
  {
    slug: "stripe",
    displayName: "Stripe",
    revenueClass: "subscription",
    authType: "api_key",
    supports_mrr: true,
    supports_arr: true,
    supports_transactions: true,
    supports_customers: true,
    apiKeyPlaceholder: "sk_live_… or sk_test_…",
    apiKeyHint: "Secret key from Stripe Dashboard → Developers → API keys.",
    connectDescription:
      "We aggregate recent balance transactions into verified revenue for your listing.",
    partialHint:
      "Sync succeeded but verified revenue is still $0. Use the same account where charges appear.",
  },
  {
    slug: "paddle",
    displayName: "Paddle",
    revenueClass: "subscription",
    authType: "api_key",
    supports_mrr: true,
    supports_arr: true,
    supports_transactions: true,
    supports_customers: false,
    apiKeyPlaceholder: "Paddle Billing API key",
    connectDescription:
      "Transaction totals from Paddle become verified revenue.",
  },
  {
    slug: "revenuecat",
    displayName: "RevenueCat",
    revenueClass: "subscription",
    authType: "api_key",
    supports_mrr: true,
    supports_arr: true,
    supports_transactions: false,
    supports_customers: true,
    requiresExternalAccount: true,
    externalAccountLabel: "Project ID",
    apiKeyPlaceholder: "RevenueCat secret API key",
    connectDescription: "Subscription metrics from your RevenueCat project.",
  },
  {
    slug: "chargebee",
    displayName: "Chargebee",
    revenueClass: "subscription",
    authType: "api_key",
    supports_mrr: true,
    supports_arr: true,
    supports_transactions: true,
    supports_customers: true,
    requiresExternalAccount: true,
    externalAccountLabel: "Site name (subdomain)",
    apiKeyPlaceholder: "Chargebee API key",
  },
  {
    slug: "recurly",
    displayName: "Recurly",
    revenueClass: "subscription",
    authType: "api_key",
    supports_mrr: true,
    supports_arr: true,
    supports_transactions: true,
    supports_customers: true,
    requiresExternalAccount: true,
    externalAccountLabel: "Subdomain",
    apiKeyPlaceholder: "Recurly private API key",
  },
  {
    slug: "lemonsqueezy",
    displayName: "Lemon Squeezy",
    revenueClass: "subscription",
    authType: "api_key",
    supports_mrr: false,
    supports_arr: false,
    supports_transactions: true,
    supports_customers: false,
    apiKeyPlaceholder: "Lemon Squeezy API key",
    connectDescription: "Verified revenue from recent store orders.",
  },
  {
    slug: "razorpay",
    displayName: "Razorpay",
    revenueClass: "transaction",
    authType: "api_key",
    supports_mrr: false,
    supports_arr: false,
    supports_transactions: true,
    supports_customers: false,
    apiKeyPlaceholder: "key_id:key_secret",
    apiKeyHint: "Paste as key_id:key_secret from Razorpay Dashboard.",
    connectDescription: "Sums captured payments in the sync window.",
  },
  {
    slug: "paypal",
    displayName: "PayPal",
    revenueClass: "transaction",
    authType: "oauth2",
    supports_mrr: false,
    supports_arr: false,
    supports_transactions: true,
    supports_customers: false,
    connectDescription:
      "OAuth to PayPal — transaction totals in the sync window.",
  },
  {
    slug: "square",
    displayName: "Square",
    revenueClass: "transaction",
    authType: "oauth2",
    supports_mrr: false,
    supports_arr: false,
    supports_transactions: true,
    supports_customers: false,
  },
  {
    slug: "payu",
    displayName: "PayU",
    revenueClass: "transaction",
    authType: "api_key",
    supports_mrr: false,
    supports_arr: false,
    supports_transactions: true,
    supports_customers: false,
    apiKeyPlaceholder: "PayU merchant key",
  },
  {
    slug: "shopify",
    displayName: "Shopify",
    revenueClass: "commerce",
    authType: "oauth2",
    supports_mrr: false,
    supports_arr: false,
    supports_transactions: true,
    supports_customers: true,
    requiresExternalAccount: true,
    externalAccountLabel: "Shop domain (myshop.myshopify.com)",
    connectDescription: "Order totals from your Shopify store.",
  },
  {
    slug: "woocommerce",
    displayName: "WooCommerce",
    revenueClass: "commerce",
    authType: "api_key",
    supports_mrr: false,
    supports_arr: false,
    supports_transactions: true,
    supports_customers: false,
    requiresExternalAccount: true,
    externalAccountLabel: "Store URL (https://…)",
    apiKeyPlaceholder: "consumer_key:consumer_secret",
    apiKeyHint:
      "Paste as consumer_key:consumer_secret from WooCommerce REST API.",
  },
  {
    slug: "bigcommerce",
    displayName: "BigCommerce",
    revenueClass: "commerce",
    authType: "api_key",
    supports_mrr: false,
    supports_arr: false,
    supports_transactions: true,
    supports_customers: false,
    requiresExternalAccount: true,
    externalAccountLabel: "Store hash",
    apiKeyPlaceholder: "BigCommerce API token",
  },
  {
    slug: "quickbooks",
    displayName: "QuickBooks",
    revenueClass: "accounting",
    authType: "oauth2",
    supports_mrr: false,
    supports_arr: true,
    supports_transactions: false,
    supports_customers: false,
    requiresExternalAccount: true,
    externalAccountLabel: "Company ID (realmId)",
    satisfiesRevenueGate: true,
    connectDescription:
      "P&L revenue line becomes verified revenue (not subscription MRR).",
  },
  {
    slug: "xero",
    displayName: "Xero",
    revenueClass: "accounting",
    authType: "oauth2",
    supports_mrr: false,
    supports_arr: true,
    supports_transactions: false,
    supports_customers: false,
    requiresExternalAccount: true,
    externalAccountLabel: "Tenant ID",
    satisfiesRevenueGate: true,
  },
  {
    slug: "zoho_books",
    displayName: "Zoho Books",
    revenueClass: "accounting",
    authType: "oauth2",
    supports_mrr: false,
    supports_arr: false,
    supports_transactions: false,
    supports_customers: false,
    requiresExternalAccount: true,
    externalAccountLabel: "Organization ID",
    satisfiesRevenueGate: true,
  },
  {
    slug: "plaid",
    displayName: "Plaid",
    revenueClass: "banking",
    authType: "link",
    supports_mrr: false,
    supports_arr: false,
    supports_transactions: true,
    supports_customers: false,
    satisfiesRevenueGate: true,
    connectDescription:
      "Bank inflows in the verification window count as verified revenue.",
  },
  {
    slug: "tink",
    displayName: "Tink",
    revenueClass: "banking",
    authType: "oauth2",
    supports_mrr: false,
    supports_arr: false,
    supports_transactions: true,
    supports_customers: false,
    satisfiesRevenueGate: true,
  },
];

const bySlug = new Map(catalog.map((c) => [c.slug, c]));

export function getRevenueProviderUiMeta(
  slug: string,
): RevenueProviderUiMeta | undefined {
  return bySlug.get(slug);
}

export function mergeProviderConfigSchema(
  slug: string,
  configSchema: Record<string, unknown> | null | undefined,
): RevenueProviderUiMeta | undefined {
  const base = bySlug.get(slug);
  if (!base && !configSchema) return undefined;
  const cs = configSchema ?? {};
  if (!base) {
    return {
      slug,
      displayName: slug,
      revenueClass:
        (cs.revenue_class as RevenueProviderClass) ?? "subscription",
      authType: "api_key",
      supports_mrr: Boolean(cs.supports_mrr),
      supports_arr: Boolean(cs.supports_arr),
      supports_transactions: Boolean(cs.supports_transactions),
      supports_customers: Boolean(cs.supports_customers),
      requiresExternalAccount: Boolean(cs.requires_external_account),
      externalAccountLabel: cs.external_account_label as string | undefined,
      apiKeyPlaceholder: cs.api_key_placeholder as string | undefined,
      apiKeyHint: cs.api_key_hint as string | undefined,
      connectDescription: cs.connect_description as string | undefined,
      satisfiesRevenueGate: Boolean(cs.satisfies_revenue_gate),
    };
  }
  return {
    ...base,
    requiresExternalAccount:
      base.requiresExternalAccount ?? Boolean(cs.requires_external_account),
    externalAccountLabel:
      (cs.external_account_label as string | undefined) ??
      base.externalAccountLabel,
    apiKeyPlaceholder:
      (cs.api_key_placeholder as string | undefined) ?? base.apiKeyPlaceholder,
    connectDescription:
      (cs.connect_description as string | undefined) ?? base.connectDescription,
    satisfiesRevenueGate:
      base.satisfiesRevenueGate ?? Boolean(cs.satisfies_revenue_gate),
  };
}

export function revenueMetricLabel(
  meta: RevenueProviderUiMeta | undefined,
): string {
  if (!meta) return "verified revenue";
  if (meta.supports_mrr) return "verified revenue (MRR-style period)";
  if (meta.revenueClass === "commerce" || meta.revenueClass === "transaction") {
    return "verified revenue (recent orders/payments)";
  }
  if (meta.revenueClass === "accounting") return "verified revenue (P&L)";
  if (meta.revenueClass === "banking") return "verified revenue (bank inflows)";
  return "verified revenue";
}

export function groupRevenueProvidersForConnect(
  providers: {
    slug: string;
    category: string;
    display_name: string;
    auth_type: string;
    config_schema?: Record<string, unknown>;
  }[],
): {
  class: RevenueProviderClass;
  label: string;
  items: {
    slug: string;
    displayName: string;
    authType: string;
    meta: RevenueProviderUiMeta;
  }[];
}[] {
  const revenueSlugs = new Set(catalog.map((c) => c.slug));
  const rows = providers.filter(
    (p) =>
      p.category === "revenue" ||
      revenueSlugs.has(p.slug) ||
      Boolean(p.config_schema?.satisfies_revenue_gate),
  );

  const grouped = new Map<
    RevenueProviderClass,
    {
      slug: string;
      displayName: string;
      authType: string;
      meta: RevenueProviderUiMeta;
    }[]
  >();

  for (const p of rows) {
    const meta = mergeProviderConfigSchema(p.slug, p.config_schema) ?? {
      slug: p.slug,
      displayName: p.display_name,
      revenueClass: "subscription" as const,
      authType: p.auth_type as RevenueProviderUiMeta["authType"],
      supports_mrr: false,
      supports_arr: false,
      supports_transactions: true,
      supports_customers: false,
    };
    const list = grouped.get(meta.revenueClass) ?? [];
    list.push({
      slug: p.slug,
      displayName: meta.displayName ?? p.display_name,
      authType: p.auth_type,
      meta,
    });
    grouped.set(meta.revenueClass, list);
  }

  const order: RevenueProviderClass[] = [
    "subscription",
    "transaction",
    "commerce",
    "accounting",
    "banking",
  ];

  return order
    .filter((c) => grouped.has(c))
    .map((c) => ({
      class: c,
      label: revenueClassLabel(c),
      items: grouped.get(c) ?? [],
    }));
}

export function isRevenueGateProviderSlug(slug: string): boolean {
  const m = bySlug.get(slug);
  return Boolean(m && (m.revenueClass !== "banking" || m.satisfiesRevenueGate));
}

export function formatVerifiedRevenueDisplay(
  amount: number | null | undefined,
  currency: string | null | undefined,
  meta: RevenueProviderUiMeta | undefined,
): string {
  if (amount == null || amount <= 0) return "";
  const cur = currency ?? "USD";
  const formatted = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: cur,
    maximumFractionDigits: 0,
  }).format(amount);
  if (meta?.supports_mrr) return `${formatted} verified revenue`;
  return `${formatted} verified revenue`;
}
