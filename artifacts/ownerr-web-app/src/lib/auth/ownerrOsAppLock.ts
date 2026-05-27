import { persistProductIntent } from '@/lib/auth/productLock';
import { normalizePathname } from '@/routing/routeResolver';
import { PRODUCT_ROUTES } from '@/routing/routeRegistry';

/** Authenticated OWNERR OS workspace routes. */
export function isOwnerrOsAppPath(pathname: string): boolean {
  return normalizePathname(pathname).startsWith('/ownerr-os/app');
}

/** Paths a signed-in OWNERR OS user may visit without leaving the product shell. */
export function isPathAllowedForOwnerrOsAppLock(pathname: string): boolean {
  const path = normalizePathname(pathname);
  if (isOwnerrOsAppPath(path)) return true;
  if (path.startsWith('/products/ownerr-os/callback')) return true;
  if (path.startsWith('/share/founder/')) return true;
  return false;
}

export function ownerrOsAppHomeHref(): string {
  return PRODUCT_ROUTES.ownerrOsDashboard;
}

export function applyOwnerrOsProductLock(): void {
  persistProductIntent('ownerr_os');
}
