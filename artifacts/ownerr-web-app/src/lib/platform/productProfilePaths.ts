import {
  MARKETPLACE_ROUTES,
  PRODUCT_ROUTES,
  type AuthenticatedWorkspace,
} from "@/routing/routeRegistry";

/** Canonical profile URL per product (includes marketplace buyer vs seller desk). */
export function productProfilePath(
  product: AuthenticatedWorkspace,
  pathname?: string,
): string {
  if (product === "marketplace") {
    if (pathname?.includes("/marketplace/app/buyer")) {
      return MARKETPLACE_ROUTES.buyerProfile;
    }
    return MARKETPLACE_ROUTES.sellerProfile;
  }
  if (product === "ownerr-os") {
    return PRODUCT_ROUTES.ownerrOsProfile;
  }
  return PRODUCT_ROUTES.ownerrNetworkProfile;
}

/** @deprecated Use productProfilePath — settings live on Profile. */
export const productSettingsPath = productProfilePath;

export function marketplaceProfilePathForPathname(pathname: string): string {
  return productProfilePath("marketplace", pathname);
}
