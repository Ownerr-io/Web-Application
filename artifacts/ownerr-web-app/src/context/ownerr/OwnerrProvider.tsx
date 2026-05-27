import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import { useActiveProduct } from '@/context/ActiveProductContext';
import { loadFounderSubmissionsForUser } from '@/lib/founderService';
import type { FounderSubmissionRecord } from '@/lib/founderTypes';
import {
  isDuplicateDbError,
  logProductIssue,
  toUserFacingProductError,
} from '@/lib/observability/productErrors';
import { provisionOwnerrProduct, touchProductSession } from '@/lib/products/provision';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';

export type OwnerrProfileRow = {
  id: string;
  auth_user_id: string;
  created_at: string;
  updated_at: string;
};

type OwnerrContextValue = {
  loading: boolean;
  error: string | null;
  profile: OwnerrProfileRow | null;
  founderRecords: FounderSubmissionRecord[];
  /** Most recently created listing (used by referrals / legacy flows). */
  founderRecord: FounderSubmissionRecord | null;
  reload: () => Promise<void>;
};

const OwnerrContext = createContext<OwnerrContextValue | null>(null);

export function OwnerrProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { setActiveProduct } = useActiveProduct();
  const userId = session?.user?.id;
  const inFlightRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<OwnerrProfileRow | null>(null);
  const [founderRecords, setFounderRecords] = useState<FounderSubmissionRecord[]>([]);

  const reload = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setFounderRecords([]);
      setError(null);
      setLoading(false);
      return;
    }
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setError(null);
    try {
      setActiveProduct('ownerr_os');
      await provisionOwnerrProduct(session!.user);
      await touchProductSession(userId, 'ownerr_os');

      if (isSupabaseConfigured()) {
        const { data, error: profErr } = await getSupabase()
          .from('ownerr_profiles')
          .select('id, auth_user_id, created_at, updated_at')
          .eq('auth_user_id', userId)
          .maybeSingle();
        if (profErr) throw profErr;
        setProfile((data as OwnerrProfileRow | null) ?? null);
      }

      const records = await loadFounderSubmissionsForUser(userId);
      setFounderRecords(records);
    } catch (err) {
      if (!isDuplicateDbError(err)) {
        logProductIssue('provider.ownerr', err, { userId });
      }
      setError(toUserFacingProductError(err, 'Failed to load OWNERR OS'));
      setProfile(null);
      setFounderRecords([]);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [userId, session, setActiveProduct]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const founderRecord = founderRecords[0] ?? null;

  const value = useMemo(
    () => ({ loading, error, profile, founderRecords, founderRecord, reload }),
    [loading, error, profile, founderRecords, founderRecord, reload],
  );

  return <OwnerrContext.Provider value={value}>{children}</OwnerrContext.Provider>;
}

export function useOwnerr(): OwnerrContextValue {
  const ctx = useContext(OwnerrContext);
  if (!ctx) throw new Error('useOwnerr must be used within OwnerrProvider');
  return ctx;
}
