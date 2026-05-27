import type { AuthRole } from '@/lib/auth/types';
import { MARKETPLACE_ROUTES } from '@/routing/routeRegistry';
import { normalizePathname } from '@/routing/routeResolver';

/** Infer desk role from marketplace app URL (buyer vs seller desk). */
export function inferAuthRoleFromMarketplaceAppPath(pathname: string): AuthRole | null {
  const path = normalizePathname(pathname);
  if (!path.startsWith('/marketplace/app')) return null;
  if (path.startsWith(`${MARKETPLACE_ROUTES.buyer}/`) || path === MARKETPLACE_ROUTES.buyer) {
    return 'buyer';
  }
  if (
    path.startsWith(`${MARKETPLACE_ROUTES.seller}/`) ||
    path === MARKETPLACE_ROUTES.seller ||
    path.includes('/marketplace/app/seller')
  ) {
    return 'founder';
  }
  if (path.includes('/buyer')) return 'buyer';
  if (path.includes('/seller') || path.includes('/founder')) return 'founder';
  return null;
}
