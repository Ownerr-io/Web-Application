import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import type { AuthRole } from "@/lib/auth/types";
import { inferAuthRoleFromMarketplaceAppPath } from "@/lib/auth/marketplaceDeskRole";
import { authRoleToDeskRole } from "@/lib/marketplace/profiles";
import { useActiveProduct } from "@/context/ActiveProductContext";
import {
  fetchMarketplaceProfileForUser,
  type MarketplaceProfileRow,
} from "@/lib/platform/fetchMarketplaceProfile";
import {
  isDuplicateDbError,
  logProductIssue,
  toUserFacingProductError,
} from "@/lib/observability/productErrors";
import { getSupabase } from "@/lib/supabase/client";
import {
  provisionMarketplaceProduct,
  touchProductSession,
} from "@/lib/products/provision";

type MarketplaceContextValue = {
  loading: boolean;
  error: string | null;
  profile: MarketplaceProfileRow | null;
  reload: () => Promise<void>;
};

const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { session, currentUser } = useAuth();
  const { setActiveProduct } = useActiveProduct();
  const userId = session?.user?.id;
  const inFlightRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<MarketplaceProfileRow | null>(null);

  const reload = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setError(null);
      setLoading(false);
      return;
    }
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setError(null);
    try {
      setActiveProduct("marketplace");
      const pathRole = inferAuthRoleFromMarketplaceAppPath(location);
      const preferredRole: AuthRole | null =
        pathRole ?? currentUser?.role ?? null;
      const desk = preferredRole
        ? authRoleToDeskRole(preferredRole)
        : undefined;
      const {
        data: { user },
      } = await getSupabase().auth.getUser();
      if (!user) return;
      await provisionMarketplaceProduct(user, desk ? { desk } : undefined);
      await touchProductSession(userId, "marketplace");
      const row = await fetchMarketplaceProfileForUser(userId, preferredRole);
      setProfile(row);
    } catch (err) {
      if (!isDuplicateDbError(err)) {
        logProductIssue("provider.marketplace", err, { userId });
      }
      setError(toUserFacingProductError(err, "Failed to load Marketplace"));
      setProfile(null);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [userId, currentUser?.role, location, setActiveProduct]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo(
    () => ({ loading, error, profile, reload }),
    [loading, error, profile, reload],
  );

  return (
    <MarketplaceContext.Provider value={value}>
      {children}
    </MarketplaceContext.Provider>
  );
}

export function useMarketplace(): MarketplaceContextValue {
  const ctx = useContext(MarketplaceContext);
  if (!ctx)
    throw new Error("useMarketplace must be used within MarketplaceProvider");
  return ctx;
}
