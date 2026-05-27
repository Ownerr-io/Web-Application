import {
  MARKETPLACE_ROUTES,
  PRODUCT_ROUTES,
  type AuthenticatedWorkspace,
} from '@/routing/routeRegistry';

export function productSettingsPath(product: AuthenticatedWorkspace): string {
  if (product === 'marketplace') return MARKETPLACE_ROUTES.settings;
  if (product === 'ownerr-os') return PRODUCT_ROUTES.ownerrOsSettings;
  return PRODUCT_ROUTES.ownerrNetworkSettings;
}
