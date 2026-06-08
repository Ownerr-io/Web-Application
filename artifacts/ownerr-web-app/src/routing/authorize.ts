import type { DeskUser } from "@/lib/auth/types";
import { inferAuthRoleFromMarketplaceAppPath } from "@/lib/auth/marketplaceDeskRole";
import { AUTH_ROUTES } from "@/routing/routeRegistry";
import { buildAuthStartRedirect } from "@/routing/authResolver";
import { normalizePathname, resolveRoute } from "@/routing/routeResolver";
import type { RouteRole } from "@/routing/routeRegistry";

export type AccessSubject = {
  session: boolean;
  deskUser: DeskUser | null;
  networkProfile: boolean;
  platformAdmin?: boolean;
};

function deskRoleToRouteRole(role: DeskUser["role"]): RouteRole {
  return role;
}

export function resolveRoleAccess(
  pathname: string,
  subject: AccessSubject,
):
  | { allowed: true }
  | { allowed: false; fallback: string; reason: "auth" | "role" } {
  const route = resolveRoute(pathname);

  if (!route.authRequired) {
    return { allowed: true };
  }

  if (!subject.session) {
    return {
      allowed: false,
      fallback: buildAuthStartRedirect(pathname),
      reason: "auth",
    };
  }

  if (!route.requiredRoles?.length) {
    return { allowed: true };
  }

  const roles = route.requiredRoles;

  if (roles.includes("admin")) {
    if (subject.platformAdmin) return { allowed: true };
    return { allowed: false, fallback: AUTH_ROUTES.forbidden, reason: "role" };
  }

  if (roles.includes("network_member")) {
    if (subject.networkProfile) return { allowed: true };
    return { allowed: false, fallback: AUTH_ROUTES.forbidden, reason: "role" };
  }

  const path = normalizePathname(pathname);
  const fromMarketplacePath = inferAuthRoleFromMarketplaceAppPath(pathname);
  let deskRole: RouteRole | null = fromMarketplacePath;
  if (!deskRole && subject.deskUser) {
    deskRole = deskRoleToRouteRole(subject.deskUser.role);
  }

  if (!deskRole) {
    if (
      roles.includes("founder") &&
      path.startsWith("/ownerr-os/app") &&
      subject.session
    ) {
      return { allowed: true };
    }
    return { allowed: false, fallback: AUTH_ROUTES.forbidden, reason: "role" };
  }

  const deskRoleResolved = deskRole;
  if (roles.includes(deskRoleResolved)) {
    return { allowed: true };
  }

  if (
    roles.includes("founder") &&
    path.startsWith("/ownerr-os/app") &&
    subject.session
  ) {
    return { allowed: true };
  }

  return { allowed: false, fallback: AUTH_ROUTES.forbidden, reason: "role" };
}

export function canAccessPath(
  pathname: string,
  subject: AccessSubject,
): boolean {
  return resolveRoleAccess(pathname, subject).allowed;
}
