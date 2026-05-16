import { motion, useReducedMotion } from 'framer-motion';

type Props = {
  intensity?: 'intro' | 'flow' | 'results';
  /** Minimal motion so form text stays readable. */
  calm?: boolean;
};

export function ValuationStageBackdrop({ intensity = 'flow', calm = false }: Props) {
  const reduce = useReducedMotion();
  const deep = intensity === 'intro';

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[color:var(--terminal-bg)]"
      aria-hidden
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            calm || deep
              ? 'radial-gradient(ellipse 90% 50% at 50% 100%, color-mix(in srgb, var(--terminal-glow) 35%, transparent), transparent 55%), radial-gradient(ellipse 100% 80% at 50% 0%, color-mix(in srgb, var(--terminal-bg) 100%, transparent), transparent 70%)'
              : 'radial-gradient(ellipse 120% 90% at 50% -30%, color-mix(in srgb, var(--terminal-glow) 70%, transparent), transparent 55%), radial-gradient(ellipse 80% 60% at 0% 100%, color-mix(in srgb, var(--terminal-ochre) 12%, transparent), transparent 45%)',
        }}
      />

      {!reduce && !calm ? (
        <motion.div
          className="absolute left-1/2 top-[10%] h-[min(55vh,440px)] w-[min(92vw,600px)] -translate-x-1/2 rounded-full opacity-40 blur-[100px]"
          style={{ background: 'var(--terminal-glow)' }}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : null}

      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[color:var(--terminal-bg)] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[color:var(--terminal-bg)] to-transparent" />
    </div>
  );
}
