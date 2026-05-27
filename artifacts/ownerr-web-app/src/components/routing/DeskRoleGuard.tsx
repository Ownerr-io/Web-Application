import type { ReactNode } from 'react';
import { Redirect } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import type { AuthRole } from '@/lib/auth/types';
import { MARKETPLACE_ROUTES } from '@/routing/routeRegistry';
import { marketplaceWorkspaceForRole } from '@/routing/navigationRegistry';

type Props = {
  role: AuthRole;
  children: ReactNode;
};

export function DeskRoleGuard({ role, children }: Props) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm font-bold text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!currentUser) {
    return <Redirect to={MARKETPLACE_ROUTES.root} />;
  }

  if (currentUser.role !== role) {
    return <Redirect to={marketplaceWorkspaceForRole(currentUser.role)} />;
  }

  return <>{children}</>;
}
