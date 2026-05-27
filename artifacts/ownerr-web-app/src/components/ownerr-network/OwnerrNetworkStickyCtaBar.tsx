import { useEffect, useState } from "react";
import { OwnerrNetworkStickyCta } from "@/components/ownerr-network/OwnerrNetworkStickyCta";
import { ownerrNetworkStickyCtaTarget } from "@/components/ownerr-network/OwnerrNetworkLandingCtas";
import { useOwnerrNetworkLandingSession } from "@/hooks/useOwnerrNetworkLandingSession";
import { hasCompletedOnboarding } from "@/lib/ownerr-network/api";

export function OwnerrNetworkStickyCtaBar() {
  const { session, profile } = useOwnerrNetworkLandingSession();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    if (!profile) {
      setOnboardingDone(null);
      return;
    }
    void hasCompletedOnboarding(profile.id).then(setOnboardingDone);
  }, [profile]);

  const { href, label } = ownerrNetworkStickyCtaTarget(Boolean(session), onboardingDone);
  return <OwnerrNetworkStickyCta href={href} label={label} />;
}
