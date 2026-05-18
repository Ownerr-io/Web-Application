import { useCallback, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ValuationStageBackdrop } from './ValuationStageBackdrop';
import { VALUATION_STAGE_MIN_H } from './ValuationFullViewport';
import { ValuationIntroScene } from './ValuationIntroScene';
import { ValuationClaudeFlow } from './ValuationClaudeFlow';
import { AiAnalysisScreen } from './AiAnalysisScreen';
import { ValuationResultsDashboard } from './ValuationResultsDashboard';
import { ValuationCaptureSummary } from './ValuationCaptureSummary';
import { LeadConversionSection } from './LeadConversionSection';
import { useValuationSessionPersist, type ValuationSessionState } from './useValuationSessionPersist';
import {
  DEFAULT_VALUATION_INPUTS,
  buildStrategicInsights,
  computeValuationIntel,
  type ValuationInputs,
} from '@/lib/valuationIntel';
import { DEFAULT_OWNERR_ONBOARDING_META, type ValuationPhase } from './types';
import { VALUATION_QUESTIONS, validateAllInputs } from './valuationQuestions';
import { scrollPageToTop } from '@/lib/scrollPageToTop';

const MRR_QUESTION_INDEX = VALUATION_QUESTIONS.findIndex((q) => q.id === 'mrr');

function defaultSession(): ValuationSessionState {
  return {
    phase: 'intro',
    questionIndex: 0,
    inputs: { ...DEFAULT_VALUATION_INPUTS },
    meta: { ...DEFAULT_OWNERR_ONBOARDING_META },
  };
}

type Props = {
  onPhaseChange?: (phase: ValuationPhase) => void;
};

export function ValuationExperience({ onPhaseChange }: Props) {
  const reduce = useReducedMotion();
  const defaults = useMemo(() => defaultSession(), []);
  const { status, session, patchSession, clearSession } = useValuationSessionPersist(defaults);

  const { phase, questionIndex, inputs, meta } = session;

  useEffect(() => {
    if (status === 'ready') onPhaseChange?.(session.phase);
  }, [status, session.phase, onPhaseChange]);

  useEffect(() => {
    if (status !== 'ready') return;
    scrollPageToTop();
    const raf = requestAnimationFrame(() => scrollPageToTop());
    return () => cancelAnimationFrame(raf);
  }, [status, phase]);

  useEffect(() => {
    if (status !== 'ready') return;
    if (session.phase !== 'results' && session.phase !== 'analyzing') return;
    if (validateAllInputs(session.inputs)) return;
    patchSession({
      phase: 'questions',
      questionIndex: MRR_QUESTION_INDEX >= 0 ? MRR_QUESTION_INDEX : 0,
    });
    onPhaseChange?.('questions');
  }, [status, session.phase, session.inputs, patchSession, onPhaseChange]);

  const setPhaseSync = useCallback(
    (p: ValuationPhase) => {
      patchSession({ phase: p });
      onPhaseChange?.(p);
    },
    [onPhaseChange, patchSession],
  );

  const outputs = useMemo(() => computeValuationIntel(inputs), [inputs]);
  const insights = useMemo(() => buildStrategicInsights(inputs, outputs), [inputs, outputs]);

  const startQuestions = useCallback(() => setPhaseSync('questions'), [setPhaseSync]);

  const finishQuestions = useCallback(() => {
    if (!validateAllInputs(inputs)) return;
    setPhaseSync('analyzing');
  }, [inputs, setPhaseSync]);

  const showResults = useCallback(() => setPhaseSync('results'), [setPhaseSync]);

  const resetFlow = useCallback(async () => {
    await clearSession();
    setPhaseSync('intro');
  }, [clearSession, setPhaseSync]);

  const calmBackdrop = phase === 'questions';
  const backdropIntensity = phase === 'intro' ? 'intro' : phase === 'results' ? 'results' : 'flow';

  if (status === 'loading') {
    return (
      <motion.div className="flex min-h-[calc(100dvh-3.25rem)] w-full items-center justify-center bg-[color:var(--terminal-bg)] sm:min-h-[calc(100dvh-4rem)]">
        <motion.div
          className="h-8 w-8 rounded-full border-2 border-[color:var(--terminal-border)] border-t-[color:var(--terminal-ochre)]"
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cn(
        'relative flex w-full flex-col',
        phase === 'analyzing' &&
          'h-[calc(100dvh-3.25rem)] max-h-[calc(100dvh-3.25rem)] overflow-hidden sm:h-[calc(100dvh-4rem)] sm:max-h-[calc(100dvh-4rem)]',
        (phase === 'intro' || phase === 'questions') && VALUATION_STAGE_MIN_H,
      )}
    >
      <ValuationStageBackdrop intensity={backdropIntensity} calm={calmBackdrop || phase === 'analyzing'} />

      <motion.div className="relative z-10 flex min-h-0 w-full flex-1 flex-col">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div key="intro" className="flex min-h-0 w-full flex-1 flex-col">
              <ValuationIntroScene onContinue={startQuestions} />
            </motion.div>
          )}

          {phase === 'questions' && (
            <motion.div key="questions" className="flex min-h-0 w-full flex-1 flex-col" exit={reduce ? undefined : { opacity: 0 }}>
              <ValuationClaudeFlow
                questionIndex={questionIndex}
                inputs={inputs}
                meta={meta}
                onInputsChange={(inputs) => patchSession({ inputs })}
                onMetaChange={(meta) => patchSession({ meta })}
                onQuestionIndexChange={(questionIndex) => patchSession({ questionIndex })}
                onComplete={finishQuestions}
              />
            </motion.div>
          )}

          {phase === 'analyzing' && (
            <motion.div
              key="analyzing"
              className="valuation-analysis-stage flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden"
            >
              <AiAnalysisScreen
                estimatedValuation={outputs.estimatedValuation}
                inputs={inputs}
                onComplete={showResults}
              />
            </motion.div>
          )}

          {phase === 'results' && (
            <motion.div
              key="results"
              className="w-full pb-16"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45 }}
            >
              <ValuationResultsDashboard
                inputs={inputs}
                outputs={outputs}
                insights={insights}
                startupName={meta.startupName.trim() || undefined}
                meta={meta}
              />
              <LeadConversionSection />
              <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-4 pb-8 sm:flex-row sm:flex-wrap sm:gap-3 ">
                <Button asChild variant="outline" className="h-11 w-full rounded-[10px] border-[color:var(--terminal-border)] font-bold sm:w-auto">
                  <Link href="/">Back to overview</Link>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 w-full rounded-[10px] font-bold text-[color:var(--terminal-muted)] sm:w-auto"
                  onClick={() => void resetFlow()}
                >
                  Run again
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
