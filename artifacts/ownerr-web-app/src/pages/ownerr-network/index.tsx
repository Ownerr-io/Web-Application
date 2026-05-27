import { useEffect, useState } from "react";
import { MarketingLayout } from "@/components/MarketingLayout";
import { OwnerrNetworkProductLanding } from "@/components/ownerr-network/OwnerrNetworkProductLanding";
import { captureOwnerrNetworkReferralFromSearch } from "@/lib/ownerr-network/referral";
import { fetchLeaderboard } from "@/lib/ownerr-network/api";
import type { LeaderboardEntry } from "@/lib/ownerr-network/types";
import { trackOwnerrNetworkEvent } from "@/lib/ownerr-network/analytics";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useOwnerrNetworkLandingSession } from "@/hooks/useOwnerrNetworkLandingSession";
import { ensureNetworkTablesDetected } from "@/lib/ownerr-network/dbTables";

export default function OwnerrNetworkLandingPage() {
  const { session, profile, loading: authLoading } = useOwnerrNetworkLandingSession();
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [liveCount] = useState(1284);
  const loggedIn = Boolean(session && profile);

  useEffect(() => {
    void ensureNetworkTablesDetected();
  }, []);

  useEffect(() => {
    document.title = "Ownerr Network | OWNERR";
    captureOwnerrNetworkReferralFromSearch(window.location.search);
    void trackOwnerrNetworkEvent("page_view", { path: "/products/ownerr-network" });
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    void fetchLeaderboard(5)
      .then(setLeaders)
      .catch(() => setLeaders([]));
  }, []);

  return (
    <MarketingLayout fullBleedMain hideProductContext>
      <OwnerrNetworkProductLanding
        leaders={leaders}
        liveCount={liveCount}
        authLoading={authLoading}
        loggedIn={loggedIn}
      />
    </MarketingLayout>
  );
}
