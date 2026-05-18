import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ValuationFullViewport } from './ValuationFullViewport';
import { ValuationLottieAnimation } from './ValuationLottieAnimation';

const ANALYSIS_LOTTIE_SRC = '/Valuation.lottie';

const MESSAGES = [
  'Analyzing growth trajectory…',
  'Computing strategic valuation…',
  'Evaluating acquisition heat…',
  'Calculating investor appetite…',
] as const;

/** One shared timeline for Lottie + status copy (ms). */
const ANALYSIS_SYNC_MS = 4000;
const REDUCED_SYNC_MS = 1200;
const EXIT_FADE_MS = 420;

type Props = {
  onComplete: () => void;
};

const easePremium = [0.22, 1, 0.36, 1] as const;

type Phase = 'sync' | 'exit';

export function AiAnalysisScreen({ onComplete }: Props) {
  const reduce = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('sync');
  const finishedRef = useRef(false);

  const syncMs = reduce ? REDUCED_SYNC_MS : ANALYSIS_SYNC_MS;
  const messageStepMs = syncMs / MESSAGES.length;

  useEffect(() => {
    finishedRef.current = false;
    setPhase('sync');
    setIdx(0);

    const timers: number[] = [];
    for (let i = 1; i < MESSAGES.length; i++) {
      timers.push(window.setTimeout(() => setIdx(i), Math.round(i * messageStepMs)));
    }
    timers.push(window.setTimeout(() => setPhase('exit'), syncMs));

    return () => timers.forEach(clearTimeout);
  }, [syncMs, messageStepMs]);

  useEffect(() => {
    if (phase !== 'exit' || finishedRef.current) return;
    finishedRef.current = true;
    const t = window.setTimeout(onComplete, reduce ? 80 : EXIT_FADE_MS);
    return () => clearTimeout(t);
  }, [phase, onComplete, reduce]);

  const showLottie = phase === 'sync' && !reduce;

  return (
    <motion.div
      className="w-full"
      initial={false}
      animate={{ opacity: phase === 'exit' ? 0 : 1 }}
      transition={{ duration: reduce ? 0.15 : EXIT_FADE_MS / 1000, ease: easePremium }}
    >
      <ValuationFullViewport center={false} className="grid grid-rows-[1fr_auto] px-4 sm:px-10">
        <div className="flex min-h-0 flex-col items-center justify-center py-2 text-center sm:py-4">
          <AnimatePresence mode="wait">
            {showLottie ? (
              <motion.div
                key="lottie"
                initial={reduce ? false : { opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.35, ease: easePremium }}
                className="flex w-full justify-center"
              >
                <ValuationLottieAnimation
                  src={ANALYSIS_LOTTIE_SRC}
                  loop
                  className="h-[min(62dvh,560px)] w-[min(96vw,560px)] sm:h-[min(75dvh,720px)] sm:w-[min(98vw,720px)]"
                  aria-label="Evaluating your startup"
                />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <p
            className={cn(
              'text-[11px] font-bold uppercase tracking-[0.28em] text-[color:var(--terminal-muted)]',
              showLottie ? 'mt-8 sm:mt-10' : 'mt-0',
            )}
          >
            Evaluating
          </p>

          <div className="mt-4 min-h-[2.75rem] w-full max-w-lg">
            <AnimatePresence mode="wait">
              <motion.p
                key={MESSAGES[idx]}
                className="text-pretty px-1 text-lg font-semibold leading-snug text-[color:var(--terminal-fg)] sm:text-2xl"
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: easePremium }}
              >
                {MESSAGES[idx]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <div className="mx-auto mb-6 h-px w-full max-w-md shrink-0 overflow-hidden bg-[color:var(--terminal-border)]/50 sm:mb-8">
          <motion.div
            className="h-full bg-gradient-to-r from-[color:var(--terminal-ochre)] to-[color:var(--terminal-lime)]"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: syncMs / 1000, ease: easePremium }}
          />
        </div>
      </ValuationFullViewport>
    </motion.div>
  );
}
