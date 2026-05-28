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
import { useAuth } from "@/context/AuthContext";
import type { AuthRole } from "@/lib/auth/types";
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
      await provisionMarketplaceProduct(session!.user);
      await touchProductSession(userId, "marketplace");
      const row = await fetchMarketplaceProfileForUser(
        userId,
        (currentUser?.role ?? null) as AuthRole | null,
      );
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
  }, [userId, session, currentUser?.role, setActiveProduct]);

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
