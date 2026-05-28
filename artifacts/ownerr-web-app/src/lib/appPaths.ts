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

/** Public acquire page vs in-app buyer listing detail. */
export function marketplaceStartupPath(
  slug: string,
  pathname?: string,
): string {
  const loc =
    pathname ?? (typeof window !== "undefined" ? window.location.pathname : "");
  if (isMarketplaceBuyerAppPath(loc)) {
    return MARKETPLACE_ROUTES.buyerStartup(slug);
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
  return MARKETPLACE_ROUTES.founder(handle);
}

/** Browse hub for marketplace desk vs public marketing acquire. */
export function marketplaceBrowsePath(pathname?: string): string {
  const loc =
    pathname ?? (typeof window !== "undefined" ? window.location.pathname : "");
  if (isMarketplaceBuyerAppPath(loc)) {
    return MARKETPLACE_ROUTES.buyerBrowse;
  }
  return MARKETPLACE_ROUTES.acquire;
}

/** @deprecated Use marketplaceAppRoutes / MARKETPLACE_ROUTES */
export function appPath(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (p === "/" || p === "") return MARKETPLACE_ROUTES.app;
  return `${MARKETPLACE_ROUTES.app}${p}`;
}
