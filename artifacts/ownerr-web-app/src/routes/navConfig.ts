import {
  NAV_ITEMS,
  PRODUCT_ITEMS,
  PUBLIC_NAV_CTA_ITEMS,
  isNavLinkActive,
  isProductsDropdownActive,
  marketplaceWorkspaceForRole,
  type PublicNavLink,
  type ProductNavItem,
} from "@/routing/navigationRegistry";
import { PUBLIC_ROUTES } from "@/routing/routeRegistry";
import type { AuthRole } from "@/lib/auth/types";

export type NavLinkItem = {
  id: string;
  label: string;
  href: string;
  description?: string;
};

export const productsNavItems: NavLinkItem[] = PRODUCT_ITEMS.map((p) => ({
  id: p.id,
  label: p.label,
  href: p.href,
  description: p.description,
}));

export const primaryNavItems = [
  { id: "marketplace", label: "Marketplace", href: NAV_ITEMS[0]!.href },
  { id: "howItWorks", label: "How It Works", href: PUBLIC_ROUTES.howItWorks },
] as const;

export { NAV_ITEMS, PRODUCT_ITEMS, PUBLIC_NAV_CTA_ITEMS };

export const runValuationHref = PUBLIC_ROUTES.valuation;

export function appDeskHrefForRole(role: AuthRole): string {
  return marketplaceWorkspaceForRole(role);
}

export function dashboardHref(): string {
  return marketplaceWorkspaceForRole("buyer");
}

export { isNavLinkActive, isProductsDropdownActive };

export function isPrimaryNavActive(location: string, href: string): boolean {
  return isNavLinkActive(location, href);
}

export function isNavItemActive(
  location: string,
  item: PublicNavLink | ProductNavItem,
): boolean {
  return isNavLinkActive(location, item.href);
}
