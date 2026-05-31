import type { ReactNode } from "react";
import { Redirect, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useActiveProduct } from "@/context/ActiveProductContext";
import {
  productDashboardPath,
  readActiveProduct,
  saveIntendedRoute,
} from "@/lib/auth/productLock";
import { resolveMembershipAppForPath } from "@/lib/platform/appMembership";
import { resolveRoleAccess } from "@/routing/authorize";
import { useOptionalOwnerrNetwork } from "@/context/ownerr-network/OwnerrNetworkProvider";
import { isDemoMarketplaceLockedSession } from "@/lib/marketplace/demoSessionLock";
import { buildAuthStartRedirect } from "@/routing/authResolver";
type Props = {
  children: ReactNode;
  pathname?: string;
};

export function RouteGuard({ children, pathname }: Props) {
  const [location] = useLocation();
  const path = pathname ?? location;
  const { session, loading, platformAdminReady, isPlatformAdmin, currentUser } =
    useAuth();
  const { activeProduct, setActiveProduct } = useActiveProduct();
  const ownerrNetwork = useOptionalOwnerrNetwork();

  if (loading || (session && !platformAdminReady)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm font-bold text-muted-foreground">
        Loading…
      </div>
    );
  }

  const isAdmin = isPlatformAdmin;

  // STEP 1: Force admin redirect after login
  if (session && isAdmin && !path.startsWith("/admin")) {
    return <Redirect to="/admin" />;
  }

  // STEP 2: Allow admin routes directly
  if (isAdmin && path.startsWith("/admin")) {
    return <>{children}</>;
  }

  // BELOW THIS → normal users only

  const routeApp = resolveMembershipAppForPath(path);

  if (routeApp && !session) {
    saveIntendedRoute(path);
    return <Redirect to={buildAuthStartRedirect(path)} />;
  }

  if (routeApp && session) {
    const demoLocked = isDemoMarketplaceLockedSession(session.user.email);
    const locked = activeProduct ?? readActiveProduct();

    if (demoLocked && routeApp === "marketplace") {
      if (locked !== "marketplace") setActiveProduct("marketplace");
    } else if (locked && locked !== routeApp) {
      return <Redirect to={productDashboardPath(locked)} />;
    } else if (!locked || locked !== routeApp) {
      setActiveProduct(routeApp);
    }
  }

  const access = resolveRoleAccess(path, {
    session: Boolean(session),
    deskUser: currentUser,
    networkProfile: Boolean(ownerrNetwork?.profile?.id),
    platformAdmin: isAdmin,
  });

  if (!access.allowed) {
    if (access.reason === "auth") {
      saveIntendedRoute(path);
    }
    return <Redirect to={access.fallback} />;
  }

  return <>{children}</>;
}
