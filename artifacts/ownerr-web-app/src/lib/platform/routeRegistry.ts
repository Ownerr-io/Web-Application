/** Re-exports canonical routing — use `@/routing/*` for new code. */
export {
  ROUTE_REGISTRY,
  DEFAULT_ROUTE,
  PUBLIC_ROUTES,
  PRODUCT_ROUTES,
  MARKETPLACE_ROUTES,
  PRODUCT_AUTH_ROUTES,
  PROTECTED_ROUTES,
  type RouteDefinition,
  type RouteLayer,
  type RouteProduct,
  type RouteRole,
  type LayoutShell,
} from '@/routing/routeRegistry';

export {
  normalizePathname,
  resolveRoute,
  isAuthRoute,
  isPublicRoute,
  isProtectedRoute,
} from '@/routing/routeResolver';

export {
  resolveProduct,
  resolveAuthProduct,
  resolveProductContext,
  resolveAuthenticatedWorkspace,
  resolveSidebarNavGroup,
} from '@/routing/productResolver';
export type { SidebarNavGroup } from '@/routing/productResolver';

import type { PlatformLayer, ProductApp, RouteAccessRule } from '@/lib/platform/types';
import { ROUTE_REGISTRY as CANONICAL_ROUTES, type RouteDefinition } from '@/routing/routeRegistry';
import { resolveRoute } from '@/routing/routeResolver';

function toAccessRule(route: RouteDefinition): RouteAccessRule {
  const layer: PlatformLayer =
    route.layer === 'auth' ? 'auth' : route.authRequired ? 'protected' : 'public';
  const productApp: ProductApp =
    route.layer === 'marketplace'
      ? 'marketplace'
      : route.product === 'ownerr-os'
        ? 'ownerr-os'
        : route.product === 'ownerr-network'
          ? 'ownerr-network'
          : 'platform';

  return {
    prefix: route.pathname,
    layer,
    productApp,
    publicAccess: route.publicAccess,
    authRequired: route.authRequired,
    authProduct: route.authProduct,
    credentialProfile:
      route.product === 'ownerr-network'
        ? 'ownerr-network'
        : route.layer === 'marketplace' || route.product === 'ownerr-os'
          ? 'desk'
          : null,
    postLoginDefault: route.postLoginDefault,
    signupDefaultRole: route.requiredRoles?.includes('founder')
      ? 'founder'
      : route.requiredRoles?.includes('buyer')
        ? 'buyer'
        : null,
  };
}

export const ROUTE_ACCESS_RULES = CANONICAL_ROUTES.map(toAccessRule);

export function matchRouteRule(pathname: string): RouteAccessRule {
  return toAccessRule(resolveRoute(pathname));
}

export const PRODUCT_CONTEXT_PREFIX_MAP: Readonly<Record<string, ProductApp>> = {
  '/products/ownerr-os': 'ownerr-os',
  '/ownerr-os': 'ownerr-os',
  '/products/ownerr-network': 'ownerr-network',
  '/ownerr-network': 'ownerr-network',
  '/share/network': 'ownerr-network',
  '/share/founder': 'ownerr-os',
  '/marketplace': 'marketplace',
};

export function resolveProductApp(pathname: string): ProductApp {
  return matchRouteRule(pathname).productApp;
}

export function getRouteLayer(pathname: string): PlatformLayer {
  return matchRouteRule(pathname).layer;
}
