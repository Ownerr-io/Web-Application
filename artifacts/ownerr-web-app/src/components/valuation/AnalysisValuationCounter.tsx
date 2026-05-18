import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { formatEnterpriseValuation, cn, normalizeEnterpriseDollars } from '@/lib/utils';
import { useAnimatedNumber } from './useAnimatedNumber';

type Props = {
  estimatedValuation: number;
  /** 0–100; when set, count rises in sync with the analysis timeline instead of looping. */
  progressPct?: number;
  className?: string;
};

function targetFromProgress(estimatedValuation: number, progressPct: number): number {
  const dollars = normalizeEnterpriseDollars(estimatedValuation);
  if (dollars <= 0) return 0;
  const floor = Math.max(10_000, dollars * 0.68);
  const t = Math.min(1, Math.max(0, progressPct / 100));
  const eased = 1 - (1 - t) ** 2.2;
  return Math.round(floor + (dollars - floor) * eased);
}

export function AnalysisValuationCounter({ estimatedValuation, progressPct, className }: Props) {
  const reduce = useReducedMotion();
  const target = useMemo(
    () =>
      progressPct !== undefined
        ? targetFromProgress(estimatedValuation, progressPct)
        : normalizeEnterpriseDollars(estimatedValuation),
    [estimatedValuation, progressPct],
  );
  const amount = useAnimatedNumber(target, reduce ? 0 : 1100, !reduce);

  return (
    <motion.p
      aria-live="polite"
      aria-atomic
      className={cn(
        'pointer-events-none select-none font-mono text-[clamp(1.65rem,8vw,2.35rem)] font-bold tabular-nums leading-none tracking-tight text-[color:var(--terminal-ochre)] sm:text-[clamp(2rem,6.5vw,3.1rem)] md:text-[clamp(2.35rem,5.25vw,3.65rem)]',
        className,
      )}
      style={{
        textShadow:
          '0 0 40px color-mix(in srgb, var(--terminal-bg) 72%, transparent), 0 4px 20px color-mix(in srgb, var(--terminal-bg) 55%, transparent)',
      }}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {formatEnterpriseValuation(amount)}
    </motion.p>
  );
}
