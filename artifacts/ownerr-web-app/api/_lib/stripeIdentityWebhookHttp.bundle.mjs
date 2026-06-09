// ../../lib/verification-automation/src/stripeIdentityWebhookHttp.ts
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";

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

// ../../lib/verification-automation/src/handlers.ts
async function applyStripeIdentityWebhook(supabase, event, requestId) {
  const verified = event.type === "identity.verification_session.verified" || event.data.object.status === "verified";
  const failed = event.type === "identity.verification_session.canceled";
  if (!verified && !failed) return;
  const sessionId = event.data.object.metadata?.ownerr_session_id;
  if (!sessionId) {
    throw new Error(
      "Stripe Identity webhook missing metadata.ownerr_session_id"
    );
  }
  const { error } = await supabase.rpc("webhook_apply_identity_verification", {
    p_provider: "stripe_identity",
    p_external_event_id: event.id,
    p_session_id: sessionId,
    p_verified: verified,
    p_payload: {
      ...event,
      request_id: requestId ?? null
    }
  });
  if (error) throw new Error(error.message);
}

// ../../lib/verification-automation/src/stripeIdentityWebhookHttp.ts
var STRIPE_IDENTITY_WEBHOOK_PATH = "/api/webhooks/stripe/identity";
var LEGACY_STRIPE_IDENTITY_WEBHOOK_PATH = "/v1/webhooks/identity/stripe";
function isStripeIdentityWebhookPath(urlPath) {
  const path = urlPath.split("?")[0];
  return path === STRIPE_IDENTITY_WEBHOOK_PATH || path === LEGACY_STRIPE_IDENTITY_WEBHOOK_PATH;
}
function isLegacyStripeIdentityWebhookPath(urlPath) {
  const path = urlPath.split("?")[0];
  return path === LEGACY_STRIPE_IDENTITY_WEBHOOK_PATH;
}
var DEFAULT_TOLERANCE_SEC = 300;
function verifyStripeWebhookSignature(payload, header, secret, toleranceSeconds = DEFAULT_TOLERANCE_SEC) {
  const parts = header.split(",").reduce(
    (acc, piece) => {
      const [k, v] = piece.split("=");
      if (k === "t") acc.t = v;
      if (k === "v1") acc.v1.push(v);
      return acc;
    },
    { t: "", v1: [] }
  );
  if (!parts.t || parts.v1.length === 0) return false;
  const timestamp = Number.parseInt(parts.t, 10);
  if (!Number.isFinite(timestamp)) return false;
  const age = Math.abs(Math.floor(Date.now() / 1e3) - timestamp);
  if (age > toleranceSeconds) return false;
  const signed = `${parts.t}.${payload}`;
  const expected = createHmac("sha256", secret).update(signed, "utf8").digest("hex");
  return parts.v1.some((sig) => {
    try {
      const a = Buffer.from(sig, "hex");
      const b = Buffer.from(expected, "hex");
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  });
}
async function handleStripeIdentityWebhookHttp(supabase, opts) {
  const requestId = randomUUID();
  const started = Date.now();
  const json = { "Content-Type": "application/json" };
  const { rawBody, stripeSignatureHeader, webhookSecret, isProduction } = opts;
  if (isProduction && !webhookSecret) {
    return {
      status: 503,
      body: JSON.stringify({
        error: "STRIPE_IDENTITY_WEBHOOK_SECRET required in production"
      }),
      contentType: json["Content-Type"]
    };
  }
  if (webhookSecret) {
    if (typeof stripeSignatureHeader !== "string" || !verifyStripeWebhookSignature(
      rawBody,
      stripeSignatureHeader,
      webhookSecret
    )) {
      return {
        status: 400,
        body: JSON.stringify({ error: "invalid signature" }),
        contentType: json["Content-Type"]
      };
    }
  }
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: "", contentType: void 0 };
  }
  try {
    await applyStripeIdentityWebhook(supabase, event, requestId);
    console.info(
      JSON.stringify({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        request_id: requestId,
        route: STRIPE_IDENTITY_WEBHOOK_PATH,
        rpc_name: "webhook_apply_identity_verification",
        duration_ms: Date.now() - started,
        status: "ok"
      })
    );
    return {
      status: 200,
      body: JSON.stringify({ received: true }),
      contentType: json["Content-Type"]
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(
      JSON.stringify({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        request_id: requestId,
        route: STRIPE_IDENTITY_WEBHOOK_PATH,
        rpc_name: "webhook_apply_identity_verification",
        duration_ms: Date.now() - started,
        status: "error",
        error_code: "WEBHOOK_FAILED",
        message
      })
    );
    return {
      status: 500,
      body: JSON.stringify({ error: message }),
      contentType: json["Content-Type"]
    };
  }
}
export {
  LEGACY_STRIPE_IDENTITY_WEBHOOK_PATH,
  STRIPE_IDENTITY_WEBHOOK_PATH,
  handleStripeIdentityWebhookHttp,
  isLegacyStripeIdentityWebhookPath,
  isStripeIdentityWebhookPath,
  verifyStripeWebhookSignature
};
