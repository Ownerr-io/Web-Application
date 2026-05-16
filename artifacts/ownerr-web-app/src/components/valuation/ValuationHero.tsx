import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ValuationAuroraOrb } from './ValuationAuroraOrb';

type Props = {
  onStart: () => void;
};

const easePremium = [0.22, 1, 0.36, 1] as const;

const HEADLINE = 'Discover what your startup is really worth';

export function ValuationHero({ onStart }: Props) {
  const reduce = useReducedMotion();
  const words = HEADLINE.split(' ');

  return (
    <section className="relative min-h-[calc(100svh-3.25rem)] overflow-hidden border-b border-[color:var(--terminal-border)] bg-[color:var(--terminal-bg)] sm:min-h-[calc(100svh-4rem)]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 50% 0%, color-mix(in srgb, var(--terminal-glow) 90%, transparent), transparent 62%), radial-gradient(ellipse 60% 50% at 80% 100%, color-mix(in srgb, var(--terminal-ochre) 10%, transparent), transparent 55%)',
        }}
      />
      <motion.div
        className="pointer-events-none absolute left-1/2 top-[12%] h-[min(520px,55vw)] w-[min(520px,90vw)] -translate-x-1/2 rounded-full opacity-40 blur-[80px]"
        style={{ background: 'var(--terminal-glow)' }}
        animate={reduce ? undefined : { scale: [1, 1.08, 1], opacity: [0.35, 0.5, 0.35] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="relative mx-auto flex max-w-[1200px] flex-col items-center px-4 pb-16 pt-8 text-center sm:pt-12 md:pt-14"
        initial={false}
      >
        <motion.p
          className="text-[11px] font-bold uppercase tracking-[0.28em] text-[color:var(--terminal-muted)]"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: easePremium }}
        >
          Clarity feels good
        </motion.p>

        <div className="mt-6 flex w-full justify-center">
          <ValuationAuroraOrb size={320} targetIndex={78} />
        </div>

        <h1 className="mt-8 max-w-3xl text-balance text-3xl font-bold leading-[1.12] tracking-tight text-[color:var(--terminal-fg)] sm:text-4xl md:text-[2.65rem]">
          {words.map((word, i) => (
            <motion.span
              key={`${word}-${i}`}
              className="inline-block"
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.12 + i * 0.04,
                duration: 0.42,
                ease: easePremium,
              }}
            >
              {word}
              {i < words.length - 1 ? '\u00a0' : ''}
            </motion.span>
          ))}
        </h1>

        <motion.p
          className="mt-4 max-w-xl text-sm leading-relaxed text-[color:var(--terminal-muted)] sm:text-base"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.45, ease: easePremium }}
        >
          AI-powered valuation intelligence for fundraising, acquisitions, and strategic growth — inspired by a living
          score, built for founders.
        </motion.p>

        <motion.div
          className="mt-9 flex w-full max-w-sm flex-col items-center gap-3 sm:max-w-none sm:flex-row sm:justify-center"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.45, ease: easePremium }}
        >
          <Button
            type="button"
            onClick={onStart}
            className="h-12 w-full rounded-full border-0 bg-[color:var(--terminal-ochre)] px-8 text-sm font-bold text-[#0b0b0c] shadow-[0_8px_32px_-8px_color-mix(in_srgb,var(--terminal-ochre)_55%,transparent)] hover:bg-[color:var(--terminal-ochre-hover)] sm:w-auto"
          >
            Start valuation
          </Button>
          <p className="text-xs text-[color:var(--terminal-muted)]">~3 min · private · no credit card</p>
        </motion.div>

        <motion.ul
          className="mt-12 grid w-full max-w-2xl gap-3 text-left sm:grid-cols-3"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75, duration: 0.5 }}
        >
          {[
            { k: 'Past', v: 'Benchmark your category and stage' },
            { k: 'Present', v: 'Live signals as you enter metrics' },
            { k: 'Progress', v: 'Unlock full intelligence after analysis' },
          ].map((item, idx) => (
            <motion.li
              key={item.k}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + idx * 0.07, duration: 0.4, ease: easePremium }}
              className="rounded-[10px] border border-[color:var(--terminal-border)]/80 bg-[color:var(--terminal-surface)]/60 px-4 py-3 backdrop-blur-sm"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--terminal-ochre)]">
                {item.k}
              </p>
              <p className="mt-1 text-xs leading-snug text-[color:var(--terminal-muted)]">{item.v}</p>
            </motion.li>
          ))}
        </motion.ul>
      </motion.div>
    </section>
  );
}
