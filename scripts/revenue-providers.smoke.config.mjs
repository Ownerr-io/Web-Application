/**
 * Credential resolution for live revenue provider smoke tests.
 * Env vars override DB connections. No mock secrets — missing creds => skipped (or fail if strict).
 */

/** @typedef {{ slug: string; secretEnv: string[]; externalEnv: string[]; oauthJson?: boolean }} ProviderSmokeProfile */

/** @type {ProviderSmokeProfile[]} */
export const REVENUE_SMOKE_PROFILES = [
  {
    slug: "stripe",
    secretEnv: ["REVENUE_SMOKE_STRIPE_SECRET", "STRIPE_SECRET_KEY"],
    externalEnv: [],
  },
  {
    slug: "paddle",
    secretEnv: ["REVENUE_SMOKE_PADDLE_API_KEY"],
    externalEnv: [],
  },
  {
    slug: "revenuecat",
    secretEnv: ["REVENUE_SMOKE_REVENUECAT_API_KEY"],
    externalEnv: ["REVENUE_SMOKE_REVENUECAT_PROJECT_ID"],
  },
  {
    slug: "chargebee",
    secretEnv: ["REVENUE_SMOKE_CHARGEBEE_API_KEY"],
    externalEnv: ["REVENUE_SMOKE_CHARGEBEE_SITE"],
  },
  {
    slug: "recurly",
    secretEnv: ["REVENUE_SMOKE_RECURLY_API_KEY"],
    externalEnv: ["REVENUE_SMOKE_RECURLY_SUBDOMAIN"],
  },
  {
    slug: "lemonsqueezy",
    secretEnv: ["REVENUE_SMOKE_LEMONSQUEEZY_API_KEY"],
    externalEnv: [],
  },
  {
    slug: "razorpay",
    secretEnv: ["REVENUE_SMOKE_RAZORPAY_CREDENTIALS"],
    externalEnv: [],
  },
  {
    slug: "paypal",
    secretEnv: ["REVENUE_SMOKE_PAYPAL_TOKEN_JSON"],
    externalEnv: [],
    oauthJson: true,
  },
  {
    slug: "square",
    secretEnv: ["REVENUE_SMOKE_SQUARE_TOKEN_JSON"],
    externalEnv: [],
    oauthJson: true,
  },
  {
    slug: "payu",
    secretEnv: ["REVENUE_SMOKE_PAYU_API_KEY"],
    externalEnv: [],
  },
  {
    slug: "shopify",
    secretEnv: ["REVENUE_SMOKE_SHOPIFY_ACCESS_TOKEN", "REVENUE_SMOKE_SHOPIFY_TOKEN_JSON"],
    externalEnv: ["REVENUE_SMOKE_SHOPIFY_SHOP"],
    oauthJson: true,
  },
  {
    slug: "woocommerce",
    secretEnv: ["REVENUE_SMOKE_WOOCOMMERCE_CREDENTIALS"],
    externalEnv: ["REVENUE_SMOKE_WOOCOMMERCE_STORE_URL"],
  },
  {
    slug: "bigcommerce",
    secretEnv: ["REVENUE_SMOKE_BIGCOMMERCE_ACCESS_TOKEN"],
    externalEnv: ["REVENUE_SMOKE_BIGCOMMERCE_STORE_HASH"],
  },
  {
    slug: "quickbooks",
    secretEnv: ["REVENUE_SMOKE_QUICKBOOKS_TOKEN_JSON"],
    externalEnv: ["REVENUE_SMOKE_QUICKBOOKS_REALM_ID"],
    oauthJson: true,
  },
  {
    slug: "xero",
    secretEnv: ["REVENUE_SMOKE_XERO_TOKEN_JSON"],
    externalEnv: ["REVENUE_SMOKE_XERO_TENANT_ID"],
    oauthJson: true,
  },
  {
    slug: "zoho_books",
    secretEnv: ["REVENUE_SMOKE_ZOHO_BOOKS_TOKEN_JSON"],
    externalEnv: ["REVENUE_SMOKE_ZOHO_BOOKS_ORG_ID"],
    oauthJson: true,
  },
  {
    slug: "plaid",
    secretEnv: ["REVENUE_SMOKE_PLAID_ACCESS_TOKEN", "REVENUE_SMOKE_PLAID_TOKEN_JSON"],
    externalEnv: [],
    oauthJson: true,
  },
  {
    slug: "tink",
    secretEnv: ["REVENUE_SMOKE_TINK_TOKEN_JSON"],
    externalEnv: [],
    oauthJson: true,
  },
];

export function firstEnv(names) {
  for (const name of names) {
    const v = process.env[name]?.trim();
    if (v) return { value: v, env: name };
  }
  return null;
}

export function resolveSecretFromEnv(profile) {
  const hit = firstEnv(profile.secretEnv);
  if (!hit) return null;
  if (profile.oauthJson) {
    try {
      JSON.parse(hit.value);
    } catch {
      return { ...hit, invalidJson: true };
    }
  }
  return hit;
}

export function resolveExternalFromEnv(profile) {
  const hit = firstEnv(profile.externalEnv);
  return hit?.value ?? null;
}
