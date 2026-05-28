import { resolveProductAuthPath } from "@/lib/auth/productAuthRoutes";
import { PRODUCT_ROUTES } from "@/routing/routeRegistry";

export function buildOwnerrOsGoogleRedirect(returnTo?: string): string {
  const callbackPath = resolveProductAuthPath("ownerr_os", "callback");
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const dest = returnTo ?? PRODUCT_ROUTES.ownerrOsDashboard;
  const returnToEnc = encodeURIComponent(dest);
  return `${window.location.origin}${base}${callbackPath}?returnTo=${returnToEnc}`;
}
