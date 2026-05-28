import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useOwnerrNetworkLandingSession } from "@/hooks/useOwnerrNetworkLandingSession";
import { AUTH_ROUTES } from "@/routing/routeRegistry";
import { hasCompletedOnboarding } from "@/lib/ownerr-network/api";
import { marketingRoutes } from "@/routes/marketingRoutes";
import { authLoginHref } from "@/lib/auth/routes";
import { trackOwnerrNetworkEvent } from "@/lib/ownerr-network/analytics";

type Variant = "hero" | "footer";

export function OwnerrNetworkLandingCtas({ variant }: { variant: Variant }) {
  const { session, profile, loading } = useOwnerrNetworkLandingSession();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    if (!profile) {
      setOnboardingDone(null);
      return;
    }
    void hasCompletedOnboarding(profile.id)
      .then(setOnboardingDone)
      .catch(() => setOnboardingDone(null));
  }, [profile]);

  if (loading) {
    return (
      <div className="h-12 w-full max-w-md animate-pulse rounded-[10px] bg-[color:var(--terminal-surface)]" />
    );
  }

  const loggedIn = Boolean(session && profile);

  if (!loggedIn) {
    return (
      <div
        className={
          variant === "hero"
            ? "flex flex-wrap gap-3"
            : "flex flex-wrap justify-center gap-3"
        }
      >
        <Button
          asChild
          className={
            variant === "hero"
              ? "btn-platform-gradient h-11 rounded-[10px] px-6 text-sm font-bold shadow-lg"
              : "btn-platform-gradient h-11 rounded-[10px] px-6 text-sm font-bold"
          }
          onClick={() =>
            void trackOwnerrNetworkEvent("cta_click", {
              placement: variant === "hero" ? "hero" : "footer",
            })
          }
        >
          <Link href={`${AUTH_ROUTES.start}?product=ownerr-network`}>
            Join Ownerr Network
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-11 rounded-[10px] border-[color:var(--terminal-border)] text-sm font-semibold"
        >
          <Link href={marketingRoutes.ownerrNetworkLeaderboard}>
            Leaderboard
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      className={
        variant === "hero"
          ? "flex flex-wrap gap-3"
          : "flex flex-wrap justify-center gap-3"
      }
    >
      <Button
        asChild
        className="h-11 rounded-[10px] bg-[color:var(--terminal-ochre)] text-sm font-bold text-[color:var(--brand-accent-ink)]"
      >
        <Link href={marketingRoutes.ownerrNetworkDashboard}>
          Go to Dashboard
        </Link>
      </Button>
      {onboardingDone === false ? (
        <Button
          asChild
          variant="outline"
          className="h-11 rounded-[10px] border-[color:var(--terminal-border)] text-sm font-semibold"
        >
          <Link href={marketingRoutes.ownerrNetworkOnboarding}>
            Continue setup
          </Link>
        </Button>
      ) : null}
      <Button
        asChild
        variant="outline"
        className="h-11 rounded-[10px] border-[color:var(--terminal-border)] text-sm font-semibold"
      >
        <Link href={marketingRoutes.ownerrNetworkLeaderboard}>Leaderboard</Link>
      </Button>
    </div>
  );
}

export function ownerrNetworkStickyCtaTarget(
  session: boolean,
  onboardingDone: boolean | null,
): { href: string; label: string } {
  if (!session) {
    return {
      href: authLoginHref({
        product: "ownerr-network",
        redirect: marketingRoutes.ownerrNetworkOnboarding,
      }),
      label: "Sign in",
    };
  }
  if (onboardingDone === false) {
    return { href: marketingRoutes.ownerrNetworkOnboarding, label: "CONTINUE" };
  }
  return { href: marketingRoutes.ownerrNetworkDashboard, label: "DASHBOARD" };
}
