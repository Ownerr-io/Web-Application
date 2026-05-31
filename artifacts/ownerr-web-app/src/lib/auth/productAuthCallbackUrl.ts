import type { AppSlug } from "@workspace/api-zod";
import { marketplacePortalAuthPath } from "@/lib/auth/marketplacePortalAuth";
import { resolveProductAuthPath } from "@/lib/auth/productAuthRoutes";
import { sanitizePostAuthRedirectParam } from "@/routing/authResolver";

/** OAuth / magic link redirect target for a product auth callback. */
export function buildProductAuthCallbackUrl(appSlug: AppSlug): string {
  const onMarketplacePortal =
    appSlug === "marketplace" &&
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/marketplace/");
  const callbackPath = onMarketplacePortal
    ? marketplacePortalAuthPath("callback")
    : resolveProductAuthPath(appSlug, "callback");
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  const returnTo = sanitizePostAuthRedirectParam(params.get("returnTo"));
  const qs = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
  return `${window.location.origin}${base}${callbackPath}${qs}`;
}
