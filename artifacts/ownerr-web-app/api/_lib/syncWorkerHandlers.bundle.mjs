// ../../lib/db-schema/src/tables.ts
var SchemaTables = {
  core: {
    users: "users",
    userProfiles: "user_profiles",
    userProducts: "user_products",
    wallets: "wallets",
    walletTransactions: "wallet_transactions",
    referrals: "referrals",
    referralEvents: "referral_events",
    userAppAccess: "user_app_access",
    productSessions: "product_sessions",
    userEvents: "user_events",
    userScores: "user_scores",
    userBadges: "user_badges",
    userOnboardingSessions: "user_onboarding_sessions",
    submissions: "submissions"
  },
  marketplace: {
    companies: "marketplace_companies",
    accounts: "marketplace_accounts",
    companyMedia: "marketplace_company_media",
    companyMetrics: "marketplace_company_metrics",
    buyerInterests: "marketplace_buyer_interests",
    offers: "marketplace_offers",
    offerRevisions: "marketplace_offer_revisions",
    acquisitions: "marketplace_acquisitions",
    offerNotifications: "marketplace_offer_notifications",
    sellerPublications: "marketplace_seller_publications",
    conversations: "marketplace_conversations",
    messages: "marketplace_messages",
    companyClaims: "marketplace_company_claims",
    sellerIntake: "marketplace_seller_intake",
    businessProofs: "marketplace_business_proofs",
    verificationRequests: "marketplace_verification_requests"
  },
  catalog: {
    listings: "catalog_listings",
    listingInterests: "catalog_listing_interests"
  },
  founder: {
    campaignSubmissions: "founder_campaign_submissions",
    campaignReferralEvents: "founder_campaign_referral_events"
  },
  trust: {
    providers: "trust_providers",
    integrations: "trust_integrations",
    integrationSecrets: "trust_integration_secrets",
    integrationSyncRuns: "trust_integration_sync_runs",
    integrationJobs: "trust_integration_jobs",
    verificationResults: "trust_verification_results",
    verificationEvents: "trust_verification_events",
    domainChallenges: "trust_domain_challenges",
    financialMetrics: "trust_financial_metrics",
    trafficMetrics: "trust_traffic_metrics",
    accountingMetrics: "trust_accounting_metrics",
    bankMetrics: "trust_bank_metrics",
    companyScores: "trust_company_scores",
    companyScoreHistory: "trust_company_score_history",
    companySignals: "trust_company_signals",
    valuationReports: "trust_valuation_reports",
    valuationInputs: "trust_valuation_inputs",
    valuationAdjustments: "trust_valuation_adjustments",
    valuationHistory: "trust_valuation_history",
    aiInsightRuns: "trust_ai_insight_runs",
    listingGates: "trust_listing_gates",
    founderIdentityChecks: "trust_founder_identity_checks",
    businessEmailVerifications: "trust_business_email_verifications",
    registrationDocuments: "trust_registration_documents",
    fraudSignals: "trust_fraud_signals",
    adminReviews: "trust_admin_reviews",
    disposableEmailDomains: "trust_disposable_email_domains",
    identitySessions: "trust_identity_sessions",
    webhookEvents: "trust_webhook_events",
    personProfiles: "trust_person_profiles",
    verifiedRevenueMetrics: "trust_verified_revenue_metrics"
  },
  system: {
    platformConfig: "sys_platform_config",
    auditLogs: "sys_audit_logs",
    identityLaunchTokens: "sys_identity_launch_tokens",
    syncWorkerLaunchTokens: "sys_sync_worker_launch_tokens",
    businessEmailLaunchTokens: "sys_business_email_launch_tokens",
    appliedMigrations: "ownerr_applied_migrations"
  }
};
var legacyToPhysicalTable = {
  startups: SchemaTables.marketplace.companies,
  marketplace_profiles: SchemaTables.marketplace.accounts,
  startup_media: SchemaTables.marketplace.companyMedia,
  startup_metrics: SchemaTables.marketplace.companyMetrics,
  startup_interests: SchemaTables.marketplace.buyerInterests,
  bids: SchemaTables.marketplace.offers,
  bid_versions: SchemaTables.marketplace.offerRevisions,
  acquisition_deals: SchemaTables.marketplace.acquisitions,
  marketplace_offer_events: SchemaTables.marketplace.offerNotifications,
  seller_listings: SchemaTables.marketplace.sellerPublications,
  conversations: SchemaTables.marketplace.conversations,
  messages: SchemaTables.marketplace.messages,
  startup_claims: SchemaTables.marketplace.companyClaims,
  listing_seller_intake: SchemaTables.marketplace.sellerIntake,
  listing_business_proofs: SchemaTables.marketplace.businessProofs,
  verification_requests: SchemaTables.marketplace.verificationRequests,
  listings: SchemaTables.catalog.listings,
  listing_interests: SchemaTables.catalog.listingInterests,
  founder_submissions: SchemaTables.founder.campaignSubmissions,
  founder_referral_events: SchemaTables.founder.campaignReferralEvents,
  platform_internal_config: SchemaTables.system.platformConfig,
  audit_logs: SchemaTables.system.auditLogs,
  identity_launch_tokens: SchemaTables.system.identityLaunchTokens,
  sync_worker_launch_tokens: SchemaTables.system.syncWorkerLaunchTokens,
  business_email_launch_tokens: SchemaTables.system.businessEmailLaunchTokens,
  verification_providers: SchemaTables.trust.providers,
  integration_connections: SchemaTables.trust.integrations,
  integration_credentials: SchemaTables.trust.integrationSecrets,
  integration_syncs: SchemaTables.trust.integrationSyncRuns,
  integration_sync_jobs: SchemaTables.trust.integrationJobs,
  verification_results: SchemaTables.trust.verificationResults,
  verification_events: SchemaTables.trust.verificationEvents,
  domain_verification_challenges: SchemaTables.trust.domainChallenges,
  financial_metrics: SchemaTables.trust.financialMetrics,
  traffic_metrics: SchemaTables.trust.trafficMetrics,
  accounting_metrics: SchemaTables.trust.accountingMetrics,
  bank_metrics: SchemaTables.trust.bankMetrics,
  trust_scores: SchemaTables.trust.companyScores,
  trust_score_history: SchemaTables.trust.companyScoreHistory,
  trust_signals: SchemaTables.trust.companySignals,
  valuation_reports: SchemaTables.trust.valuationReports,
  valuation_inputs: SchemaTables.trust.valuationInputs,
  valuation_adjustments: SchemaTables.trust.valuationAdjustments,
  valuation_history: SchemaTables.trust.valuationHistory,
  ai_insight_runs: SchemaTables.trust.aiInsightRuns,
  listing_verification_gates: SchemaTables.trust.listingGates,
  founder_identity_verifications: SchemaTables.trust.founderIdentityChecks,
  business_email_verifications: SchemaTables.trust.businessEmailVerifications,
  business_registration_documents: SchemaTables.trust.registrationDocuments,
  listing_fraud_signals: SchemaTables.trust.fraudSignals,
  admin_listing_reviews: SchemaTables.trust.adminReviews,
  platform_disposable_email_domains: SchemaTables.trust.disposableEmailDomains,
  identity_verification_sessions: SchemaTables.trust.identitySessions,
  verification_webhook_events: SchemaTables.trust.webhookEvents,
  person_verification_profiles: SchemaTables.trust.personProfiles,
  verified_revenue_metrics: SchemaTables.trust.verifiedRevenueMetrics
};

// ../../lib/integrations-core/src/verifiedRevenueMetrics.ts
function buildVerifiedRevenueMetrics(input) {
  const amount = Math.max(0, Number(input.verified_revenue_amount) || 0);
  const status = input.verification_status ?? (amount > 0 ? "pass" : "partial");
  return {
    verified_revenue_amount: amount,
    annualized_revenue: input.annualized_revenue != null ? Number(input.annualized_revenue) : amount > 0 ? amount * 12 : null,
    customer_count: input.customer_count != null ? Number(input.customer_count) : null,
    transaction_count: input.transaction_count != null ? Number(input.transaction_count) : null,
    currency: (input.currency ?? "USD").toUpperCase(),
    verification_status: status,
    source_provider: input.source_provider,
    evidence_timestamp: input.evidence_timestamp ?? (/* @__PURE__ */ new Date()).toISOString()
  };
}
function syncResultFromVerifiedRevenue(metrics, opts) {
  const pass = metrics.verification_status === "pass" && metrics.verified_revenue_amount > 0;
  return {
    recordsWritten: opts?.recordsWritten ?? (pass ? 1 : 0),
    verificationDimension: "revenue",
    verificationStatus: metrics.verification_status,
    verificationSummary: {
      ...opts?.verificationSummary ?? {},
      verified_revenue: metrics
    },
    verifiedRevenue: metrics,
    financialMetrics: opts?.financialMetrics,
    connectionStatus: opts?.connectionStatus ?? (pass ? "connected" : "degraded"),
    healthStatus: opts?.healthStatus ?? (metrics.verification_status === "fail" ? "unhealthy" : pass ? "healthy" : "degraded"),
    lastError: opts?.lastError
  };
}

// ../../lib/integrations-core/src/revenueProviderCatalog.ts
var catalog = [
  {
    slug: "stripe",
    displayName: "Stripe",
    revenueClass: "subscription",
    authType: "api_key",
    supports_mrr: true,
    supports_arr: true,
    supports_transactions: true,
    supports_customers: true,
    apiKeyPlaceholder: "sk_live_\u2026 or sk_test_\u2026",
    apiKeyHint: "Secret key from Stripe Dashboard \u2192 Developers \u2192 API keys.",
    connectDescription: "We aggregate recent balance transactions into verified monthly revenue.",
    partialHint: "Connect the same key where charges appear (test mode is fine for sandbox)."
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
    connectDescription: "Uses Paddle transaction totals for verified revenue."
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
    connectDescription: "Subscription metrics from your RevenueCat project."
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
    apiKeyPlaceholder: "Chargebee API key"
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
    apiKeyPlaceholder: "Recurly private API key"
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
    connectDescription: "Verified revenue from recent store orders."
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
    connectDescription: "Sums captured payments in the verification window."
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
    connectDescription: "OAuth to PayPal \u2014 transaction totals in the sync window."
  },
  {
    slug: "square",
    displayName: "Square",
    revenueClass: "transaction",
    authType: "oauth2",
    supports_mrr: false,
    supports_arr: false,
    supports_transactions: true,
    supports_customers: false
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
    apiKeyPlaceholder: "PayU merchant key"
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
    connectDescription: "Order totals from your Shopify store."
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
    externalAccountLabel: "Store URL (https://\u2026)",
    apiKeyPlaceholder: "Consumer key:consumer secret"
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
    apiKeyPlaceholder: "BigCommerce API token"
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
    connectDescription: "Accounting revenue \u2014 P&L based verified amount (not MRR)."
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
    externalAccountLabel: "Tenant ID"
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
    externalAccountLabel: "Organization ID"
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
    connectDescription: "Bank inflows in the verification window."
  },
  {
    slug: "tink",
    displayName: "Tink",
    revenueClass: "banking",
    authType: "oauth2",
    supports_mrr: false,
    supports_arr: false,
    supports_transactions: true,
    supports_customers: false
  }
];
var bySlug = new Map(catalog.map((c) => [c.slug, c]));
function getRevenueProviderCapabilities(slug) {
  return bySlug.get(slug);
}

// ../../lib/integrations-core/src/revenueSyncHelpers.ts
function finishRevenueSync(slug, metrics, opts) {
  const cap = getRevenueProviderCapabilities(slug);
  const useMrrLegacy = cap?.supports_mrr ?? false;
  const financialMetrics = opts?.financialMetrics ?? (metrics.verification_status === "pass" && metrics.verified_revenue_amount > 0 ? [
    {
      periodStart: metrics.evidence_timestamp.slice(0, 8) + "01",
      periodEnd: metrics.evidence_timestamp.slice(0, 10),
      granularity: "month",
      mrr: useMrrLegacy ? metrics.verified_revenue_amount : null,
      arr: metrics.annualized_revenue,
      netRevenue: metrics.verified_revenue_amount,
      refunds: null,
      currency: metrics.currency
    }
  ] : []);
  return syncResultFromVerifiedRevenue(metrics, {
    ...opts,
    financialMetrics,
    verificationSummary: {
      provider: slug,
      revenue_class: cap?.revenueClass,
      ...opts?.verificationSummary
    }
  });
}

// ../../lib/integrations-core/src/providers/stripe.ts
function monthKey(d) {
  return d.toISOString().slice(0, 7) + "-01";
}
var stripeAdapter = {
  slug: "stripe",
  category: "revenue",
  async sync(ctx) {
    const key = ctx.secret.trim();
    const res = await fetch(
      "https://api.stripe.com/v1/balance_transactions?limit=100",
      {
        headers: { Authorization: `Bearer ${key}` }
      }
    );
    const body = await res.json();
    if (!res.ok) {
      return finishRevenueSync(
        "stripe",
        buildVerifiedRevenueMetrics({
          source_provider: "stripe",
          verified_revenue_amount: 0,
          verification_status: "fail"
        }),
        {
          lastError: body.error?.message ?? `Stripe HTTP ${res.status}`,
          recordsWritten: 0
        }
      );
    }
    const byMonth = /* @__PURE__ */ new Map();
    let txCount = 0;
    for (const tx of body.data ?? []) {
      if (tx.type === "payout") continue;
      txCount += 1;
      const d = new Date(tx.created * 1e3);
      const k = monthKey(d);
      byMonth.set(k, (byMonth.get(k) ?? 0) + tx.amount / 100);
    }
    const amounts = [...byMonth.values()];
    const latest = amounts.length > 0 ? amounts[amounts.length - 1] : 0;
    const metrics = buildVerifiedRevenueMetrics({
      source_provider: "stripe",
      verified_revenue_amount: latest,
      annualized_revenue: latest > 0 ? latest * 12 : null,
      transaction_count: txCount,
      currency: "USD"
    });
    const financialMetrics = [...byMonth.entries()].map(
      ([periodStart, netRevenue]) => {
        const end = new Date(periodStart);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        return {
          periodStart,
          periodEnd: end.toISOString().slice(0, 10),
          granularity: "month",
          mrr: netRevenue,
          arr: netRevenue * 12,
          netRevenue,
          refunds: null,
          currency: "USD"
        };
      }
    );
    return finishRevenueSync("stripe", metrics, {
      financialMetrics,
      recordsWritten: financialMetrics.length
    });
  }
};

// ../../lib/integrations-core/src/providers/domain.ts
import dns from "node:dns/promises";
function domainDnsLog(message, data) {
  if (process.env.NODE_ENV === "production" && process.env.SYNC_WORKER_VERIFICATION_DEBUG !== "1") {
    return;
  }
  const tag = "[verification:domain-dns]";
  if (data) console.info(tag, message, data);
  else console.info(tag, message);
}
function dnsNameNorm(name) {
  return name.trim().replace(/\.$/, "").toLowerCase();
}
function cnameMatches(actual, expected) {
  const a = dnsNameNorm(actual);
  const e = dnsNameNorm(expected);
  if (!e) return false;
  return a === e || a.endsWith(`.${e}`) || a.includes(e);
}
var domainAdapter = {
  slug: "domain",
  category: "domain",
  async sync(ctx) {
    const challengeId = ctx.jobPayload.challenge_id;
    const host = ctx.jobPayload.host;
    const expected = ctx.jobPayload.expected_record;
    const method = ctx.jobPayload.method;
    if (!challengeId || !host || !expected || !method) {
      domainDnsLog("Missing challenge fields", {
        challengeId: !!challengeId,
        host,
        expected,
        method
      });
      return {
        recordsWritten: 0,
        connectionStatus: "error",
        healthStatus: "unhealthy",
        lastError: "domain job missing challenge fields"
      };
    }
    let pass = false;
    const evidence = { method, host };
    const hostNorm = dnsNameNorm(host);
    evidence.host_queried = hostNorm;
    evidence.expected_record = expected;
    domainDnsLog("DNS lookup starting", { method, host: hostNorm, expected });
    try {
      if (method === "txt") {
        const records = await dns.resolveTxt(hostNorm);
        const perRecord = records.map((r) => r.join("").trim());
        const flat = perRecord.join(" ");
        const expectedNorm = expected.trim();
        pass = perRecord.some(
          (txt) => txt === expectedNorm || txt.includes(expectedNorm) || txt.replace(/\s+/g, "") === expectedNorm.replace(/\s+/g, "")
        );
        evidence.records = flat;
        evidence.per_record = perRecord;
        evidence.txt_match = pass;
      } else {
        let cnames = [];
        try {
          cnames = await dns.resolveCname(hostNorm);
        } catch (cnameErr) {
          const code = cnameErr && typeof cnameErr === "object" && "code" in cnameErr ? String(cnameErr.code) : "";
          if (code === "ENODATA" || code === "ENOTFOUND") {
            evidence.cnames = [];
          } else {
            throw cnameErr;
          }
        }
        pass = cnames.some((c) => cnameMatches(c, expected));
        evidence.cnames = cnames;
        evidence.expected = dnsNameNorm(expected);
        evidence.cname_match = pass;
      }
    } catch (e) {
      evidence.error = e instanceof Error ? e.message : String(e);
      pass = false;
    }
    domainDnsLog(pass ? "DNS lookup passed" : "DNS lookup failed", {
      method,
      host: hostNorm,
      pass,
      evidence
    });
    return {
      recordsWritten: 1,
      verificationDimension: "domain",
      verificationStatus: pass ? "pass" : "fail",
      verificationSummary: { host, pass },
      connectionStatus: "connected",
      healthStatus: pass ? "healthy" : "degraded",
      syncCursor: { challenge_id: challengeId, pass, evidence }
    };
  }
};

// ../../lib/integrations-core/src/providers/revenue.ts
async function apiKeySync(ctx, slug, opts) {
  const res = await fetch(opts.url, { headers: opts.headers });
  const json2 = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof json2 === "object" && json2 && "error" in json2 && typeof json2.error === "string" ? json2.error : `HTTP ${res.status}`;
    return finishRevenueSync(
      slug,
      buildVerifiedRevenueMetrics({
        source_provider: slug,
        verified_revenue_amount: 0,
        verification_status: "fail"
      }),
      { lastError: msg, recordsWritten: 0 }
    );
  }
  const parsed = opts.parse(json2);
  const metrics = buildVerifiedRevenueMetrics({
    source_provider: slug,
    verified_revenue_amount: parsed.amount,
    currency: parsed.currency,
    annualized_revenue: parsed.annualized,
    transaction_count: parsed.transaction_count,
    customer_count: parsed.customer_count
  });
  return finishRevenueSync(slug, metrics, {
    recordsWritten: parsed.amount > 0 ? 1 : 0
  });
}
function parsePaddleTransactions(json2) {
  const data = json2.data ?? [];
  const countable = /* @__PURE__ */ new Set(["completed", "billed", "paid", "ready"]);
  let totalMinor = 0;
  let currency = "USD";
  let count = 0;
  for (const row of data) {
    const status = String(row.status ?? "").toLowerCase();
    if (status && !countable.has(status)) continue;
    const details = row.details;
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
    annualized: amount > 0 ? amount * 12 : null
  };
}
var paddleAdapter = {
  slug: "paddle",
  category: "revenue",
  async sync(ctx) {
    return apiKeySync(ctx, "paddle", {
      url: "https://api.paddle.com/transactions?per_page=50&status=completed,billed,paid",
      headers: {
        Authorization: `Bearer ${ctx.secret}`,
        "Content-Type": "application/json"
      },
      parse: parsePaddleTransactions
    });
  }
};
var lemonsqueezyAdapter = {
  slug: "lemonsqueezy",
  category: "revenue",
  async sync(ctx) {
    const ordersRes = await fetch(
      "https://api.lemonsqueezy.com/v1/orders?page[size]=50",
      {
        headers: {
          Authorization: `Bearer ${ctx.secret}`,
          Accept: "application/vnd.api+json"
        }
      }
    );
    const json2 = await ordersRes.json().catch(() => ({}));
    if (!ordersRes.ok) {
      return finishRevenueSync(
        "lemonsqueezy",
        buildVerifiedRevenueMetrics({
          source_provider: "lemonsqueezy",
          verified_revenue_amount: 0,
          verification_status: "fail"
        }),
        {
          lastError: `Lemon Squeezy HTTP ${ordersRes.status}`,
          recordsWritten: 0
        }
      );
    }
    const rows = json2.data ?? [];
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
      transaction_count: rows.length
    });
    return finishRevenueSync("lemonsqueezy", metrics, {
      recordsWritten: rows.length
    });
  }
};
var revenuecatAdapter = {
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
          verification_status: "fail"
        }),
        {
          lastError: "RevenueCat requires project ID (external account)",
          recordsWritten: 0
        }
      );
    }
    return apiKeySync(ctx, "revenuecat", {
      url: `https://api.revenuecat.com/v2/projects/${projectId}/metrics/overview`,
      headers: {
        Authorization: `Bearer ${ctx.secret}`,
        "Content-Type": "application/json"
      },
      parse(json2) {
        const mrr = Number(
          json2.mrr ?? json2.metrics?.mrr ?? 0
        );
        return {
          amount: mrr,
          annualized: mrr > 0 ? mrr * 12 : null
        };
      }
    });
  }
};
var razorpayAdapter = {
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
          verification_status: "fail"
        }),
        {
          lastError: "Razorpay secret must be key_id:key_secret",
          recordsWritten: 0
        }
      );
    }
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    return apiKeySync(ctx, "razorpay", {
      url: "https://api.razorpay.com/v1/payments?count=100",
      headers: { Authorization: `Basic ${auth}` },
      parse(json2) {
        const items = json2.items ?? [];
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
      }
    });
  }
};

// ../../lib/integrations-core/src/providers/revenueExtended.ts
function basicAuthHeader(user, pass) {
  return {
    Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`
  };
}
async function fail(slug, message) {
  return finishRevenueSync(
    slug,
    buildVerifiedRevenueMetrics({
      source_provider: slug,
      verified_revenue_amount: 0,
      verification_status: "fail"
    }),
    { lastError: message, recordsWritten: 0 }
  );
}
var chargebeeAdapter = {
  slug: "chargebee",
  category: "revenue",
  async sync(ctx) {
    const site = ctx.externalAccountId?.trim();
    if (!site)
      return fail("chargebee", "Chargebee site name (subdomain) is required");
    const res = await fetch(
      `https://${site}.chargebee.com/api/v2/invoices?limit=50`,
      {
        headers: {
          ...basicAuthHeader(ctx.secret, ""),
          Accept: "application/json"
        }
      }
    );
    const json2 = await res.json().catch(() => ({}));
    if (!res.ok) return fail("chargebee", `Chargebee HTTP ${res.status}`);
    let total = 0;
    let currency = "USD";
    let count = 0;
    for (const row of json2.list ?? []) {
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
        transaction_count: count
      }),
      { recordsWritten: count }
    );
  }
};
var recurlyAdapter = {
  slug: "recurly",
  category: "revenue",
  async sync(ctx) {
    const sub = ctx.externalAccountId?.trim();
    if (!sub) return fail("recurly", "Recurly subdomain is required");
    const res = await fetch(
      `https://${sub}.recurly.com/v2/invoices?per_page=50`,
      {
        headers: {
          Authorization: ctx.secret,
          Accept: "application/xml"
        }
      }
    );
    if (!res.ok) return fail("recurly", `Recurly HTTP ${res.status}`);
    const text = await res.text();
    const amounts = [
      ...text.matchAll(
        /<total_in_cents type="integer">(\d+)<\/total_in_cents>/g
      )
    ];
    let total = 0;
    for (const m of amounts) total += Number(m[1] ?? 0) / 100;
    return finishRevenueSync(
      "recurly",
      buildVerifiedRevenueMetrics({
        source_provider: "recurly",
        verified_revenue_amount: total,
        transaction_count: amounts.length
      }),
      { recordsWritten: amounts.length }
    );
  }
};
var payuAdapter = {
  slug: "payu",
  category: "revenue",
  async sync(ctx) {
    return fail(
      "payu",
      "PayU sync requires merchant credentials configured in PayU dashboard (coming soon)"
    );
  }
};
var paypalAdapter = {
  slug: "paypal",
  category: "revenue",
  async sync(ctx) {
    return fail(
      "paypal",
      "Connect PayPal via OAuth from Settings (OAuth flow not yet wired in this environment)"
    );
  }
};
var squareAdapter = {
  slug: "square",
  category: "revenue",
  async sync(ctx) {
    return fail(
      "square",
      "Connect Square via OAuth from Settings (OAuth flow not yet wired in this environment)"
    );
  }
};
var woocommerceAdapter = {
  slug: "woocommerce",
  category: "revenue",
  async sync(ctx) {
    const base = ctx.externalAccountId?.replace(/\/$/, "");
    const [key, secret] = ctx.secret.split(":");
    if (!base || !key || !secret) {
      return fail(
        "woocommerce",
        "Store URL and consumer_key:consumer_secret are required"
      );
    }
    const res = await fetch(
      `${base}/wp-json/wc/v3/orders?status=completed&per_page=50`,
      {
        headers: basicAuthHeader(key, secret)
      }
    );
    const json2 = await res.json().catch(() => []);
    if (!res.ok) return fail("woocommerce", `WooCommerce HTTP ${res.status}`);
    let total = 0;
    let currency = "USD";
    for (const o of json2) {
      total += Number(o.total ?? 0);
      if (o.currency) currency = o.currency;
    }
    return finishRevenueSync(
      "woocommerce",
      buildVerifiedRevenueMetrics({
        source_provider: "woocommerce",
        verified_revenue_amount: total,
        currency,
        transaction_count: json2.length
      }),
      { recordsWritten: json2.length }
    );
  }
};
var bigcommerceAdapter = {
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
          Accept: "application/json"
        }
      }
    );
    const json2 = await res.json().catch(() => []);
    if (!res.ok) return fail("bigcommerce", `BigCommerce HTTP ${res.status}`);
    let total = 0;
    let currency = "USD";
    for (const o of json2) {
      total += Number(o.total_inc_tax ?? 0);
      if (o.currency_code) currency = o.currency_code;
    }
    return finishRevenueSync(
      "bigcommerce",
      buildVerifiedRevenueMetrics({
        source_provider: "bigcommerce",
        verified_revenue_amount: total,
        currency,
        transaction_count: json2.length
      }),
      { recordsWritten: json2.length }
    );
  }
};

// ../../lib/integrations-core/src/providers/traffic.ts
function oauthBundle(ctx) {
  try {
    return JSON.parse(ctx.secret);
  } catch {
    return { access_token: ctx.secret };
  }
}
var ga4Adapter = {
  slug: "ga4",
  category: "traffic",
  async sync(ctx) {
    const tokens = oauthBundle(ctx);
    const propertyId = ctx.externalAccountId ?? ctx.syncCursor.property_id;
    if (!propertyId) {
      return {
        recordsWritten: 0,
        connectionStatus: "error",
        healthStatus: "unhealthy",
        lastError: "GA4 property id required as external_account_id"
      };
    }
    const res = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
          metrics: [{ name: "sessions" }, { name: "totalUsers" }]
        })
      }
    );
    const json2 = await res.json();
    if (!res.ok) {
      return {
        recordsWritten: 0,
        connectionStatus: "error",
        healthStatus: "unhealthy",
        lastError: json2.error?.message ?? `GA4 HTTP ${res.status}`
      };
    }
    const sessions = Number(json2.rows?.[0]?.metricValues?.[0]?.value ?? 0);
    const users = Number(json2.rows?.[0]?.metricValues?.[1]?.value ?? 0);
    const start = /* @__PURE__ */ new Date();
    start.setDate(start.getDate() - 30);
    return {
      recordsWritten: 1,
      verificationDimension: "traffic",
      verificationStatus: sessions > 0 ? "pass" : "partial",
      trafficMetrics: [
        {
          periodStart: start.toISOString().slice(0, 10),
          periodEnd: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
          sessions,
          users,
          pageviews: null,
          source: "ga4"
        }
      ],
      connectionStatus: "connected",
      healthStatus: sessions > 0 ? "healthy" : "degraded"
    };
  }
};
var ahrefsAdapter = {
  slug: "ahrefs",
  category: "traffic",
  async sync(ctx) {
    const res = await fetch(
      "https://api.ahrefs.com/v3/site-explorer/domain-rating",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ctx.secret}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          target: ctx.externalAccountId ?? ctx.syncCursor.domain
        })
      }
    );
    const json2 = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        recordsWritten: 0,
        connectionStatus: "error",
        healthStatus: "unhealthy",
        lastError: `Ahrefs HTTP ${res.status}`
      };
    }
    return {
      recordsWritten: 1,
      verificationDimension: "traffic",
      verificationStatus: "pass",
      verificationSummary: json2,
      connectionStatus: "connected",
      healthStatus: "healthy"
    };
  }
};
var semrushAdapter = {
  slug: "semrush",
  category: "traffic",
  async sync(ctx) {
    const domain = ctx.externalAccountId ?? "";
    const url = `https://api.semrush.com/?type=domain_ranks&key=${encodeURIComponent(ctx.secret)}&domain=${encodeURIComponent(domain)}&export_columns=Db,Dn`;
    const res = await fetch(url);
    const text = await res.text();
    if (!res.ok) {
      return {
        recordsWritten: 0,
        connectionStatus: "error",
        healthStatus: "unhealthy",
        lastError: text.slice(0, 200)
      };
    }
    return {
      recordsWritten: 1,
      verificationDimension: "traffic",
      verificationStatus: "pass",
      verificationSummary: { raw: text.slice(0, 500) },
      connectionStatus: "connected",
      healthStatus: "healthy"
    };
  }
};
var similarwebAdapter = {
  slug: "similarweb",
  category: "traffic",
  async sync(ctx) {
    const domain = ctx.externalAccountId ?? "";
    const res = await fetch(
      `https://api.similarweb.com/v1/website/${encodeURIComponent(domain)}/total-traffic-and-engagement/visits?api_key=${encodeURIComponent(ctx.secret)}`
    );
    const json2 = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        recordsWritten: 0,
        connectionStatus: "error",
        healthStatus: "unhealthy",
        lastError: `SimilarWeb HTTP ${res.status}`
      };
    }
    return {
      recordsWritten: 1,
      verificationDimension: "traffic",
      verificationStatus: "pass",
      verificationSummary: json2,
      connectionStatus: "connected",
      healthStatus: "healthy"
    };
  }
};
var gscAdapter = {
  slug: "google_search_console",
  category: "traffic",
  async sync(ctx) {
    const tokens = oauthBundle(ctx);
    const siteUrl = ctx.externalAccountId ?? "";
    const res = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          startDate: new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10),
          endDate: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
          dimensions: ["date"]
        })
      }
    );
    const json2 = await res.json();
    if (!res.ok) {
      return {
        recordsWritten: 0,
        connectionStatus: "error",
        healthStatus: "unhealthy",
        lastError: JSON.stringify(json2).slice(0, 200)
      };
    }
    return {
      recordsWritten: 1,
      verificationDimension: "traffic",
      verificationStatus: "pass",
      verificationSummary: {
        rows: json2.rows?.length ?? 0
      },
      connectionStatus: "connected",
      healthStatus: "healthy"
    };
  }
};

// ../../lib/integrations-core/src/providers/accounting-banking.ts
function accountingRevenueSync(slug, amount, currency, opts) {
  if (opts?.lastError) {
    return finishRevenueSync(
      slug,
      buildVerifiedRevenueMetrics({
        source_provider: slug,
        verified_revenue_amount: 0,
        verification_status: "fail"
      }),
      { lastError: opts.lastError, recordsWritten: 0 }
    );
  }
  const metrics = buildVerifiedRevenueMetrics({
    source_provider: slug,
    verified_revenue_amount: amount,
    currency,
    annualized_revenue: amount > 0 ? amount * 12 : null
  });
  return finishRevenueSync(slug, metrics, {
    recordsWritten: opts?.recordsWritten ?? (amount > 0 ? 1 : 0),
    verificationSummary: { accounting_backed: true }
  });
}
function oauthBundle2(ctx) {
  try {
    return JSON.parse(ctx.secret);
  } catch {
    return { access_token: ctx.secret };
  }
}
var xeroAdapter = {
  slug: "xero",
  category: "accounting",
  async sync(ctx) {
    const tokens = oauthBundle2(ctx);
    const res = await fetch(
      "https://api.xero.com/api.xro/2.0/Reports/ProfitAndLoss",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: "application/json",
          "Xero-tenant-id": ctx.externalAccountId ?? ""
        }
      }
    );
    const json2 = await res.json().catch(() => ({}));
    if (!res.ok) {
      return accountingRevenueSync("xero", 0, "USD", {
        lastError: `Xero HTTP ${res.status}`
      });
    }
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const revenue = extractXeroRevenue(json2);
    const result = accountingRevenueSync("xero", revenue, "USD", {
      recordsWritten: revenue > 0 ? 1 : 0
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
          currency: "USD"
        }
      ]
    };
  }
};
var quickbooksAdapter = {
  slug: "quickbooks",
  category: "accounting",
  async sync(ctx) {
    const tokens = oauthBundle2(ctx);
    const realmId = ctx.externalAccountId ?? "";
    const res = await fetch(
      `https://quickbooks.api.intuit.com/v3/company/${realmId}/reports/ProfitAndLoss?minorversion=65`,
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: "application/json"
        }
      }
    );
    if (!res.ok) {
      return accountingRevenueSync("quickbooks", 0, "USD", {
        lastError: `QuickBooks HTTP ${res.status}`
      });
    }
    const body = await res.json().catch(() => ({}));
    const revenue = extractQuickBooksRevenue(body);
    return accountingRevenueSync("quickbooks", revenue, "USD", {
      recordsWritten: revenue > 0 ? 1 : 0
    });
  }
};
var zohoBooksAdapter = {
  slug: "zoho_books",
  category: "accounting",
  async sync(ctx) {
    const tokens = oauthBundle2(ctx);
    const orgId = ctx.externalAccountId ?? "";
    const res = await fetch(
      `https://www.zohoapis.com/books/v3/chartofaccounts?organization_id=${orgId}`,
      {
        headers: { Authorization: `Zoho-oauthtoken ${tokens.access_token}` }
      }
    );
    if (!res.ok) {
      return accountingRevenueSync("zoho_books", 0, "USD", {
        lastError: `Zoho Books HTTP ${res.status}`
      });
    }
    return accountingRevenueSync("zoho_books", 0, "USD", { recordsWritten: 0 });
  }
};
var plaidAdapter = {
  slug: "plaid",
  category: "banking",
  async sync(ctx) {
    const bundle = oauthBundle2(ctx);
    const clientId = process.env.PLAID_CLIENT_ID ?? "";
    const secret = process.env.PLAID_SECRET ?? "";
    const res = await fetch("https://production.plaid.com/transactions/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        secret,
        access_token: bundle.access_token ?? ctx.secret,
        start_date: new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10),
        end_date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
      })
    });
    const json2 = await res.json();
    if (!res.ok) {
      return accountingRevenueSync("plaid", 0, "USD", {
        lastError: json2.error_message ?? `Plaid HTTP ${res.status}`
      });
    }
    const inflows = (json2.transactions ?? []).filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    const outflows = (json2.transactions ?? []).filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const start = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const result = finishRevenueSync(
      "plaid",
      buildVerifiedRevenueMetrics({
        source_provider: "plaid",
        verified_revenue_amount: inflows,
        currency: "USD",
        transaction_count: json2.transactions?.length ?? 0
      }),
      { recordsWritten: json2.transactions?.length ?? 0 }
    );
    return {
      ...result,
      bankMetrics: [
        {
          periodStart: start,
          periodEnd: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
          inflows,
          outflows,
          balanceAvg: null,
          currency: "USD"
        }
      ]
    };
  }
};
var tinkAdapter = {
  slug: "tink",
  category: "banking",
  async sync(ctx) {
    const tokens = oauthBundle2(ctx);
    const res = await fetch("https://api.tink.com/data/v2/transactions", {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const json2 = await res.json().catch(() => ({}));
    if (!res.ok) {
      return finishRevenueSync(
        "tink",
        buildVerifiedRevenueMetrics({
          source_provider: "tink",
          verified_revenue_amount: 0,
          verification_status: "fail"
        }),
        { lastError: `Tink HTTP ${res.status}`, recordsWritten: 0 }
      );
    }
    let inflows = 0;
    let count = 0;
    for (const t of json2.transactions ?? []) {
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
        transaction_count: count
      }),
      { recordsWritten: count }
    );
  }
};
var diroAdapter = {
  slug: "diro",
  category: "banking",
  async sync(ctx) {
    const res = await fetch("https://api.diro.io/v1/verify/status", {
      headers: { Authorization: `Bearer ${ctx.secret}` }
    });
    if (!res.ok) {
      return {
        recordsWritten: 0,
        connectionStatus: "error",
        healthStatus: "unhealthy",
        lastError: `Diro HTTP ${res.status}`
      };
    }
    return {
      recordsWritten: 1,
      verificationDimension: "banking",
      verificationStatus: "pass",
      connectionStatus: "connected",
      healthStatus: "healthy"
    };
  }
};
var shopifyAdapter = {
  slug: "shopify",
  category: "revenue",
  async sync(ctx) {
    const tokens = oauthBundle2(ctx);
    const shop = (ctx.externalAccountId ?? "").trim();
    if (!shop) {
      return finishRevenueSync(
        "shopify",
        buildVerifiedRevenueMetrics({
          source_provider: "shopify",
          verified_revenue_amount: 0,
          verification_status: "fail"
        }),
        {
          lastError: "Shopify shop domain is required (myshop.myshopify.com)",
          recordsWritten: 0
        }
      );
    }
    let res;
    try {
      res = await fetch(
        `https://${shop}/admin/api/2024-04/orders.json?status=any&limit=50`,
        {
          headers: {
            "X-Shopify-Access-Token": tokens.access_token ?? ctx.secret
          }
        }
      );
    } catch (e) {
      return finishRevenueSync(
        "shopify",
        buildVerifiedRevenueMetrics({
          source_provider: "shopify",
          verified_revenue_amount: 0,
          verification_status: "fail"
        }),
        {
          lastError: e instanceof Error ? e.message : "Shopify request failed",
          recordsWritten: 0
        }
      );
    }
    const json2 = await res.json();
    if (!res.ok) {
      return finishRevenueSync(
        "shopify",
        buildVerifiedRevenueMetrics({
          source_provider: "shopify",
          verified_revenue_amount: 0,
          verification_status: "fail"
        }),
        { lastError: `Shopify HTTP ${res.status}`, recordsWritten: 0 }
      );
    }
    let total = 0;
    let currency = "USD";
    for (const o of json2.orders ?? []) {
      total += Number(o.total_price ?? 0);
      if (o.currency) currency = o.currency;
    }
    const metrics = buildVerifiedRevenueMetrics({
      source_provider: "shopify",
      verified_revenue_amount: total,
      currency,
      transaction_count: json2.orders?.length ?? 0
    });
    return finishRevenueSync("shopify", metrics, {
      recordsWritten: json2.orders?.length ?? 0
    });
  }
};
function extractXeroRevenue(json2) {
  const rows = json2?.Reports?.[0]?.Rows;
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
function extractQuickBooksRevenue(json2) {
  const rows = json2?.Rows?.Row;
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

// ../../lib/integrations-core/src/index.ts
var adapters = [
  stripeAdapter,
  paddleAdapter,
  lemonsqueezyAdapter,
  revenuecatAdapter,
  razorpayAdapter,
  chargebeeAdapter,
  recurlyAdapter,
  payuAdapter,
  paypalAdapter,
  squareAdapter,
  woocommerceAdapter,
  bigcommerceAdapter,
  shopifyAdapter,
  ga4Adapter,
  gscAdapter,
  ahrefsAdapter,
  semrushAdapter,
  similarwebAdapter,
  quickbooksAdapter,
  xeroAdapter,
  zohoBooksAdapter,
  plaidAdapter,
  tinkAdapter,
  diroAdapter,
  domainAdapter
];
var bySlug2 = new Map(adapters.map((a) => [a.slug, a]));
function getProviderAdapter(slug) {
  return bySlug2.get(slug);
}

// ../../lib/integrations-sync/src/verificationLog.ts
var PREFIX = "[verification";
function workerDebugEnabled() {
  if (process.env.SYNC_WORKER_VERIFICATION_DEBUG === "1") return true;
  return process.env.NODE_ENV !== "production";
}
function verificationWorkerLog(phase, message, data) {
  if (!workerDebugEnabled()) return;
  const tag = `${PREFIX}:${phase}]`;
  if (data && Object.keys(data).length > 0) {
    console.info(tag, message, data);
  } else {
    console.info(tag, message);
  }
}
function verificationWorkerWarn(phase, message, data) {
  if (!workerDebugEnabled()) return;
  const tag = `${PREFIX}:${phase}]`;
  if (data) console.warn(tag, message, data);
  else console.warn(tag, message);
}
function verificationWorkerError(phase, message, data) {
  const tag = `${PREFIX}:${phase}]`;
  if (data) console.error(tag, message, data);
  else console.error(tag, message);
}

// ../../lib/integrations-sync/src/processJobs.ts
async function persistMetrics(supabase, startupId, connectionId, result) {
  for (const row of result.financialMetrics ?? []) {
    await supabase.from(SchemaTables.trust.financialMetrics).upsert(
      {
        startup_id: startupId,
        period_start: row.periodStart,
        period_end: row.periodEnd,
        granularity: row.granularity,
        mrr: row.mrr,
        arr: row.arr,
        net_revenue: row.netRevenue,
        refunds: row.refunds,
        currency: row.currency,
        source_connection_id: connectionId
      },
      {
        onConflict: "startup_id,period_start,granularity,source_connection_id"
      }
    );
  }
  for (const row of result.trafficMetrics ?? []) {
    await supabase.from(SchemaTables.trust.trafficMetrics).upsert(
      {
        startup_id: startupId,
        period_start: row.periodStart,
        period_end: row.periodEnd,
        sessions: row.sessions,
        users: row.users,
        pageviews: row.pageviews,
        source: row.source,
        connection_id: connectionId
      },
      { onConflict: "startup_id,period_start,connection_id" }
    );
  }
  for (const row of result.accountingMetrics ?? []) {
    await supabase.from(SchemaTables.trust.accountingMetrics).upsert(
      {
        startup_id: startupId,
        period_start: row.periodStart,
        period_end: row.periodEnd,
        revenue: row.revenue,
        cogs: row.cogs,
        opex: row.opex,
        net_income: row.netIncome,
        currency: row.currency,
        connection_id: connectionId
      },
      { onConflict: "startup_id,period_start,connection_id" }
    );
  }
  for (const row of result.bankMetrics ?? []) {
    await supabase.from(SchemaTables.trust.bankMetrics).upsert(
      {
        startup_id: startupId,
        period_start: row.periodStart,
        period_end: row.periodEnd,
        inflows: row.inflows,
        outflows: row.outflows,
        balance_avg: row.balanceAvg,
        currency: row.currency,
        connection_id: connectionId
      },
      { onConflict: "startup_id,period_start,connection_id" }
    );
  }
  if (result.verifiedRevenue) {
    const m = result.verifiedRevenue;
    const { error: vrmErr } = await supabase.from(SchemaTables.trust.verifiedRevenueMetrics).upsert(
      {
        startup_id: startupId,
        connection_id: connectionId,
        source_provider: m.source_provider,
        verified_revenue_amount: m.verified_revenue_amount,
        annualized_revenue: m.annualized_revenue,
        customer_count: m.customer_count,
        transaction_count: m.transaction_count,
        currency: m.currency,
        verification_status: m.verification_status,
        evidence_timestamp: m.evidence_timestamp,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      },
      { onConflict: "startup_id,connection_id" }
    );
    if (vrmErr) {
      verificationWorkerError(
        "sync-job",
        "verified_revenue_metrics upsert failed",
        {
          startup_id: startupId,
          connection_id: connectionId,
          error: vrmErr.message
        }
      );
      throw new Error(vrmErr.message);
    }
  }
}
async function processIntegrationSyncJob(supabase, job) {
  verificationWorkerLog("sync-job", "Processing job", {
    job_id: job.job_id,
    job_type: job.job_type,
    connection_id: job.connection_id,
    payload_keys: Object.keys(job.payload ?? {})
  });
  const { data: conn, error: connErr } = await supabase.from(SchemaTables.trust.integrations).select("id, startup_id, provider_id, external_account_id, sync_cursor").eq("id", job.connection_id).single();
  if (connErr || !conn) {
    verificationWorkerError("sync-job", "Connection missing", {
      job_id: job.job_id,
      error: connErr?.message
    });
    await supabase.rpc("complete_integration_sync_job", {
      p_job_id: job.job_id,
      p_success: false,
      p_error: connErr?.message ?? "connection missing"
    });
    return;
  }
  const { data: providerRow } = await supabase.from(SchemaTables.trust.providers).select("slug").eq("id", conn.provider_id).single();
  const providerSlug = providerRow?.slug ?? "";
  const { data: secretBundle, error: secErr } = await supabase.rpc(
    "worker_get_connection_secrets",
    { p_connection_id: job.connection_id }
  );
  const adapter = getProviderAdapter(providerSlug);
  if (!adapter) {
    await supabase.rpc("complete_integration_sync_job", {
      p_job_id: job.job_id,
      p_success: false,
      p_error: `No adapter for ${providerSlug}`
    });
    return;
  }
  let jobPayload = job.payload ?? {};
  if (providerSlug === "domain") {
    verificationWorkerLog("domain", "Resolving domain challenge for job", {
      startup_id: conn.startup_id,
      challenge_id: jobPayload.challenge_id
    });
    if (jobPayload.challenge_id) {
      const { data: ch } = await supabase.from(SchemaTables.trust.domainChallenges).select("host, expected_record, method").eq("id", jobPayload.challenge_id).single();
      if (ch) {
        jobPayload = { ...jobPayload, ...ch };
        verificationWorkerLog("domain", "Loaded challenge by id", {
          host: ch.host,
          method: ch.method,
          expected_record: ch.expected_record
        });
      }
    } else {
      const { data: ch } = await supabase.from(SchemaTables.trust.domainChallenges).select("id, host, expected_record, method").eq("startup_id", conn.startup_id).eq("status", "pending").gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (ch) {
        jobPayload = {
          ...jobPayload,
          challenge_id: ch.id,
          host: ch.host,
          expected_record: ch.expected_record,
          method: ch.method,
          sync_type: "domain_check"
        };
        verificationWorkerLog("domain", "Using latest pending challenge", {
          challenge_id: ch.id,
          host: ch.host,
          method: ch.method,
          expected_record: ch.expected_record
        });
      } else {
        verificationWorkerWarn("domain", "No pending domain challenge found", {
          startup_id: conn.startup_id
        });
      }
    }
  }
  const secret = secretBundle && typeof secretBundle === "object" && "secret" in secretBundle ? String(secretBundle.secret) : "";
  if (providerSlug !== "domain" && (!secret || secErr)) {
    await supabase.rpc("complete_integration_sync_job", {
      p_job_id: job.job_id,
      p_success: false,
      p_error: secErr?.message ?? "missing credentials"
    });
    return;
  }
  const result = await adapter.sync({
    connectionId: job.connection_id,
    startupId: conn.startup_id,
    providerSlug,
    secret,
    externalAccountId: conn.external_account_id,
    syncCursor: conn.sync_cursor ?? {},
    jobPayload
  });
  verificationWorkerLog("sync-job", "Adapter finished", {
    job_id: job.job_id,
    provider: providerSlug,
    verification_status: result.verificationStatus,
    connection_status: result.connectionStatus,
    health_status: result.healthStatus,
    last_error: result.lastError,
    verified_revenue_amount: result.verifiedRevenue?.verified_revenue_amount,
    verified_revenue_status: result.verifiedRevenue?.verification_status,
    domain_pass: providerSlug === "domain" ? result.syncCursor?.pass : void 0,
    domain_evidence: providerSlug === "domain" ? result.syncCursor?.evidence : void 0
  });
  await persistMetrics(supabase, conn.startup_id, job.connection_id, result);
  if (result.verificationDimension && result.verificationStatus) {
    if (providerSlug === "domain" && jobPayload.challenge_id) {
      const pass = result.syncCursor?.pass === true;
      verificationWorkerLog(
        "domain",
        pass ? "DNS check passed" : "DNS check failed",
        {
          challenge_id: jobPayload.challenge_id,
          host: jobPayload.host,
          expected_record: jobPayload.expected_record,
          evidence: result.syncCursor
        }
      );
      await supabase.rpc("domain_verification_apply_result", {
        p_challenge_id: jobPayload.challenge_id,
        p_pass: pass,
        p_evidence: result.syncCursor ?? {}
      });
    } else {
      const { data: provider } = await supabase.from(SchemaTables.trust.providers).select("id").eq("slug", providerSlug).single();
      await supabase.from(SchemaTables.trust.verificationResults).insert({
        startup_id: conn.startup_id,
        provider_id: provider?.id ?? null,
        connection_id: job.connection_id,
        dimension: result.verificationDimension,
        status: result.verificationStatus,
        summary: result.verificationSummary ?? {},
        evidence_ref: result.syncCursor ?? {},
        valid_from: result.verificationStatus === "pass" ? (/* @__PURE__ */ new Date()).toISOString() : null,
        valid_until: result.verificationStatus === "pass" ? new Date(
          Date.now() + (result.verificationDimension === "revenue" ? 30 * 864e5 : 30 * 864e5)
        ).toISOString() : null
      });
    }
  }
  await supabase.from(SchemaTables.trust.integrations).update({
    status: result.connectionStatus,
    health_status: result.healthStatus,
    last_sync_at: (/* @__PURE__ */ new Date()).toISOString(),
    last_error: result.lastError ?? null,
    sync_cursor: result.syncCursor ?? conn.sync_cursor,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", job.connection_id);
  await supabase.rpc("refresh_listing_gates_from_evidence", {
    p_startup_id: conn.startup_id
  });
  const syncOk = result.connectionStatus !== "error" && result.verificationStatus !== "fail";
  await supabase.rpc("complete_integration_sync_job", {
    p_job_id: job.job_id,
    p_success: syncOk,
    p_records_written: result.recordsWritten,
    p_error: result.lastError ?? null,
    p_sync_payload: result.verificationSummary ?? {}
  });
  verificationWorkerLog("sync-job", "Job complete", {
    job_id: job.job_id,
    provider: providerSlug,
    success: syncOk
  });
}
async function claimAndProcessOneJob(supabase, workerId) {
  const { data, error } = await supabase.rpc("claim_integration_sync_job", {
    p_worker_id: workerId
  });
  if (error) {
    throw new Error(error.message);
  }
  if (!data) return false;
  const job = data;
  try {
    await processIntegrationSyncJob(supabase, job);
  } catch (e) {
    await supabase.rpc("complete_integration_sync_job", {
      p_job_id: job.job_id,
      p_success: false,
      p_error: e instanceof Error ? e.message : String(e)
    });
  }
  return true;
}
async function runIntegrationSyncBatch(supabase, options) {
  verificationWorkerLog("batch", "Starting sync batch", {
    worker_id: options.workerId,
    max_jobs: options.maxJobs
  });
  let processed = 0;
  for (let i = 0; i < options.maxJobs; i++) {
    const got = await claimAndProcessOneJob(supabase, options.workerId);
    if (!got) break;
    processed += 1;
  }
  verificationWorkerLog("batch", "Batch finished", { processed });
  return { processed };
}

// ../../lib/verification-automation/src/ocr/googleDocumentAi.ts
import { createSign } from "node:crypto";
function parseServiceAccount(raw) {
  const parsed = JSON.parse(raw);
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_JSON");
  }
  return parsed;
}
async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1e3);
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" })
  ).toString("base64url");
  const claim = Buffer.from(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: sa.token_uri ?? "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600
    })
  ).toString("base64url");
  const unsigned = `${header}.${claim}`;
  const sign = createSign("RSA-SHA256");
  sign.update(unsigned);
  sign.end();
  const signature = sign.sign(sa.private_key.replace(/\\n/g, "\n")).toString("base64url");
  const jwt = `${unsigned}.${signature}`;
  const tokenRes = await fetch(
    sa.token_uri ?? "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt
      })
    }
  );
  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(tokenJson.error ?? "Google OAuth token failed");
  }
  return tokenJson.access_token;
}
function extractFields(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const regMatch = normalized.match(
    /(?:registration|company|corp(?:oration)?\.?\s*(?:no|number|#)?)[:\s#]*([A-Z0-9][A-Z0-9\-/]{4,})/i
  ) ?? normalized.match(/\b([A-Z]{1,3}\d{6,12})\b/);
  const dateMatch = normalized.match(
    /(?:incorporated|incorporation|date of incorporation)[:\s]*([0-9]{1,2}[/.-][0-9]{1,2}[/.-][0-9]{2,4}|[A-Za-z]+ \d{1,2},? \d{4})/i
  );
  const countryMatch = normalized.match(
    /(?:country|jurisdiction)[:\s]*([A-Za-z][A-Za-z\s]{2,40})/i
  );
  const nameMatch = normalized.match(
    /(?:company name|registered name|name of company)[:\s]*([^\n\r]{3,120})/i
  );
  return {
    company_name: nameMatch?.[1]?.trim() ?? null,
    registration_number: regMatch?.[1]?.trim() ?? null,
    country: countryMatch?.[1]?.trim() ?? null,
    incorporation_date: dateMatch?.[1]?.trim() ?? null
  };
}
async function runGoogleDocumentAiOcr(input) {
  const projectId = process.env.GOOGLE_DOCUMENT_AI_PROJECT_ID?.trim();
  const location = process.env.GOOGLE_DOCUMENT_AI_LOCATION?.trim() ?? "us";
  const processorId = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID?.trim();
  const saRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!projectId || !processorId || !saRaw) {
    throw new Error(
      "GOOGLE_DOCUMENT_AI_PROJECT_ID, GOOGLE_DOCUMENT_AI_PROCESSOR_ID, and GOOGLE_SERVICE_ACCOUNT_JSON are required"
    );
  }
  const sa = parseServiceAccount(saRaw);
  const token = await getAccessToken(sa);
  const endpoint = `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}:process`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      rawDocument: {
        content: Buffer.from(input.fileBytes).toString("base64"),
        mimeType: input.mimeType
      }
    })
  });
  const json2 = await res.json();
  if (!res.ok) {
    throw new Error(json2.error?.message ?? "Document AI request failed");
  }
  const rawText = json2.document?.text?.trim() ?? "";
  if (rawText.length < 8) {
    throw new Error("Document AI returned insufficient text");
  }
  const fields = extractFields(rawText);
  const confidence = fields.registration_number && fields.company_name ? 0.92 : fields.company_name ? 0.86 : 0.72;
  return {
    extracted: {
      ...fields,
      ocr_provider: "google_document_ai",
      raw_text: rawText.slice(0, 8e3)
    },
    confidence
  };
}

// ../../lib/verification-automation/src/stripeKey.ts
async function resolveStripeSecretKeyForStartup(supabase, startupId) {
  const { data: provider } = await supabase.from(SchemaTables.trust.providers).select("id").eq("slug", "stripe").maybeSingle();
  if (!provider?.id) return null;
  const { data: conn } = await supabase.from(SchemaTables.trust.integrations).select("id").eq("startup_id", startupId).eq("provider_id", provider.id).maybeSingle();
  if (!conn?.id) return null;
  const { data: bundle, error } = await supabase.rpc(
    "worker_get_connection_secrets",
    {
      p_connection_id: conn.id
    }
  );
  if (error || !bundle || typeof bundle !== "object") return null;
  const secret = bundle.secret;
  if (typeof secret !== "string" || !secret.startsWith("sk_")) return null;
  return secret.trim();
}

// ../../lib/verification-automation/src/handlers.ts
async function sendBusinessEmailVerification(input) {
  const { data: row, error } = await input.supabase.from(SchemaTables.trust.businessEmailVerifications).select("id, email").eq("id", input.verificationId).maybeSingle();
  if (error || !row)
    throw new Error(error?.message ?? "Verification not found");
  const link = `${input.publicAppUrl.replace(/\/$/, "")}/marketplace/verify-business-email?token=${encodeURIComponent(input.token)}`;
  if (input.resendApiKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Ownerr <verify@ownerr.live>",
        to: [row.email],
        subject: "Verify your business email for Ownerr",
        html: `<p>Confirm your work email to continue listing verification.</p><p><a href="${link}">Verify email</a></p><p>Link expires in 48 hours.</p>`
      })
    });
    if (!res.ok) throw new Error(`Resend failed: ${await res.text()}`);
    return { sentViaResend: true };
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "RESEND_API_KEY is required to send business email in production"
    );
  }
  console.info(`[business-email] ${row.email} \u2192 ${link}`);
  return { sentViaResend: false, devLink: link };
}
async function processRegistrationDocument(supabase, documentId) {
  const { data: doc, error } = await supabase.from(SchemaTables.trust.registrationDocuments).select("id, startup_id, storage_path, doc_type").eq("id", documentId).maybeSingle();
  if (error || !doc) throw new Error(error?.message ?? "Document not found");
  const bucket = process.env.REGISTRATION_DOCS_BUCKET?.trim() ?? "verification-documents";
  const storagePath = doc.storage_path?.trim();
  if (!storagePath) {
    await supabase.rpc("fail_registration_document", {
      p_document_id: documentId,
      p_error: "Missing storage_path"
    });
    return;
  }
  const { data: file, error: dlErr } = await supabase.storage.from(bucket).download(storagePath);
  if (dlErr || !file) {
    await supabase.rpc("fail_registration_document", {
      p_document_id: documentId,
      p_error: dlErr?.message ?? "Storage download failed"
    });
    return;
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = file.type || "application/pdf";
  const ocrProvider = process.env.VERIFICATION_OCR_PROVIDER?.trim() ?? "google_document_ai";
  if (ocrProvider !== "google_document_ai") {
    await supabase.rpc("fail_registration_document", {
      p_document_id: documentId,
      p_error: `Unsupported OCR provider: ${ocrProvider}`
    });
    return;
  }
  try {
    const { extracted, confidence } = await runGoogleDocumentAiOcr({
      fileBytes: bytes,
      mimeType
    });
    const { error: rpcErr } = await supabase.rpc(
      "complete_registration_verification",
      {
        p_document_id: documentId,
        p_extracted: extracted,
        p_confidence: confidence
      }
    );
    if (rpcErr) throw new Error(rpcErr.message);
  } catch (e) {
    const message = e instanceof Error ? e.message : "OCR failed";
    await supabase.rpc("fail_registration_document", {
      p_document_id: documentId,
      p_error: message
    });
    throw e;
  }
}
async function createStripeIdentitySession(supabase, sessionId, opts) {
  const { data: session, error } = await supabase.from(SchemaTables.trust.identitySessions).select("id, startup_id, person_verification_profile_id").eq("id", sessionId).maybeSingle();
  if (error || !session) throw new Error(error?.message ?? "Session not found");
  const base = opts.publicAppUrl.replace(/\/$/, "");
  let returnUrl = `${base}/marketplace/app/seller/verification?from=identity`;
  if (session.person_verification_profile_id) {
    const { data: profile } = await supabase.from(SchemaTables.trust.personProfiles).select("marketplace_profile_id, marketplace_profiles(desk_role)").eq("id", session.person_verification_profile_id).maybeSingle();
    const desk = profile && typeof profile === "object" && "marketplace_profiles" in profile && profile.marketplace_profiles && typeof profile.marketplace_profiles === "object" && "desk_role" in profile.marketplace_profiles ? String(
      profile.marketplace_profiles.desk_role
    ) : "seller";
    returnUrl = desk === "buyer" ? `${base}/marketplace/app/buyer/verification?from=identity` : `${base}/marketplace/app/seller/verification?from=identity`;
  } else if (session.startup_id) {
    const { data: startup } = await supabase.from(SchemaTables.marketplace.companies).select("slug").eq("id", session.startup_id).maybeSingle();
    const slug = typeof startup?.slug === "string" ? startup.slug.trim() : "";
    returnUrl = slug ? `${base}/marketplace/app/seller/companies/${encodeURIComponent(slug)}?tab=verification&from=identity` : `${base}/marketplace/app/seller/companies?from=identity`;
  }
  const params = new URLSearchParams();
  params.set("type", "document");
  params.set("metadata[ownerr_session_id]", sessionId);
  if (session.startup_id) {
    params.set("metadata[startup_id]", session.startup_id);
  }
  if (session.person_verification_profile_id) {
    params.set(
      "metadata[person_verification_profile_id]",
      session.person_verification_profile_id
    );
  }
  params.set("return_url", returnUrl);
  const res = await fetch(
    "https://api.stripe.com/v1/identity/verification_sessions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    }
  );
  const json2 = await res.json();
  if (!res.ok) {
    throw new Error(json2.error?.message ?? "Stripe Identity session failed");
  }
  const { error: updateErr } = await supabase.from(SchemaTables.trust.identitySessions).update({
    external_session_id: json2.id,
    client_secret: json2.client_secret,
    redirect_url: json2.url,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", sessionId);
  if (updateErr) throw new Error(updateErr.message);
  return { url: json2.url ?? returnUrl, clientSecret: json2.client_secret ?? "" };
}
async function syncStripeIdentitySessionsForStartup(supabase, startupId) {
  const stripeKey = await resolveStripeSecretKeyForStartup(supabase, startupId);
  if (!stripeKey) return 0;
  const { data: sessions, error } = await supabase.from(SchemaTables.trust.identitySessions).select("id, external_session_id, status").eq("startup_id", startupId).in("status", ["pending"]).not("external_session_id", "is", null).order("created_at", { ascending: false }).limit(5);
  if (error || !sessions?.length) return 0;
  let updated = 0;
  for (const row of sessions) {
    const extId = row.external_session_id;
    if (!extId) continue;
    const res = await fetch(
      `https://api.stripe.com/v1/identity/verification_sessions/${encodeURIComponent(extId)}`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    );
    const json2 = await res.json();
    if (!res.ok) continue;
    const status = json2.status ?? "";
    if (status === "verified") {
      const { error: rpcErr } = await supabase.rpc(
        "webhook_apply_identity_verification",
        {
          p_provider: "stripe_identity",
          p_external_event_id: `poll_${extId}_${Date.now()}`,
          p_session_id: row.id,
          p_verified: true,
          p_payload: { source: "stripe_poll", status }
        }
      );
      if (!rpcErr) updated += 1;
    } else if (status === "canceled" || status === "requires_input") {
      const failed = status === "canceled";
      if (failed) {
        const { error: rpcErr } = await supabase.rpc(
          "webhook_apply_identity_verification",
          {
            p_provider: "stripe_identity",
            p_external_event_id: `poll_${extId}_${Date.now()}`,
            p_session_id: row.id,
            p_verified: false,
            p_payload: { source: "stripe_poll", status }
          }
        );
        if (!rpcErr) updated += 1;
      }
    }
  }
  return updated;
}

// ../../lib/verification-automation/src/businessEmailLaunch.ts
import { createHash } from "node:crypto";
var LAUNCH_TOKENS = SchemaTables.system.businessEmailLaunchTokens;
function sha256Hex(value) {
  return createHash("sha256").update(value.trim()).digest("hex");
}
async function consumeBusinessEmailLaunchToken(supabase, launchToken, verificationId) {
  const trimmedToken = launchToken.trim();
  const trimmedId = verificationId.trim();
  if (trimmedToken.length < 16 || !trimmedId) {
    return { ok: false, reason: "missing_token_or_verification_id" };
  }
  const { data, error } = await supabase.rpc(
    "consume_business_email_launch_token",
    {
      p_token: trimmedToken,
      p_verification_id: trimmedId
    }
  );
  if (!error && data === true) {
    return { ok: true };
  }
  const tokenHash = sha256Hex(trimmedToken);
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const { data: row, error: selectError } = await supabase.from(LAUNCH_TOKENS).select("id").eq("verification_id", trimmedId).eq("token_hash", tokenHash).is("consumed_at", null).gt("expires_at", nowIso).maybeSingle();
  if (selectError) {
    const msg = selectError.message ?? "select_failed";
    if (msg.includes("does not exist") || msg.includes("business_email_launch_tokens")) {
      return {
        ok: false,
        reason: "business_email_launch_tokens missing \u2014 apply migration 20260702370000_business_email_client_launch.sql"
      };
    }
    return { ok: false, reason: msg };
  }
  if (!row?.id) {
    return {
      ok: false,
      reason: error?.message ?? "launch_token_invalid_or_expired"
    };
  }
  const { error: updateError } = await supabase.from(LAUNCH_TOKENS).update({ consumed_at: nowIso }).eq("id", row.id).is("consumed_at", null);
  if (updateError) {
    return { ok: false, reason: updateError.message };
  }
  return { ok: true };
}

// api/_lib/supabaseService.ts
import { createClient } from "@supabase/supabase-js";
function getSupabaseServiceClient() {
  const url = process.env.SUPABASE_URL?.trim() ?? process.env.VITE_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

// api/_lib/syncWorkerHandlers.ts
function json(status, payload, opts) {
  return {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(opts?.origin)
    },
    body: JSON.stringify(payload)
  };
}
function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    Vary: "Origin"
  };
}
async function authorizeProcessJobs(supabase, authorization, cronSecret, bodyJson) {
  const auth = authorization ?? "";
  if (cronSecret && auth === `Bearer ${cronSecret}`) {
    return true;
  }
  const startupId = bodyJson.startup_id;
  const launchToken = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!launchToken || !startupId) {
    return false;
  }
  const { data, error } = await supabase.rpc("consume_sync_worker_launch_token", {
    p_token: launchToken,
    p_startup_id: startupId
  });
  return !error && data === true;
}
async function handleSyncWorkerHttpRequest(input) {
  const path = input.path.split("?")[0] ?? input.path;
  const method = input.method.toUpperCase();
  const cronSecret = process.env.SYNC_WORKER_CRON_SECRET?.trim();
  if (method === "OPTIONS") {
    return { status: 204, headers: corsHeaders(input.origin), body: "" };
  }
  if (path === "/health" && method === "GET") {
    return json(200, { ok: true }, { origin: input.origin });
  }
  let supabase;
  try {
    supabase = getSupabaseServiceClient();
  } catch (e) {
    return json(
      503,
      {
        error: "Verification API is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the host.",
        detail: e instanceof Error ? e.message : String(e)
      },
      { origin: input.origin }
    );
  }
  if (path === "/v1/process-jobs" && method === "POST") {
    let maxJobs = 10;
    let bodyJson = {};
    try {
      if (input.body) {
        bodyJson = JSON.parse(input.body);
        if (typeof bodyJson.max_jobs === "number" && bodyJson.max_jobs > 0) {
          maxJobs = Math.min(50, bodyJson.max_jobs);
        }
      }
    } catch {
    }
    const authorized = await authorizeProcessJobs(
      supabase,
      input.authorization,
      cronSecret,
      bodyJson
    );
    if (!authorized) {
      return json(
        401,
        {
          error: cronSecret ? "unauthorized" : "unauthorized \u2014 set SYNC_WORKER_CRON_SECRET or use a valid launch token with startup_id"
        },
        { origin: input.origin }
      );
    }
    try {
      const result = await runIntegrationSyncBatch(supabase, {
        workerId: process.env.SYNC_WORKER_ID ?? "inline-api",
        maxJobs
      });
      let identityPollUpdated = 0;
      if (bodyJson.startup_id) {
        identityPollUpdated = await syncStripeIdentitySessionsForStartup(
          supabase,
          bodyJson.startup_id
        );
        if (identityPollUpdated > 0) {
          await supabase.rpc("refresh_listing_gates_from_evidence", {
            p_startup_id: bodyJson.startup_id
          });
        }
      }
      return json(
        200,
        { ok: true, ...result, identity_poll_updated: identityPollUpdated },
        { origin: input.origin }
      );
    } catch (e) {
      return json(
        500,
        { error: e instanceof Error ? e.message : String(e) },
        { origin: input.origin }
      );
    }
  }
  if (path === "/v1/verification/send-business-email" && method === "POST") {
    let body = {};
    try {
      body = JSON.parse(input.body || "{}");
    } catch {
      return json(400, { error: "invalid json" }, { origin: input.origin });
    }
    const auth = input.authorization ?? "";
    let emailAuthorized = cronSecret && auth === `Bearer ${cronSecret}`;
    if (!emailAuthorized && body.verification_id) {
      const launchToken = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
      if (launchToken) {
        const consumed = await consumeBusinessEmailLaunchToken(
          supabase,
          launchToken,
          body.verification_id
        );
        emailAuthorized = consumed.ok;
      }
    }
    if (!emailAuthorized) {
      return json(401, { error: "unauthorized" }, { origin: input.origin });
    }
    if (!body.verification_id || !body.token) {
      return json(
        400,
        { error: "verification_id and token required" },
        { origin: input.origin }
      );
    }
    try {
      const result = await sendBusinessEmailVerification({
        supabase,
        verificationId: body.verification_id,
        token: body.token,
        publicAppUrl: process.env.MARKETPLACE_PUBLIC_URL?.trim() ?? process.env.VITE_PUBLIC_SITE_URL?.trim() ?? "http://localhost:5173",
        resendApiKey: process.env.RESEND_API_KEY
      });
      return json(
        200,
        {
          ok: true,
          sent_via_resend: result.sentViaResend,
          dev_link: result.devLink ?? null
        },
        { origin: input.origin }
      );
    } catch (e) {
      return json(
        500,
        { error: e instanceof Error ? e.message : String(e) },
        { origin: input.origin }
      );
    }
  }
  if (path === "/v1/identity/session" && method === "POST") {
    let body = {};
    try {
      body = JSON.parse(input.body || "{}");
    } catch {
      return json(400, { error: "invalid json" }, { origin: input.origin });
    }
    const auth = input.authorization ?? "";
    let authorized = cronSecret && auth === `Bearer ${cronSecret}`;
    if (!authorized && body.session_id) {
      const launchToken = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
      if (launchToken) {
        const { data, error } = await supabase.rpc("consume_identity_launch_token", {
          p_token: launchToken,
          p_session_id: body.session_id
        });
        authorized = !error && data === true;
      }
    }
    if (!authorized) {
      return json(401, { error: "unauthorized" }, { origin: input.origin });
    }
    if (!body.session_id) {
      return json(400, { error: "session_id required" }, { origin: input.origin });
    }
    const { data: idSession } = await supabase.from(SchemaTables.trust.identitySessions).select("startup_id, person_verification_profile_id").eq("id", body.session_id).maybeSingle();
    let stripeKey = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
    if (idSession?.startup_id) {
      const sellerKey = await resolveStripeSecretKeyForStartup(
        supabase,
        idSession.startup_id
      );
      if (sellerKey) stripeKey = sellerKey;
    }
    if (!stripeKey) {
      return json(
        503,
        {
          error: idSession?.person_verification_profile_id ? "Platform Stripe is not configured for identity verification." : "Connect your Stripe API key in step 1 (Revenue) first."
        },
        { origin: input.origin }
      );
    }
    const publicAppUrl = process.env.MARKETPLACE_PUBLIC_URL?.trim() ?? process.env.VITE_PUBLIC_SITE_URL?.trim() ?? "http://localhost:5173";
    try {
      const session = await createStripeIdentitySession(
        supabase,
        body.session_id,
        { stripeSecretKey: stripeKey, publicAppUrl }
      );
      return json(200, session, { origin: input.origin });
    } catch (e) {
      return json(
        500,
        { error: e instanceof Error ? e.message : String(e) },
        { origin: input.origin }
      );
    }
  }
  if (path === "/v1/verification/process-registration" && method === "POST") {
    if (!cronSecret || input.authorization !== `Bearer ${cronSecret}`) {
      return json(401, { error: "unauthorized" }, { origin: input.origin });
    }
    let body = {};
    try {
      body = JSON.parse(input.body || "{}");
    } catch {
      return json(400, { error: "invalid json" }, { origin: input.origin });
    }
    if (!body.document_id) {
      return json(400, { error: "document_id required" }, { origin: input.origin });
    }
    try {
      await processRegistrationDocument(supabase, body.document_id);
      return json(200, { ok: true }, { origin: input.origin });
    } catch (e) {
      return json(
        500,
        { error: e instanceof Error ? e.message : String(e) },
        { origin: input.origin }
      );
    }
  }
  return json(404, { error: "not found" }, { origin: input.origin });
}
export {
  handleSyncWorkerHttpRequest
};
