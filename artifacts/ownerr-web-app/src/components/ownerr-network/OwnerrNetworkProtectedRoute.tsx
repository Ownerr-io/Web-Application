import { useEffect, useState, type ReactNode } from "react";
import { Redirect, useLocation } from "wouter";
import { useOwnerrNetworkAuth } from "@/hooks/useOwnerrNetworkAuth";
import { authLoginHrefForApp } from "@/lib/auth/authLogin";
import { hasCompletedOnboarding } from "@/lib/ownerr-network/api";
import { PRODUCT_ROUTES } from "@/routing/routeRegistry";
import { normalizePathname } from "@/routing/routeResolver";

type Props = {
  children: ReactNode;
  requireOnboardingComplete?: boolean;
};

export function OwnerrNetworkProtectedRoute({
  children,
  requireOnboardingComplete = true,
}: Props) {
  const [location] = useLocation();
  const { configured, loading, session, profile } = useOwnerrNetworkAuth();
  const [onboardingResolved, setOnboardingResolved] = useState(!requireOnboardingComplete);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(
    requireOnboardingComplete ? null : true,
  );

  useEffect(() => {
    if (!requireOnboardingComplete) {
      setOnboardingComplete(true);
      setOnboardingResolved(true);
      return;
    }
    if (!profile?.id) {
      setOnboardingComplete(null);
      setOnboardingResolved(!loading);
      return;
    }
    let cancelled = false;
    setOnboardingResolved(false);
    void hasCompletedOnboarding(profile.id).then((done) => {
      if (cancelled) return;
      setOnboardingComplete(done);
      setOnboardingResolved(true);
    });
    return () => {
      cancelled = true;
    };
  }, [profile?.id, requireOnboardingComplete, loading]);

  if (!configured) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center text-sm text-[color:var(--terminal-muted)]">
        Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local
      </div>
    );
  }

  if (loading || (requireOnboardingComplete && profile && !onboardingResolved)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm font-bold text-[color:var(--terminal-muted)]">
        Loading…
      </div>
    );
  }

  if (!session) {
    return <Redirect to={authLoginHrefForApp("ownerr_network")} />;
  }

  const onOnboardingRoute =
    normalizePathname(location) === normalizePathname(PRODUCT_ROUTES.ownerrNetworkOnboarding);

  if (requireOnboardingComplete && !onOnboardingRoute && profile && onboardingComplete === false) {
    return <Redirect to={PRODUCT_ROUTES.ownerrNetworkOnboarding} />;
  }

  if (requireOnboardingComplete && !profile) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm font-bold text-muted-foreground">
        Loading profile…
      </div>
    );
  }

  return <>{children}</>;
}
