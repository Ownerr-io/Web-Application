import type { AuthRole } from '@/lib/auth/types';
import { isDemoAccountEmail, showDemoAccountHints } from '@/lib/demo/demoAccountCatalog';
import { persistProductIntent } from '@/lib/auth/productLock';
import { marketplaceWorkspaceForRole } from '@/routing/navigationRegistry';
import { normalizePathname } from '@/routing/routeResolver';

/** Demo marketplace accounts stay inside Marketplace until explicit logout. */
export function isDemoMarketplaceLockedSession(email: string | null | undefined): boolean {
  return showDemoAccountHints() && isDemoAccountEmail(email);
}

export function isPathAllowedForDemoMarketplaceLock(pathname: string): boolean {
  const path = normalizePathname(pathname);
  return path === '/marketplace' || path.startsWith('/marketplace/');
}

export function demoMarketplaceHomeHref(role: AuthRole | null): string {
  return marketplaceWorkspaceForRole(role ?? 'buyer');
}

export function applyDemoMarketplaceProductLock(): void {
  persistProductIntent('marketplace');
}
