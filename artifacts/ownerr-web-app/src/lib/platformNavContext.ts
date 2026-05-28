import {
  isPublicRoute,
  isProtectedRoute,
  matchRouteRule,
  resolveProductApp,
  normalizePathname,
} from "@/lib/platform/routeRegistry";
import type { ProductApp } from "@/lib/platform/types";

/** @deprecated Use ProductApp from route registry */
export type PlatformProductContext = "ownerr-network" | "ownerr-os" | null;

export function getPlatformProductContext(
  location: string,
): PlatformProductContext {
  const app = resolveProductApp(location);
  if (app === "ownerr-network") return "ownerr-network";
  if (app === "ownerr-os") return "ownerr-os";
  return null;
}

export function isOwnerrNetworkRoute(location: string): boolean {
  return resolveProductApp(location) === "ownerr-network";
}

export function isOwnerrOsRoute(location: string): boolean {
  return resolveProductApp(location) === "ownerr-os";
}

export function isMarketplaceOrAppRoute(location: string): boolean {
  const app = resolveProductApp(location);
  return app === "marketplace";
}

export function isMarketplaceDiscoveryRoute(location: string): boolean {
  const path = normalizePathname(location);
  return path === "/marketplace" || path.startsWith("/marketplace/");
}

export { isPublicRoute, isProtectedRoute, matchRouteRule };

export const productContextLabels: Record<
  Exclude<PlatformProductContext, null>,
  string
> = {
  "ownerr-network": "Ownerr Network",
  "ownerr-os": "OWNERR OS",
};

export function getProductAppLabel(app: ProductApp): string | null {
  if (app === "ownerr-network") return productContextLabels["ownerr-network"];
  if (app === "ownerr-os") return productContextLabels["ownerr-os"];
  return null;
}
