import { getDB } from '@/lib/db';
import type { ValuationInputs } from '@/lib/valuationIntel';
import type { OnboardingMeta, ValuationPhase } from '@/components/valuation/types';

const STORE = 'valuation-session';
const SESSION_ID = 'active';

export type ValuationSessionSnapshot = {
  phase: ValuationPhase;
  questionIndex: number;
  inputs: ValuationInputs;
  meta: OnboardingMeta;
  updatedAt: number;
};

type Row = {
  id: string;
  phase: string;
  questionIndex: number;
  inputs: ValuationInputs;
  meta: OnboardingMeta;
  updatedAt: number;
};

export async function loadValuationSession(): Promise<ValuationSessionSnapshot | null> {
  try {
    const db = await getDB();
    const row = (await db.get(STORE as 'valuation-session', SESSION_ID)) as Row | undefined;
    if (!row) return null;
    return {
      phase: row.phase as ValuationPhase,
      questionIndex: row.questionIndex,
      inputs: row.inputs,
      meta: row.meta,
      updatedAt: row.updatedAt,
    };
  } catch {
    return null;
  }
}

export async function saveValuationSession(snapshot: ValuationSessionSnapshot): Promise<void> {
  try {
    const db = await getDB();
    const row: Row = {
      id: SESSION_ID,
      phase: snapshot.phase,
      questionIndex: snapshot.questionIndex,
      inputs: snapshot.inputs,
      meta: snapshot.meta,
      updatedAt: snapshot.updatedAt,
    };
    await db.put(STORE as 'valuation-session', row);
  } catch {
    /* ignore quota / private mode */
  }
}

export async function clearValuationSession(): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(STORE as 'valuation-session', SESSION_ID);
  } catch {
    /* ignore */
  }
}
