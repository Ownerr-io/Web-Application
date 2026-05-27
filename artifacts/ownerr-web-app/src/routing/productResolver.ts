import type { AuthProduct } from '@/lib/auth/routes';
import { resolveRoute } from '@/routing/routeResolver';
import type { SidebarNavGroup } from '@/routing/navigationRegistry';
import {
  isAuthenticatedAppShell,
  type AuthenticatedWorkspace,
  type RouteProduct,
} from '@/routing/routeRegistry';
export function resolveProduct(pathname: string): RouteProduct {
  return resolveRoute(pathname).product;
}

export function resolveAuthProduct(pathname: string): AuthProduct | null {
  return resolveRoute(pathname).authProduct;
}

export function resolveProductContext(pathname: string): 'platform' | 'marketplace' | 'ownerr-os' | 'ownerr-network' {
  const route = resolveRoute(pathname);
  if (route.layer === 'marketplace') return 'marketplace';
  if (route.product === 'ownerr-os') return 'ownerr-os';
  if (route.product === 'ownerr-network') return 'ownerr-network';
  return 'platform';
}

export function resolveAuthenticatedWorkspace(pathname: string): AuthenticatedWorkspace | null {
  const route = resolveRoute(pathname);
  if (!isAuthenticatedAppShell(route.layoutShell)) return null;
  if (route.layer === 'marketplace') return 'marketplace';
  if (route.product === 'ownerr-os') return 'ownerr-os';
  if (route.product === 'ownerr-network') return 'ownerr-network';
  return null;
}

export function resolveSidebarNavGroup(pathname: string): SidebarNavGroup | null {
  const route = resolveRoute(pathname);
  if (!isAuthenticatedAppShell(route.layoutShell)) return null;
  if (route.layer === 'marketplace') return 'marketplace';
  if (route.product === 'ownerr-os') return 'ownerr-os';
  if (route.product === 'ownerr-network') return 'ownerr-network';
  return null;
}

export type { SidebarNavGroup };
