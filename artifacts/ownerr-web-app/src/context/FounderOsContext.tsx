import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import type { FounderSubmissionRecord } from "@/lib/founderTypes";
import { loadFounderSubmissionForUser } from "@/lib/founderService";

type FounderOsContextValue = {
  flowOpen: boolean;
  openFlow: () => void;
  closeFlow: () => void;
  completedRecord: FounderSubmissionRecord | null;
  completedRecordLoading: boolean;
  setCompletedRecord: (record: FounderSubmissionRecord | null) => void;
};

const FounderOsContext = createContext<FounderOsContextValue | null>(null);

export function FounderOsProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const authUserId = session?.user?.id ?? null;

  const [flowOpen, setFlowOpen] = useState(false);
  const [completedRecord, setCompletedRecordState] =
    useState<FounderSubmissionRecord | null>(null);
  const [completedRecordLoading, setCompletedRecordLoading] = useState(true);

  const setCompletedRecord = useCallback(
    (record: FounderSubmissionRecord | null) => {
      setCompletedRecordState(record);
    },
    [],
  );

  useEffect(() => {
    if (authLoading) return;

    if (!authUserId) {
      setCompletedRecordState(null);
      setCompletedRecordLoading(false);
      return;
    }

    let cancelled = false;
    setCompletedRecordLoading(true);
    void loadFounderSubmissionForUser(authUserId)
      .then((record) => {
        if (!cancelled) setCompletedRecordState(record);
      })
      .finally(() => {
        if (!cancelled) setCompletedRecordLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authUserId, authLoading]);

  const openFlow = useCallback(() => {
    setCompletedRecordState(null);
    setFlowOpen(true);
  }, []);

  const closeFlow = useCallback(() => setFlowOpen(false), []);

  const value = useMemo(
    () => ({
      flowOpen,
      openFlow,
      closeFlow,
      completedRecord,
      completedRecordLoading: authLoading || completedRecordLoading,
      setCompletedRecord,
    }),
    [
      flowOpen,
      openFlow,
      closeFlow,
      completedRecord,
      authLoading,
      completedRecordLoading,
      setCompletedRecord,
    ],
  );

  return (
    <FounderOsContext.Provider value={value}>
      {children}
    </FounderOsContext.Provider>
  );
}

export function useFounderOs() {
  const ctx = useContext(FounderOsContext);
  if (!ctx)
    throw new Error("useFounderOs must be used within FounderOsProvider");
  return ctx;
}
