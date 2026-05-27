import { MARKETPLACE_ROUTES } from '@/routing/routeRegistry';
import { marketplacePath } from '@/lib/appPaths';

export const marketplaceRoutes = {
  root: MARKETPLACE_ROUTES.root,
  acquire: MARKETPLACE_ROUTES.acquire,
  feed: MARKETPLACE_ROUTES.feed,
  stats: MARKETPLACE_ROUTES.stats,
  cofounders: MARKETPLACE_ROUTES.cofounders,
  claim: MARKETPLACE_ROUTES.claim,
  startup: (slug: string) => MARKETPLACE_ROUTES.startup(slug),
  founder: (handle: string) => MARKETPLACE_ROUTES.founder(handle),
  app: MARKETPLACE_ROUTES.app,
  buyer: MARKETPLACE_ROUTES.buyer,
  buyerBids: MARKETPLACE_ROUTES.buyerBids,
  buyerInterests: MARKETPLACE_ROUTES.buyerInterests,
  buyerAcquire: MARKETPLACE_ROUTES.buyerAcquire,
  founderHub: MARKETPLACE_ROUTES.founderHub,
  founderListings: MARKETPLACE_ROUTES.founderListings,
  founderInbox: MARKETPLACE_ROUTES.founderInbox,
  founderProfile: MARKETPLACE_ROUTES.founderProfile,
} as const;

export type MarketplaceRouteKey = keyof typeof marketplaceRoutes;

/** @deprecated use marketplaceRoutes */
export { marketplacePath };
