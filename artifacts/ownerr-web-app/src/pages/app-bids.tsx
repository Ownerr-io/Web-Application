import { Redirect } from 'wouter';
import { useMockSession } from '@/context/MockSessionContext';
import { appPath } from '@/lib/appPaths';

export default function AppBidsPage() {
  const { currentUser } = useMockSession();
  if (!currentUser) return <Redirect to="/" />;
  if (currentUser.role === 'buyer') return <Redirect to={appPath('/buyer/bids')} />;
  return <Redirect to={appPath('/seller')} />;
}
