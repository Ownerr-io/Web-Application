import { MARKETPLACE_ROUTES } from '@/routing/routeRegistry';
import { normalizePathname } from '@/routing/routeResolver';

export type MarketplacePortalAuthPage = 'login' | 'register' | 'callback' | 'forgot-password';

export function marketplacePortalAuthPath(page: MarketplacePortalAuthPage): string {
  if (page === 'login') return MARKETPLACE_ROUTES.portalLogin;
  if (page === 'register') return MARKETPLACE_ROUTES.portalRegister;
  if (page === 'callback') return MARKETPLACE_ROUTES.portalCallback;
  return MARKETPLACE_ROUTES.portalForgotPassword;
}

export function isMarketplacePortalAuthPath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  return (
    path === MARKETPLACE_ROUTES.portalLogin ||
    path === MARKETPLACE_ROUTES.portalRegister ||
    path === MARKETPLACE_ROUTES.portalCallback ||
    path === MARKETPLACE_ROUTES.portalForgotPassword
  );
}

/** Signed-in user may stay on public portal pages (not forced into desk). */
export function isMarketplacePublicPortalPath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  if (!path.startsWith('/marketplace')) return false;
  if (path.startsWith('/marketplace/app')) return false;
  if (isMarketplacePortalAuthPath(path)) return false;
  return true;
}

export function marketplacePortalLoginHref(returnTo?: string): string {
  const base = MARKETPLACE_ROUTES.portalLogin;
  if (!returnTo) return base;
  const safe = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/marketplace';
  return `${base}?returnTo=${encodeURIComponent(safe)}`;
}
