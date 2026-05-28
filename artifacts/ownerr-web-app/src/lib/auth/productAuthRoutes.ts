import type { AppSlug } from "@workspace/api-zod";
import { marketplacePortalAuthPath } from "@/lib/auth/marketplacePortalAuth";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";

function productBase(slug: AppSlug): string {
  if (slug === "ownerr_os") return "/products/ownerr-os";
  if (slug === "marketplace") return "/products/marketplace";
  return "/products/ownerr-network";
}

export type ProductAuthPage =
  | "login"
  | "register"
  | "callback"
  | "forgot-password";

export function productAuthPath(slug: AppSlug, page: ProductAuthPage): string {
  const base = productBase(slug);
  if (page === "login") return `${base}/login`;
  if (page === "register") return `${base}/register`;
  if (page === "callback") return `${base}/callback`;
  return `${base}/forgot-password`;
}

/** Marketplace uses `/marketplace/login` (portal), not `/products/marketplace/login`. */
export function resolveProductAuthPath(
  slug: AppSlug,
  page: ProductAuthPage,
): string {
  if (slug === "marketplace") {
    if (page === "login") return marketplacePortalAuthPath("login");
    if (page === "register") return marketplacePortalAuthPath("register");
    if (page === "callback") return marketplacePortalAuthPath("callback");
    return marketplacePortalAuthPath("forgot-password");
  }
  return productAuthPath(slug, page);
}

export function productLandingPath(slug: AppSlug): string {
  if (slug === "marketplace") return MARKETPLACE_ROUTES.root;
  return productBase(slug);
}

export function parseProductSlugFromAuthPath(pathname: string): AppSlug | null {
  const path = pathname.replace(/\/$/, "");
  if (path.startsWith("/products/ownerr-os")) return "ownerr_os";
  if (path.startsWith("/products/marketplace")) return "marketplace";
  if (path.startsWith("/products/ownerr-network")) return "ownerr_network";
  if (
    path.startsWith("/marketplace/login") ||
    path.startsWith("/marketplace/register")
  ) {
    return "marketplace";
  }
  if (
    path.startsWith("/marketplace/callback") ||
    path.startsWith("/marketplace/forgot-password")
  ) {
    return "marketplace";
  }
  return null;
}

export function isProductAuthPath(pathname: string): boolean {
  const path = pathname.replace(/\/$/, "");
  if (
    path.startsWith("/marketplace/") &&
    /\/(login|register|callback|forgot-password)$/.test(path)
  ) {
    return true;
  }
  return (
    parseProductSlugFromAuthPath(pathname) !== null &&
    /\/(login|register|callback|forgot-password)$/.test(pathname)
  );
}
