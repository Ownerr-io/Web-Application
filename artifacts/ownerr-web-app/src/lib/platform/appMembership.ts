import type { AppSlug, UserAppMembership } from '@workspace/api-zod';
import {
  AUTHENTICATED_APP_ROOTS,
  MARKETPLACE_ROUTES,
  PRODUCT_ROUTES,
  type AuthenticatedWorkspace,
} from '@/routing/routeRegistry';
import { normalizePathname, resolveRoute } from '@/routing/routeResolver';

export type { AppSlug, UserAppMembership };

export function workspaceToAppSlug(workspace: AuthenticatedWorkspace): AppSlug {
  if (workspace === 'ownerr-os') return 'ownerr_os';
  if (workspace === 'marketplace') return 'marketplace';
  return 'ownerr_network';
}

export function appSlugToWorkspace(slug: AppSlug): AuthenticatedWorkspace {
  if (slug === 'ownerr_os') return 'ownerr-os';
  if (slug === 'marketplace') return 'marketplace';
  return 'ownerr-network';
}

export function appSlugEnterPath(slug: AppSlug): string {
  if (slug === 'ownerr_os') return PRODUCT_ROUTES.ownerrOsDashboard;
  if (slug === 'marketplace') return MARKETPLACE_ROUTES.app;
  return PRODUCT_ROUTES.ownerrNetworkDashboard;
}

export function appSlugAppRoot(slug: AppSlug): string {
  if (slug === 'ownerr_os') return AUTHENTICATED_APP_ROOTS['ownerr-os'];
  if (slug === 'marketplace') return AUTHENTICATED_APP_ROOTS.marketplace;
  return AUTHENTICATED_APP_ROOTS['ownerr-network'];
}

/** App membership required to access this pathname (authenticated desk only — not public portal). */
export function resolveMembershipAppForPath(pathname: string): AppSlug | null {
  const path = normalizePathname(pathname);
  if (path.startsWith('/marketplace/app')) return 'marketplace';
  const route = resolveRoute(pathname);
  if (!route.authRequired) return null;
  if (route.product === 'ownerr-os') return 'ownerr_os';
  if (route.product === 'ownerr-network') return 'ownerr_network';
  return null;
}

export function buildMembershipMap(memberships: UserAppMembership[]): Map<AppSlug, UserAppMembership> {
  const map = new Map<AppSlug, UserAppMembership>();
  for (const m of memberships) {
    if (m.status === 'suspended') continue;
    map.set(m.appSlug, m);
  }
  return map;
}

