import { Link } from 'wouter';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { marketingRoutes } from '@/routes/marketingRoutes';
import { marketplacePath } from '@/lib/appPaths';
import { fadeUp } from '@/components/landing/saas/motion';
import { cn } from '@/lib/utils';

const PANEL_METRICS = [
  { k: 'IMPLIED_ARR', v: '$4.2M', tone: 'lime' as const },
  { k: 'NET_REV_RET', v: '108.4%', tone: 'orange' as const },
  { k: 'RULE_OF_40', v: '41', tone: 'red' as const },
  { k: 'ACQ_HEAT', v: '0.74σ', tone: 'lime' as const },
] as const;

const toneText = {
  lime: 'text-brand-lime',
  orange: 'text-brand-orange',
  red: 'text-brand-red',
};

export function LandingHeroSaaS() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const orbY = useTransform(scrollY, [0, 500], [0, reduce ? 0 : 40]);

  return (
    <section className="landing-saas-hero relative overflow-hidden border-b border-[color:var(--terminal-border)]/80">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <motion.div
          className="saas-hero-orb left-[-15%] top-0 h-[min(480px,60vw)] w-[min(480px,60vw)] opacity-50"
          style={{
            y: orbY,
            background: 'color-mix(in srgb, var(--brand-lime) 22%, transparent)',
          }}
        />
        <motion.div
          className="saas-hero-orb right-[-10%] bottom-0 h-[min(400px,50vw)] w-[min(400px,50vw)] opacity-40"
          style={{
            background: 'color-mix(in srgb, var(--brand-red) 14%, transparent)',
          }}
        />
      </div>

      <div className="saas-section-shell relative z-10 grid min-h-[min(92svh,880px)] items-center gap-12 py-14 md:grid-cols-12 md:gap-10 md:py-20 lg:py-24">
        <motion.div
          initial={reduce ? false : 'hidden'}
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.09 } } }}
          className="md:col-span-6 lg:col-span-7"
        >
          <motion.span variants={fadeUp} custom={0} className="luxury-hero-kicker">
            Ownerr
          </motion.span>

          <motion.h1 variants={fadeUp} custom={1} className="marketing-hero-title max-w-[16ch]">
            <span className="text-[color:var(--terminal-display)]">Valuation intelligence</span>
            <span className="mt-2 block platform-gradient-text">for serious operators.</span>
          </motion.h1>

          <motion.p variants={fadeUp} custom={2} className="marketing-lead max-w-md">
            Model the business, read the market, and execute on verified supply — one bespoke terminal. No generic
            startup chrome; built for desks that close.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={marketingRoutes.valuation}
              className="btn-platform-gradient group inline-flex h-12 items-center justify-center gap-2 rounded-[10px] px-7 text-sm font-bold tracking-wide transition-transform hover:scale-[1.01] active:scale-[0.99]"
            >
              Begin valuation
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href={marketplacePath('/acquire')}
              className="inline-flex h-12 items-center justify-center rounded-[10px] border border-[color:var(--terminal-border)] px-7 text-sm font-bold text-[color:var(--terminal-fg)] transition-colors hover:border-[color:var(--brand-orange)]/50 hover:bg-[color:var(--terminal-surface)]/40"
            >
              Marketplace
            </Link>
          </motion.div>

          <motion.p variants={fadeUp} custom={4} className="mt-12 text-xs font-semibold tracking-wide text-[color:var(--terminal-muted)]">
            <span className="text-[color:var(--terminal-fg)]">Institutional models</span>
            <span className="mx-2.5 font-normal text-[color:var(--terminal-border)]">/</span>
            Verified listings
            <span className="mx-2.5 font-normal text-[color:var(--terminal-border)]">/</span>
            Live intelligence
          </motion.p>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.75, delay: 0.15 }}
          className="md:col-span-6 lg:col-span-5"
        >
          <div className="luxury-panel overflow-hidden rounded-[10px]">
            <div className="flex items-center justify-between border-b border-[color:var(--terminal-border)]/80 px-5 py-3.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--terminal-muted)]">
                Terminal
              </span>
              <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-fg)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand-lime)] shadow-[0_0_8px_var(--brand-lime)]" />
                Live
              </span>
            </div>
            <div className="grid gap-px bg-[color:var(--terminal-border)]/50 p-px sm:grid-cols-2">
              {PANEL_METRICS.map((m) => (
                <div
                  key={m.k}
                  className="bg-[color:var(--terminal-bg)]/90 px-5 py-5 backdrop-blur-sm"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-muted)]">
                    {m.k}
                  </p>
                  <p className={cn('mt-2 font-mono text-xl font-bold tabular-nums', toneText[m.tone])}>{m.v}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-[color:var(--terminal-border)]/80 px-5 py-4">
              <p className="text-xs leading-relaxed text-[color:var(--terminal-muted)]">
                Scenario outputs refresh as inputs change — the same engine powering the full valuation workspace.
              </p>
              <Link
                href={marketingRoutes.valuation}
                className="mt-3 inline-flex text-xs font-bold text-brand-orange hover:underline"
              >
                Open workspace
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
