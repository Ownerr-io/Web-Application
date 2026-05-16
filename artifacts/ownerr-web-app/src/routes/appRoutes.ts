import { appPath } from '@/lib/appPaths';

/** Authenticated app (dashboard hub + role areas). */
export const appRoutes = {
  hub: appPath('/'),
  buyer: appPath('/buyer'),
  buyerAcquire: appPath('/buyer/acquire'),
  buyerInterests: appPath('/buyer/interests'),
  buyerBids: appPath('/buyer/bids'),
  buyerProfile: appPath('/buyer/profile'),
  seller: appPath('/seller'),
  sellerListings: appPath('/seller/listings'),
  sellerInbox: appPath('/seller/inbox'),
  sellerVerification: appPath('/seller/verification'),
  sellerProfile: appPath('/seller/profile'),
  settings: appPath('/settings'),
  messages: appPath('/messages'),
  bids: appPath('/bids'),
} as const;

export type AppRouteKey = keyof typeof appRoutes;
