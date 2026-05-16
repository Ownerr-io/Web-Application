import type { ValuationInputs } from '@/lib/valuationIntel';
import type { OnboardingMeta, ValuationPhase } from '@/components/valuation/types';
import type { ValuationSessionSnapshot } from '@/lib/valuationSession';

export function hasValuationSessionProgress(snap: ValuationSessionSnapshot): boolean {
  if (snap.phase !== 'intro') return true;
  if (snap.questionIndex > 0) return true;
  if (snap.meta.startupName?.trim()) return true;
  if (snap.inputs.mrr > 0 || snap.inputs.arr > 0) return true;
  return false;
}

export type RestoredValuationSession = {
  phase: ValuationPhase;
  questionIndex: number;
  inputs: ValuationInputs;
  meta: OnboardingMeta;
};

/** Map IndexedDB row to UI state (skip intro when user already progressed). */
export function resolveValuationSessionFromSnapshot(
  snap: ValuationSessionSnapshot | null,
): RestoredValuationSession | null {
  if (!snap || !hasValuationSessionProgress(snap)) return null;
  return {
    phase: snap.phase === 'intro' ? 'questions' : snap.phase,
    questionIndex: snap.questionIndex,
    inputs: snap.inputs,
    meta: snap.meta,
  };
}
