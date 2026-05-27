import { Redirect, useLocation } from 'wouter';
import { MARKETPLACE_ROUTES } from '@/routing/routeRegistry';

/** Legacy `/marketplace/startups` → canonical `/marketplace/acquire`. */
export function MarketplaceStartupsRedirect() {
  const [location] = useLocation();
  const q = location.includes('?') ? location.slice(location.indexOf('?')) : '';
  return <Redirect to={`${MARKETPLACE_ROUTES.acquire}${q}`} replace />;
}
