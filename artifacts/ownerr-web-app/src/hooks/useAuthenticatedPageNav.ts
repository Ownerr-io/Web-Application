import { useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useOptionalOwnerrNetwork } from "@/context/ownerr-network/OwnerrNetworkProvider";
import {
  resolveAuthenticatedPageNavContext,
  type AuthenticatedPageNavContext,
} from "@/routing/navigationRegistry";
import { resolveSidebarNavGroup } from "@/routing/productResolver";

export function useAuthenticatedPageNav(): AuthenticatedPageNavContext | null {
  const [location] = useLocation();
  const { session, currentUser } = useAuth();
  const ownerrNetwork = useOptionalOwnerrNetwork();
  const navGroup = resolveSidebarNavGroup(location);

  const subject = useMemo(
    () => ({
      session: Boolean(session),
      deskUser: currentUser,
      networkProfile: Boolean(ownerrNetwork?.profile?.id),
    }),
    [session, currentUser, ownerrNetwork?.profile?.id],
  );

  return useMemo(() => {
    if (!navGroup) return null;
    return resolveAuthenticatedPageNavContext(location, navGroup, subject);
  }, [location, navGroup, subject]);
}
