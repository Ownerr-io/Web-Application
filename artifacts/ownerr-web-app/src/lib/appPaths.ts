/** Public marketplace discovery + listings (first-class product surface). */
export const MARKETPLACE_BASE = '/marketplace';

/** Authenticated operational hub + role dashboards. */
export const APP_BASE = '/app';

/**
 * Build a path under `/marketplace`.
 * `marketplacePath('/')` → `/marketplace`
 */
export function marketplacePath(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (p === '/') return MARKETPLACE_BASE;
  return `${MARKETPLACE_BASE}${p}`;
}

/**
 * Build a path under `/app` (dashboard only — not public marketplace).
 * `appPath('/')` → `/app`
 */
export function appPath(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (p === '/') return APP_BASE;
  return `${APP_BASE}${p}`;
}

/** @deprecated Use MARKETPLACE_BASE — kept for gradual migration of string checks */
export const APP_MARKETPLACE_BASE = MARKETPLACE_BASE;
