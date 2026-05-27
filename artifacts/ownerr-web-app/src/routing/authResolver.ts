import type { AuthProduct } from '@/lib/auth/routes';
import type { DeskUser } from '@/lib/auth/types';
import { actionRequiresDesk } from '@/lib/platform/authIntent';
import type { PostAuthResolveInput, StoredAuthIntent } from '@/lib/platform/types';
import {
  AUTH_ROUTES,
  MARKETPLACE_ROUTES,
  PRODUCT_ROUTES,
  PUBLIC_ROUTES,
} from '@/routing/routeRegistry';
import { marketplaceWorkspaceForRole } from '@/routing/navigationRegistry';
import {
  captureProductIntentFromPath,
  productDashboardPath,
  readActiveProduct,
} from '@/lib/auth/productLock';
import { isMarketplacePublicPortalPath } from '@/lib/auth/marketplacePortalAuth';
import {
  demoMarketplaceHomeHref,
  isDemoMarketplaceLockedSession,
  isPathAllowedForDemoMarketplaceLock,
} from '@/lib/marketplace/demoSessionLock';
import { resolveAuthProduct } from '@/routing/productResolver';
import {
  allowsAuthenticatedPublicBrowse,
  isAuthRoute,
  isGuestMarketingPath,
  normalizePathname,
  resolveRoute,
} from '@/routing/routeResolver';
import { resolveMembershipAppForPath } from '@/lib/platform/appMembership';
import type { AppSlug } from '@workspace/api-zod';

export function sanitizeRedirectParam(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null;
  if (trimmed.includes('://')) return null;
  return trimmed;
}

/** Post-auth redirects must not send users back to public marketing pages. */
export function buildAuthStartRedirect(returnTo?: string | null): string {
  const safe = sanitizeRedirectParam(returnTo ?? null);
  if (!safe) return AUTH_ROUTES.start;
  if (safe.startsWith('/marketplace/app')) {
    return `${MARKETPLACE_ROUTES.portalLogin}?returnTo=${encodeURIComponent(safe)}`;
  }
  return `${AUTH_ROUTES.start}?returnTo=${encodeURIComponent(safe)}`;
}

export function sanitizePostAuthRedirectParam(raw: string | null | undefined): string | null {
  const safe = sanitizeRedirectParam(raw);
  if (!safe) return null;
  if (isAuthRoute(safe)) return null;
  if (allowsAuthenticatedPublicBrowse(safe)) return safe;
  if (isGuestMarketingPath(safe)) {
    const product = resolveAuthProduct(safe);
    if (product === 'ownerr-os') return productDashboardPath('ownerr_os');
    if (product === 'ownerr-network') return productDashboardPath('ownerr_network');
    if (safe.startsWith('/marketplace/app')) return productDashboardPath('marketplace');
    if (isMarketplacePublicPortalPath(safe)) return safe;
    return null;
  }
  return safe;
}

export function parseAuthProductQuery(raw: string | null): AuthProduct | null {
  if (raw === 'ownerr-network' || raw === 'ownerr-os') return raw;
  return null;
}

function slugFromProduct(product: AuthProduct | null): AppSlug | null {
  if (product === 'ownerr-os') return 'ownerr_os';
  if (product === 'ownerr-network') return 'ownerr_network';
  return null;
}

function destinationForIntent(intent: StoredAuthIntent, currentUser: DeskUser | null): string | null {
  if (actionRequiresDesk(intent.action) && currentUser) {
    const safe = sanitizePostAuthRedirectParam(intent.returnPath);
    if (safe) return safe;
    return marketplaceWorkspaceForRole(currentUser.role);
  }
  if (intent.action === 'open_ownerr_network_app') {
    return PRODUCT_ROUTES.ownerrNetworkDashboard;
  }
  if (intent.action === 'open_desk' && currentUser) {
    return marketplaceWorkspaceForRole(currentUser.role);
  }
  return sanitizePostAuthRedirectParam(intent.returnPath);
}

export function resolvePostAuthDestination(input: PostAuthResolveInput): string {
  if (input.pendingIntent) {
    const fromIntent = destinationForIntent(input.pendingIntent, input.currentUser);
    const safe = sanitizePostAuthRedirectParam(fromIntent);
    if (safe) return safe;
  }

  const explicit = sanitizePostAuthRedirectParam(input.redirectParam);
  if (explicit) return explicit;

  if (input.hasSession) {
    const locked = readActiveProduct();
    if (locked) return productDashboardPath(locked);
    const fromPath = captureProductIntentFromPath(input.pathname || '/');
    if (fromPath) return productDashboardPath(fromPath);
    const fromProduct = slugFromProduct(input.product);
    if (fromProduct) return productDashboardPath(fromProduct);
  }

  const route = resolveRoute(input.pathname || '/');

  if (input.product === 'ownerr-network' || route.product === 'ownerr-network') {
    return input.hasOwnerrNetworkProfile
      ? PRODUCT_ROUTES.ownerrNetworkDashboard
      : PRODUCT_ROUTES.ownerrNetworkOnboarding;
  }

  if (input.product === 'ownerr-os' || route.product === 'ownerr-os') {
    return PRODUCT_ROUTES.ownerrOsDashboard;
  }

  if (input.currentUser) {
    return marketplaceWorkspaceForRole(input.currentUser.role);
  }

  if (input.hasSession && input.hasOwnerrNetworkProfile) {
    return PRODUCT_ROUTES.ownerrNetworkDashboard;
  }

  if (route.layer === 'marketplace') {
    return MARKETPLACE_ROUTES.root;
  }

  return PUBLIC_ROUTES.products;
}

export function buildAuthQueryContext(pathname: string): {
  product: AuthProduct | null;
  redirect: string;
} {
  const route = resolveRoute(pathname);
  return {
    product: route.authProduct,
    redirect: pathname,
  };
}

export function resolveAuthDestination(pathname: string): string {
  return resolveRoute(pathname).postLoginDefault;
}

/** Signed-in entry from navbar / auth start (membership-aware). */
export function resolveAuthenticatedAppEntry(input: {
  slugs: AppSlug[];
  activeProduct: AppSlug | null;
  currentUser: DeskUser | null;
  returnTo: string | null;
}): string {
  if (input.currentUser && isDemoMarketplaceLockedSession(input.currentUser.email)) {
    const safeReturn = sanitizePostAuthRedirectParam(input.returnTo);
    if (safeReturn && isPathAllowedForDemoMarketplaceLock(safeReturn)) return safeReturn;
    return demoMarketplaceHomeHref(input.currentUser.role);
  }

  const safeReturn = sanitizePostAuthRedirectParam(input.returnTo);
  if (safeReturn) {
    if (isMarketplacePublicPortalPath(safeReturn)) return safeReturn;
    const needed = resolveMembershipAppForPath(safeReturn);
    if (!needed || input.slugs.includes(needed)) return safeReturn;
  }

  if (input.slugs.length === 0) return PUBLIC_ROUTES.products;
  if (input.slugs.length === 1) return productDashboardPath(input.slugs[0]!);
  if (input.activeProduct && input.slugs.includes(input.activeProduct)) {
    return productDashboardPath(input.activeProduct);
  }
  if (input.currentUser) return marketplaceWorkspaceForRole(input.currentUser.role);
  return AUTH_ROUTES.start;
}

export function resolvePostAuthRedirect(input: {
  redirectParam: string | null;
  product: AuthProduct | null;
  currentUser: DeskUser | null;
  hasSession: boolean;
  pathname?: string;
  pendingIntent?: StoredAuthIntent | null;
}): string {
  return resolvePostAuthDestination({
    redirectParam: input.redirectParam,
    pathname: normalizePathname(input.pathname ?? '/'),
    product: input.product,
    currentUser: input.currentUser,
    hasSession: input.hasSession,
    pendingIntent: input.pendingIntent ?? null,
  });
}
