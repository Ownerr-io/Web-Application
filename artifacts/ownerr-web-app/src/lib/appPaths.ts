import { MARKETPLACE_ROUTES } from '@/routing/routeRegistry';

export const MARKETPLACE_BASE = MARKETPLACE_ROUTES.root;

/** @deprecated Use MARKETPLACE_ROUTES — marketplace app lives under /marketplace/app */
export const APP_BASE = MARKETPLACE_ROUTES.app;

export function marketplacePath(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (p === '/') return MARKETPLACE_BASE;
  return `${MARKETPLACE_BASE}${p}`;
}

/** @deprecated Use marketplaceAppRoutes / MARKETPLACE_ROUTES */
export function appPath(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (p === '/' || p === '') return MARKETPLACE_ROUTES.app;
  return `${MARKETPLACE_ROUTES.app}${p}`;
}
