import { marketingRoutes } from '@/routes/marketingRoutes';
import { marketplaceRoutes } from '@/routes/marketplaceRoutes';
import { appPath } from '@/lib/appPaths';
import type { AuthRole } from '@/lib/mockAuthService';

/** Primary global navigation (order = display order). */
export const primaryNavItems = [
  { id: 'home', label: 'Home', href: marketingRoutes.home },
  { id: 'marketplace', label: 'Marketplace', href: marketplaceRoutes.root },
  { id: 'intelligence', label: 'Intelligence', href: marketingRoutes.marketIntelligence },
  { id: 'valuation', label: 'Valuation', href: marketingRoutes.valuation },
  { id: 'howItWorks', label: 'How It Works', href: marketingRoutes.howItWorks },
  { id: 'pricing', label: 'Pricing', href: marketingRoutes.pricing },
] as const;

export const runValuationHref = marketingRoutes.valuation;

/** Authenticated app entry: role overview inside `/app` (not public marketplace). */
export function appDeskHrefForRole(role: AuthRole): string {
  return role === 'buyer' ? appPath('/buyer') : appPath('/seller');
}

/** Desk hub at `/app` (optional entry when role is unknown). */
export function dashboardHref(): string {
  return appPath('/');
}

/** True when this primary item should show “active” styling. */
export function isPrimaryNavActive(location: string, href: string): boolean {
  if (href === marketingRoutes.home) return location === '/' || location === '';
  if (href === marketplaceRoutes.root) {
    return location === marketplaceRoutes.root || location === `${marketplaceRoutes.root}/`;
  }
  if (href.startsWith(marketplaceRoutes.root + '/')) {
    return location === href || location.startsWith(`${href}/`);
  }
  return location === href || location.startsWith(`${href}?`);
}
