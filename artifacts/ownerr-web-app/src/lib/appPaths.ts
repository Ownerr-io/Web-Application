import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";

export const MARKETPLACE_BASE = MARKETPLACE_ROUTES.root;

/** @deprecated Use MARKETPLACE_ROUTES — marketplace app lives under /marketplace/app */
export const APP_BASE = MARKETPLACE_ROUTES.app;

export function marketplacePath(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (p === "/") return MARKETPLACE_BASE;
  return `${MARKETPLACE_BASE}${p}`;
}

/** True when the user is in the authenticated buyer desk (browse, bids, listing detail, etc.). */
export function isMarketplaceBuyerAppPath(pathname: string): boolean {
  return pathname.startsWith(`${MARKETPLACE_ROUTES.buyer}/`);
}

/** True when the user is in the authenticated seller desk. */
export function isMarketplaceSellerAppPath(pathname: string): boolean {
  return pathname.startsWith(`${MARKETPLACE_ROUTES.seller}/`);
}

/** Public acquire page vs in-app buyer/seller listing detail. */
export function marketplaceStartupPath(
  slug: string,
  pathname?: string,
): string {
  const loc =
    pathname ?? (typeof window !== "undefined" ? window.location.pathname : "");
  if (isMarketplaceBuyerAppPath(loc)) {
    return MARKETPLACE_ROUTES.buyerStartup(slug);
  }
  if (isMarketplaceSellerAppPath(loc)) {
    return MARKETPLACE_ROUTES.sellerStartup(slug);
  }
  return MARKETPLACE_ROUTES.startup(slug);
}

export function marketplaceFounderPath(
  handle: string,
  pathname?: string,
): string {
  const loc =
    pathname ?? (typeof window !== "undefined" ? window.location.pathname : "");
  if (isMarketplaceBuyerAppPath(loc)) {
    return MARKETPLACE_ROUTES.buyerFounder(handle);
  }
  if (isMarketplaceSellerAppPath(loc)) {
    return MARKETPLACE_ROUTES.sellerProfile;
  }
  return MARKETPLACE_ROUTES.founder(handle);
}

/** Seller desk: full listing detail for a company the seller owns. */
export function marketplaceSellerListingPath(slug: string): string {
  return MARKETPLACE_ROUTES.sellerStartup(slug);
}

export function marketplaceSellerVerificationPath(slug: string): string {
  return `${MARKETPLACE_ROUTES.sellerCompanyDetail(slug)}?tab=verification`;
}

export function marketplaceSellerCompanyPath(slug: string): string {
  return MARKETPLACE_ROUTES.sellerCompanyDetail(slug);
}

/** Browse hub for marketplace desk vs public marketing acquire. */
export function marketplaceBrowsePath(pathname?: string): string {
  const loc =
    pathname ?? (typeof window !== "undefined" ? window.location.pathname : "");
  if (isMarketplaceBuyerAppPath(loc)) {
    return MARKETPLACE_ROUTES.buyerBrowse;
  }
  if (isMarketplaceSellerAppPath(loc)) {
    return MARKETPLACE_ROUTES.sellerListings;
  }
  return MARKETPLACE_ROUTES.acquire;
}

/** @deprecated Use marketplaceAppRoutes / MARKETPLACE_ROUTES */
export function appPath(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (p === "/" || p === "") return MARKETPLACE_ROUTES.app;
  return `${MARKETPLACE_ROUTES.app}${p}`;
}
