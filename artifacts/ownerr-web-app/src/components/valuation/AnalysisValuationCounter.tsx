import { motion, useReducedMotion } from 'framer-motion';
import { formatShortCurrency, cn } from '@/lib/utils';
import { useLoopingValuationCounter } from './useLoopingValuationCounter';

type Props = {
  estimatedValuation: number;
  className?: string;
};

export function AnalysisValuationCounter({ estimatedValuation, className }: Props) {
  const reduce = useReducedMotion();
  const amount = useLoopingValuationCounter(estimatedValuation, 2200, !reduce);

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
      initial={reduce ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {formatShortCurrency(amount)}
    </motion.p>
  );
}
