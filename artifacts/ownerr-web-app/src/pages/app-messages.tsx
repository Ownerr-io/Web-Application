import { Redirect } from 'wouter';
import { useMockSession } from '@/context/MockSessionContext';
import { appPath } from '@/lib/appPaths';

/** Routes founders to inbox and buyers to interests as the messaging surface for now. */
export default function AppMessagesPage() {
  const { currentUser } = useMockSession();
  if (!currentUser) return <Redirect to="/" />;
  if (currentUser.role === 'founder') return <Redirect to={appPath('/seller/inbox')} />;
  return <Redirect to={appPath('/buyer/interests')} />;
}
