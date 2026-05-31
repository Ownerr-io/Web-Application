import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { resolvePlatformAdminPostAuthDestination } from "@/routing/authResolver";

type Options = {
  returnTo?: string | null;
  /** When false, skip redirect (default: true when session exists). */
  enabled?: boolean;
};

/**
 * After sign-in, send platform admins to `/admin` once role is loaded from the DB.
 * No-op for non-admins. Safe to mount on multiple auth entry screens.
 */
export function useRedirectPlatformAdminWhenReady({
  returnTo = null,
  enabled = true,
}: Options = {}): {
  authLoading: boolean;
  platformAdminReady: boolean;
  isPlatformAdmin: boolean;
} {
  const [, navigate] = useLocation();
  const { session, loading, platformAdminReady, isPlatformAdmin } = useAuth();

  useEffect(() => {
    if (!enabled || loading || !session || !platformAdminReady) return;
    if (!isPlatformAdmin) return;
    navigate(resolvePlatformAdminPostAuthDestination(returnTo), {
      replace: true,
    });
  }, [
    enabled,
    loading,
    session,
    platformAdminReady,
    isPlatformAdmin,
    returnTo,
    navigate,
  ]);

  return { authLoading: loading, platformAdminReady, isPlatformAdmin };
}

/** Returns true when post-auth navigation should wait for admin resolution. */
export function shouldHoldPostAuthForPlatformAdmin(input: {
  loading: boolean;
  session: unknown;
  platformAdminReady: boolean;
}): boolean {
  return input.loading || (Boolean(input.session) && !input.platformAdminReady);
}
