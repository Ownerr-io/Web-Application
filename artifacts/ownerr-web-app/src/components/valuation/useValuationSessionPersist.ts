import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearValuationSession,
  loadValuationSession,
  saveValuationSession,
} from '@/lib/valuationSession';
import {
  hasValuationSessionProgress,
  resolveValuationSessionFromSnapshot,
  type RestoredValuationSession,
} from '@/lib/valuationSessionRestore';
import type { ValuationInputs } from '@/lib/valuationIntel';
import type { OnboardingMeta, ValuationPhase } from './types';

const SAVE_MS = 400;

export type ValuationSessionState = RestoredValuationSession & {
  phase: ValuationPhase;
};

export function useValuationSessionPersist(defaults: ValuationSessionState) {
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
  const [session, setSession] = useState<ValuationSessionState>(defaults);
  const persistEnabled = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const snap = await loadValuationSession();
      if (cancelled) return;
      const restored = resolveValuationSessionFromSnapshot(snap);
      if (restored) {
        setSession(restored);
      }
      persistEnabled.current = true;
      setStatus('ready');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== 'ready' || !persistEnabled.current) return;

    const snapshot = {
      phase: session.phase,
      questionIndex: session.questionIndex,
      inputs: session.inputs,
      meta: session.meta,
      updatedAt: Date.now(),
    };
    if (!hasValuationSessionProgress(snapshot)) return;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void saveValuationSession(snapshot);
    }, SAVE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [status, session]);

  const patchSession = useCallback((patch: Partial<ValuationSessionState>) => {
    setSession((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearSession = useCallback(async () => {
    await clearValuationSession();
    persistEnabled.current = true;
    setSession(defaults);
  }, [defaults]);

  return {
    status,
    session,
    setSession,
    patchSession,
    clearSession,
  };
}
