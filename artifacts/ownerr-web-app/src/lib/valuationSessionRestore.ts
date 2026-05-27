import type { ValuationInputs } from '@/lib/valuationIntel';
import { DEFAULT_VALUATION_INPUTS } from '@/lib/valuationIntel';
import type { OnboardingMeta, ValuationPhase } from '@/components/valuation/types';
import { DEFAULT_OWNERR_ONBOARDING_META } from '@/components/valuation/types';
import type { ValuationSessionSnapshot } from '@/lib/valuationSession';

function mergeMetaWithDefaults(meta: OnboardingMeta): OnboardingMeta {
  const out = { ...DEFAULT_OWNERR_ONBOARDING_META };
  (Object.keys(out) as (keyof OnboardingMeta)[]).forEach((key) => {
    const saved = meta[key]?.trim();
    if (saved) out[key] = meta[key];
  });
  return out;
}

function mergeInputsWithDefaults(inputs: ValuationInputs): ValuationInputs {
  const merged: ValuationInputs = { ...DEFAULT_VALUATION_INPUTS, ...inputs };
  if (!(inputs.mrr > 0)) merged.mrr = DEFAULT_VALUATION_INPUTS.mrr;
  if (!(inputs.arr > 0)) merged.arr = DEFAULT_VALUATION_INPUTS.arr;
  return merged;
}

export function hasValuationSessionProgress(snap: ValuationSessionSnapshot): boolean {
  if (snap.phase === 'analyzing' || snap.phase === 'results') return true;
  if (snap.phase === 'questions' || snap.questionIndex > 0) return true;
  if (snap.meta.startupName?.trim()) return true;
  return false;
}

export type RestoredValuationSession = {
  phase: ValuationPhase;
  questionIndex: number;
  inputs: ValuationInputs;
  meta: OnboardingMeta;
};

/** Map IndexedDB row to UI state. */
export function resolveValuationSessionFromSnapshot(
  snap: ValuationSessionSnapshot | null,
): RestoredValuationSession | null {
  if (!snap || !hasValuationSessionProgress(snap)) return null;
  return {
    phase: snap.phase,
    questionIndex: snap.questionIndex,
    inputs: mergeInputsWithDefaults(snap.inputs),
    meta: mergeMetaWithDefaults(snap.meta),
  };
}

export function shouldAutoResumeValuationPhase(phase: ValuationPhase): boolean {
  return phase === 'analyzing' || phase === 'results';
}
