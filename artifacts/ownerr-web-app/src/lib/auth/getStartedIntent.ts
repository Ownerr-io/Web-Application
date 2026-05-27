import type { AuthRole } from '@/lib/auth/types';
import type { AppSlug } from '@workspace/api-zod';

const PRODUCT_KEY = 'ownerr.get_started.product';
const MARKETPLACE_ROLE_KEY = 'ownerr.get_started.marketplace_role';

export function persistGetStartedProduct(slug: AppSlug): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(PRODUCT_KEY, slug);
  } catch {
    /* ignore */
  }
}

export function peekGetStartedProduct(): AppSlug | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(PRODUCT_KEY);
  if (raw === 'ownerr_os' || raw === 'marketplace' || raw === 'ownerr_network') return raw;
  return null;
}

export function consumeGetStartedProduct(): AppSlug | null {
  const slug = peekGetStartedProduct();
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(PRODUCT_KEY);
    } catch {
      /* ignore */
    }
  }
  return slug;
}

export function persistMarketplaceRole(role: AuthRole): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(MARKETPLACE_ROLE_KEY, role);
  } catch {
    /* ignore */
  }
}

export function consumeMarketplaceRole(): AuthRole | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(MARKETPLACE_ROLE_KEY);
    sessionStorage.removeItem(MARKETPLACE_ROLE_KEY);
    if (raw === 'buyer' || raw === 'founder') return raw;
  } catch {
    /* ignore */
  }
  return null;
}
