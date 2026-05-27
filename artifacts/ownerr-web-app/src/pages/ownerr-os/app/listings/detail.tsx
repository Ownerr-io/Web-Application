import { useRoute } from 'wouter';
import { OwnerrOsStartupDetail } from '@/components/founder-os/OwnerrOsStartupDetail';
import { PRODUCT_ROUTES } from '@/routing/routeRegistry';
import { Redirect } from 'wouter';

export default function OwnerrOsListingDetailPage() {
  const [match, params] = useRoute(`${PRODUCT_ROUTES.ownerrOsListings}/:id`);
  const id = params?.id?.trim();

  if (!match || !id || id === 'new') {
    return <Redirect to={PRODUCT_ROUTES.ownerrOsListings} replace />;
  }

  return <OwnerrOsStartupDetail startupId={id} />;
}
