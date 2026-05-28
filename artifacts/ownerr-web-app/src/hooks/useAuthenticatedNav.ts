import { useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useOptionalOwnerrNetwork } from "@/context/ownerr-network/OwnerrNetworkProvider";
import { ownerrNetworkAvatarUrl } from "@/lib/ownerr-network/avatar";
import { founderAvatarUrl } from "@/lib/utils";
import {
  getAuthenticatedSidebarNav,
  getMarketplaceSidebarSections,
  getOwnerrOsSidebarSections,
  type SidebarNavItemDef,
  type SidebarNavSection,
} from "@/routing/navigationRegistry";
import { resolveSidebarNavGroup } from "@/routing/productResolver";

export function useAuthenticatedNav() {
  const [location] = useLocation();
  const { session, currentUser, logout } = useAuth();
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

  const sidebarLinks = useMemo(
    () => (navGroup ? getAuthenticatedSidebarNav(navGroup, subject) : []),
    [navGroup, subject],
  );

  const marketplaceSections = useMemo(
    () =>
      navGroup === "marketplace"
        ? getMarketplaceSidebarSections(subject)
        : null,
    [navGroup, subject],
  );

  const ownerrSections = useMemo(
    () =>
      navGroup === "ownerr-os" ? getOwnerrOsSidebarSections(subject) : null,
    [navGroup, subject],
  );

  const bottomNavLinks = useMemo((): SidebarNavItemDef[] => {
    if (marketplaceSections) {
      return marketplaceSections.flatMap((s) => s.items);
    }
    if (ownerrSections) {
      return ownerrSections.flatMap((s) => s.items);
    }
    return [...sidebarLinks];
  }, [marketplaceSections, ownerrSections, sidebarLinks]);

  const networkUser =
    navGroup === "ownerr-network" ? ownerrNetwork?.profile : null;
  const displayName = networkUser
    ? `@${networkUser.username}`
    : (currentUser?.name ?? session?.user.email?.split("@")[0] ?? "Account");
  const email =
    networkUser?.email ?? currentUser?.email ?? session?.user.email ?? "";
  const avatarSrc = networkUser
    ? ownerrNetworkAvatarUrl(networkUser)
    : founderAvatarUrl(
        currentUser?.avatarSeed ??
          currentUser?.id ??
          session?.user.id ??
          "user",
      );

  return {
    location,
    navGroup,
    sidebarLinks,
    marketplaceSections,
    ownerrSections,
    bottomNavLinks,
    displayName,
    email,
    avatarSrc,
    logout,
  };
}

export type { SidebarNavSection };
