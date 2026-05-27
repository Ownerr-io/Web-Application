import type { AppSlug } from '@workspace/api-zod';
import {
  marketplacePortalAuthPath,
  marketplacePortalLoginHref,
} from '@/lib/auth/marketplacePortalAuth';
import { productAuthPath } from '@/lib/auth/productAuthRoutes';
import { persistProductIntent } from '@/lib/auth/productLock';
import { captureProductIntentFromPath } from '@/lib/auth/productLock';
import type { AuthHrefOptions } from '@/lib/auth/routes';
import { authLoginHref, authRegisterHref } from '@/lib/auth/routes';

export function authLoginHrefForApp(app: AppSlug): string {
  persistProductIntent(app);
  if (app === 'marketplace') return marketplacePortalAuthPath('login');
  return productAuthPath(app, 'login');
}

export function authRegisterHrefForApp(app: AppSlug): string {
  persistProductIntent(app);
  if (app === 'marketplace') return marketplacePortalAuthPath('register');
  return productAuthPath(app, 'register');
}

export function authHrefForPath(pathname: string, mode: 'login' | 'register' = 'login'): string | null {
  const slug = captureProductIntentFromPath(pathname);
  if (!slug) return null;
  return mode === 'login' ? authLoginHrefForApp(slug) : authRegisterHrefForApp(slug);
}

export function resolveLoginHref(pathname: string): string | null {
  const slug = captureProductIntentFromPath(pathname);
  if (slug === 'marketplace') {
    return marketplacePortalLoginHref(pathname);
  }
  if (!slug) return null;
  return authLoginHrefForApp(slug);
}

export { authLoginHref, authRegisterHref, type AuthHrefOptions };
