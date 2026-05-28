import {
  DEFAULT_ROUTE,
  ROUTE_REGISTRY,
  type RouteDefinition,
} from "@/routing/routeRegistry";
import { resolveMembershipAppForPath } from "@/lib/platform/appMembership";
import type { AppSlug } from "@workspace/api-zod";

export function normalizePathname(pathname: string): string {
  const base = pathname.split("?")[0]?.split("#")[0] ?? "/";
  if (base.length > 1 && base.endsWith("/")) return base.slice(0, -1);
  return base || "/";
}

/** O(1) lookup by route id (built once at module load). */
export const ROUTE_BY_ID: ReadonlyMap<string, RouteDefinition> = new Map(
  ROUTE_REGISTRY.map((route) => [route.id, route]),
);

export function resolveRoute(pathname: string): RouteDefinition {
  const path = normalizePathname(pathname);
  for (const route of ROUTE_REGISTRY) {
    if (path === route.pathname || path.startsWith(`${route.pathname}/`)) {
      return route;
    }
  }
  return DEFAULT_ROUTE;
}

export function isAuthRoute(pathname: string): boolean {
  const path = normalizePathname(pathname);
  if (path === "/auth" || path.startsWith("/auth/")) return true;
  if (
    path === "/marketplace/login" ||
    path === "/marketplace/register" ||
    path === "/marketplace/callback" ||
    path === "/marketplace/forgot-password"
  ) {
    return true;
  }
  return (
    path.startsWith("/products/") &&
    /\/(login|register|callback|forgot-password)$/.test(path)
  );
}

export function isPublicRoute(pathname: string): boolean {
  return resolveRoute(pathname).publicAccess;
}

export function isProductAppInternalPath(pathname: string): boolean {
  return resolveRoute(pathname).appInternalRoute;
}

export function allowsAuthenticatedPublicBrowse(pathname: string): boolean {
  return resolveRoute(pathname).allowWhenAuthenticated;
}

export function resolveAppSlugForPath(pathname: string): AppSlug | null {
  return resolveMembershipAppForPath(pathname);
}

/** Marketing / browse-only pages guests see; signed-in users may still visit when allowed. */
export function isGuestMarketingPath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  if (path.startsWith("/share/")) return false;
  if (path.startsWith("/admin/")) return false;
  if (isAuthRoute(path)) return false;
  const route = resolveRoute(path);
  if (route.allowWhenAuthenticated) return false;
  if (route.authRequired) return false;
  return (
    route.layoutShell === "marketing" ||
    route.layoutShell === "marketplace-public"
  );
}

export function isProtectedRoute(pathname: string): boolean {
  return resolveRoute(pathname).authRequired;
}
