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
import { useActiveProduct } from "@/context/ActiveProductContext";
import {
  fetchCurrentOwnerrNetworkUser,
  fetchOwnerrNetworkProfile,
} from "@/lib/ownerr-network/api";
import type {
  OwnerrNetworkProfileRow,
  OwnerrNetworkUser,
} from "@/lib/ownerr-network/types";
import {
  isDuplicateDbError,
  logProductIssue,
  toUserFacingProductError,
} from "@/lib/observability/productErrors";
import {
  provisionOwnerrNetworkProduct,
  touchProductSession,
} from "@/lib/products/provision";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  ensureNetworkTablesDetected,
  networkTables,
  isUsersTableActive,
} from "@/lib/ownerr-network/dbTables";

type OwnerrNetworkContextValue = {
  loading: boolean;
  error: string | null;
  profile: OwnerrNetworkUser | null;
  networkProfile: OwnerrNetworkProfileRow | null;
  reload: () => Promise<void>;
};

const OwnerrNetworkContext = createContext<OwnerrNetworkContextValue | null>(
  null,
);

export function OwnerrNetworkProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { setActiveProduct } = useActiveProduct();
  const userId = session?.user?.id;
  const inFlightRef = useRef(false);
  const profileRef = useRef<OwnerrNetworkUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<OwnerrNetworkUser | null>(null);
  const [networkProfile, setNetworkProfile] =
    useState<OwnerrNetworkProfileRow | null>(null);

  const reload = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      profileRef.current = null;
      setNetworkProfile(null);
      setError(null);
      setLoading(false);
      return;
    }
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (!profileRef.current) {
      setLoading(true);
    }
    setError(null);
    try {
      await ensureNetworkTablesDetected();
      setActiveProduct("ownerr_network");
      await provisionOwnerrNetworkProduct(session!.user);
      await touchProductSession(userId, "ownerr_network");

      let row = await fetchCurrentOwnerrNetworkUser();
      if (
        row?.id &&
        session!.user.email_confirmed_at &&
        !row.profile_verified &&
        isSupabaseConfigured()
      ) {
        const supabase = getSupabase();
        const isNewSchema = isUsersTableActive();
        console.log(
          `[Provider] User requires verification. Attempting update. isNewSchema: ${isNewSchema}`,
        );
        const { error: verifyErr } = isNewSchema
          ? await supabase
              .from("users")
              .update({ verification_status: "verified" })
              .eq("auth_user_id", userId)
          : await supabase
              .from(networkTables().users)
              .update({ profile_verified: true })
              .eq("auth_user_id", userId);
        if (verifyErr) {
          console.error(
            "[Provider] Failed to verify profile in DB:",
            verifyErr,
          );
        } else {
          console.log("[Provider] Profile verification updated successfully.");
          row = (await fetchCurrentOwnerrNetworkUser()) ?? row;
        }
      }
      setProfile(row?.id ? row : null);
      profileRef.current = row?.id ? row : null;
      const np = row ? await fetchOwnerrNetworkProfile(userId) : null;
      setNetworkProfile(np);
    } catch (err) {
      if (isDuplicateDbError(err)) {
        const row = await fetchCurrentOwnerrNetworkUser();
        setProfile(row?.id ? row : null);
        profileRef.current = row?.id ? row : null;
        setNetworkProfile(row ? await fetchOwnerrNetworkProfile(userId) : null);
        setError(null);
      } else {
        logProductIssue("provider.ownerr_network", err, { userId });
        setError(
          toUserFacingProductError(err, "Failed to load Ownerr Network"),
        );
        setProfile(null);
        profileRef.current = null;
        setNetworkProfile(null);
      }
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [userId, session, setActiveProduct]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo(
    () => ({ loading, error, profile, networkProfile, reload }),
    [loading, error, profile, networkProfile, reload],
  );

  return (
    <OwnerrNetworkContext.Provider value={value}>
      {children}
    </OwnerrNetworkContext.Provider>
  );
}

export function useOwnerrNetwork(): OwnerrNetworkContextValue {
  const ctx = useContext(OwnerrNetworkContext);
  if (!ctx)
    throw new Error(
      "useOwnerrNetwork must be used within OwnerrNetworkProvider",
    );
  return ctx;
}

export function useOptionalOwnerrNetwork(): OwnerrNetworkContextValue | null {
  return useContext(OwnerrNetworkContext);
}
