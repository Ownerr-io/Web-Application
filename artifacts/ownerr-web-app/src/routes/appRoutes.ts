import { MARKETPLACE_ROUTES } from '@/routing/routeRegistry';

/** Marketplace authenticated workspace (canonical). */
export const marketplaceAppRoutes = {
  hub: MARKETPLACE_ROUTES.app,
  buyer: MARKETPLACE_ROUTES.buyer,
  buyerAcquire: MARKETPLACE_ROUTES.buyerAcquire,
  buyerInterests: MARKETPLACE_ROUTES.buyerInterests,
  buyerBids: MARKETPLACE_ROUTES.buyerBids,
  founder: MARKETPLACE_ROUTES.founderHub,
  founderListings: MARKETPLACE_ROUTES.founderListings,
  founderInbox: MARKETPLACE_ROUTES.founderInbox,
  founderProfile: MARKETPLACE_ROUTES.founderProfile,
  founderVerification: MARKETPLACE_ROUTES.founderVerification,
} as const;

/** @deprecated Use marketplaceAppRoutes */
export const appRoutes = {
  ...marketplaceAppRoutes,
  settings: MARKETPLACE_ROUTES.settings,
  messages: MARKETPLACE_ROUTES.app,
  bids: MARKETPLACE_ROUTES.buyerBids,
  hub: MARKETPLACE_ROUTES.app,
  seller: MARKETPLACE_ROUTES.founderHub,
  sellerListings: MARKETPLACE_ROUTES.founderListings,
  sellerInbox: MARKETPLACE_ROUTES.founderInbox,
  sellerVerification: MARKETPLACE_ROUTES.founderListings,
  sellerProfile: MARKETPLACE_ROUTES.sellerProfile,
  buyerProfile: MARKETPLACE_ROUTES.buyer,
} as const;

export type AppRouteKey = keyof typeof appRoutes;
