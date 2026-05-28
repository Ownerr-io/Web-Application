import { PRODUCT_ROUTES } from "@/routing/routeRegistry";

export function ownerrOsListingDetailPath(id: string): string {
  return `${PRODUCT_ROUTES.ownerrOsListings}/${encodeURIComponent(id)}`;
}
