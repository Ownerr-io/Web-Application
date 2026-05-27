import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchCurrentOwnerrNetworkUser } from "@/lib/ownerr-network/api";
import type { OwnerrNetworkUser } from "@/lib/ownerr-network/types";

/** Public Ownerr Network marketing — no OwnerrNetworkProvider required. */
export function useOwnerrNetworkLandingSession() {
  const { session, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<OwnerrNetworkUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!session?.user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    void fetchCurrentOwnerrNetworkUser()
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [session?.user, authLoading]);

  return { session, profile, loading: authLoading || loading };
}
