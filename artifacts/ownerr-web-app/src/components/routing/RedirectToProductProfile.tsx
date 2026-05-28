import { Redirect, useLocation } from "wouter";
import { marketplaceProfilePathForPathname } from "@/lib/platform/productProfilePaths";
import { PRODUCT_ROUTES } from "@/routing/routeRegistry";
import type { AuthenticatedWorkspace } from "@/routing/routeRegistry";

export function RedirectToProductProfile({
  product,
}: {
  product: AuthenticatedWorkspace;
}) {
  const [location] = useLocation();
  if (product === "marketplace") {
    return (
      <Redirect to={marketplaceProfilePathForPathname(location)} replace />
    );
  }
  if (product === "ownerr-os") {
    return <Redirect to={PRODUCT_ROUTES.ownerrOsProfile} replace />;
  }
  return <Redirect to={PRODUCT_ROUTES.ownerrNetworkProfile} replace />;
}
