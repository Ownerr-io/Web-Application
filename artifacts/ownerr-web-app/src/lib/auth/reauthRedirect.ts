import { AUTH_ROUTES } from "@/routing/routeRegistry";

/** Navigate here when a flow requires reauthentication OTP first. */
export function reauthenticatePageHref(returnTo?: string): string {
  if (!returnTo) return AUTH_ROUTES.reauthenticate;
  return `${AUTH_ROUTES.reauthenticate}?returnTo=${encodeURIComponent(returnTo)}`;
}
