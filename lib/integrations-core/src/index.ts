import type { ProviderAdapter } from "./types.js";
import { stripeAdapter } from "./providers/stripe.js";
import { domainAdapter } from "./providers/domain.js";
import {
  lemonsqueezyAdapter,
  paddleAdapter,
  razorpayAdapter,
  revenuecatAdapter,
} from "./providers/revenue.js";
import {
  bigcommerceAdapter,
  chargebeeAdapter,
  paypalAdapter,
  payuAdapter,
  recurlyAdapter,
  squareAdapter,
  woocommerceAdapter,
} from "./providers/revenueExtended.js";
import {
  ahrefsAdapter,
  ga4Adapter,
  gscAdapter,
  semrushAdapter,
  similarwebAdapter,
} from "./providers/traffic.js";
import {
  diroAdapter,
  plaidAdapter,
  quickbooksAdapter,
  shopifyAdapter,
  tinkAdapter,
  xeroAdapter,
  zohoBooksAdapter,
} from "./providers/accounting-banking.js";

export * from "./types.js";
export * from "./verifiedRevenueMetrics.js";
export * from "./revenueProviderCatalog.js";
export * from "./revenueSyncHelpers.js";
export * from "./domainDnsSsrfGuard.js";
export * from "./domainDnsHostUtils.js";
export * from "./domainDnsIntelligence.js";

const adapters: ProviderAdapter[] = [
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
  domainAdapter,
];

const bySlug = new Map(adapters.map((a) => [a.slug, a]));

export function getProviderAdapter(slug: string): ProviderAdapter | undefined {
  return bySlug.get(slug);
}

export function listProviderAdapters(): ProviderAdapter[] {
  return adapters;
}
