import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { marketplacePath } from '@/lib/appPaths';
import { cn } from '@/lib/utils';
import { HeroMarketPulseStrip } from '@/components/landing/MarketPulse';

type PulseRow = { label: string; value: string; heat: 'low' | 'mid' | 'high' };

const DEMO_ROWS: PulseRow[] = [
  { label: 'ACQ_HEAT', value: '0.74σ', heat: 'high' },
  { label: 'INV_APPETITE', value: '62 / 100', heat: 'mid' },
  { label: 'EXIT_WINDOW', value: 'Favorable · 90d', heat: 'high' },
  { label: 'CONF_BAND', value: '±8.4%', heat: 'low' },
  { label: 'LIQUIDITY', value: 'Strategic bid depth ↑', heat: 'mid' },
];

function heatDot(heat: PulseRow['heat']) {
  return cn(
    'h-1.5 w-1.5 rounded-full',
    heat === 'high' &&
      'bg-[color:var(--terminal-lime)] shadow-sm dark:shadow-[0_0_10px_rgba(183,245,66,0.45)]',
    heat === 'mid' && 'bg-[color:var(--terminal-ochre)]/85',
    heat === 'low' && 'bg-[color:var(--terminal-muted)]',
  );
}

export function HeroTerminal() {
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 2600);
    return () => window.clearInterval(id);
  }, [reduce]);

  const liveMetrics = useMemo(() => {
    const nudge = reduce ? 0 : (tick % 5) * 0.12;
    return [
      { k: 'IMPLIED_ARR', v: `$${(4.2 + nudge).toFixed(1)}M` },
      { k: 'NET_REV_RET', v: `${(108.4 + nudge).toFixed(1)}%` },
      { k: 'RULE_OF_40', v: `${(41 + nudge * 3).toFixed(0)}` },
    ];
  }, [tick, reduce]);

  return (
    <section className="relative flex min-h-[calc(100svh-3.25rem)] flex-col overflow-hidden border-b border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)] pb-[env(safe-area-inset-bottom,0px)] sm:min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4.5rem)]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at top right, var(--terminal-glow), transparent 58%)',
        }}
      />
      <div className="relative flex flex-1 flex-col justify-center px-4 py-6 pb-8 sm:py-8 md:py-12 lg:py-14">
        <div className="mx-auto grid w-full max-w-[1200px] gap-6 md:grid-cols-[1fr_minmax(0,1.08fr)] md:items-center md:gap-10 lg:gap-12">
        <div className="min-w-0 space-y-5 md:space-y-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--terminal-muted)] md:text-xs">
            Ownerr · Terminal
          </p>
          <h1 className="text-balance text-3xl font-bold leading-[1.06] tracking-tight text-[color:var(--terminal-fg)] sm:text-4xl md:text-[2.5rem] lg:text-[2.85rem]">
            VALUATION INTELLIGENCE TERMINAL
          </h1>
          <p className="max-w-xl text-sm font-bold text-[color:var(--terminal-muted)] sm:text-base md:text-lg">
            Know whether to{' '}
            <span className="text-[color:var(--terminal-ochre)]">sell</span>,{' '}
            <span className="text-[color:var(--terminal-ochre)]">hold</span>, or{' '}
            <span className="text-[color:var(--terminal-ochre)]">raise</span>
            {' — '}before the market decides for you.
          </p>
          <p className="max-w-xl text-xs leading-relaxed text-[color:var(--terminal-muted)] sm:text-sm">
            Ownerr synthesizes operating metrics, acquisition comparables, and investor flow into a
            single institutional-grade view — then routes you into verified listings and structured
            deal workflows when execution makes sense.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              asChild
              className="h-11 rounded-[10px] border-0 bg-[color:var(--terminal-ochre)] px-5 text-sm font-bold text-[#0b0b0c] shadow-sm hover:bg-[color:var(--terminal-ochre-hover)] md:h-12 md:px-6"
            >
              <Link href="/valuation">Run Valuation</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-11 rounded-[10px] border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface-2)] px-5 text-sm font-bold text-[color:var(--terminal-fg)] hover:bg-[color:var(--terminal-surface)] md:h-12 md:px-6"
            >
              <Link href={marketplacePath('/acquire')}>Enter Marketplace</Link>
            </Button>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex min-h-[13rem] flex-col rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-bg)] shadow-sm sm:min-h-[14rem] md:min-h-[15rem]">
            <div className="flex items-center justify-between border-b border-[color:var(--terminal-border)] px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-muted)] md:px-5 md:py-3 md:text-[11px]">
              <span className="tabular-nums">session_{reduce ? 'static' : 'live'}</span>
              <span className="flex items-center gap-1.5 text-[color:var(--terminal-fg)]">
                <span className={cn('inline-block h-2 w-2 rounded-full bg-[color:var(--terminal-lime)]', !reduce && 'animate-pulse')} />
                MARKET_PULSE
              </span>
            </div>
            <div className="grid min-h-0 flex-1 gap-0 font-mono text-[11px] sm:text-xs md:grid-cols-2 md:text-[13px]">
              <div className="border-b border-[color:var(--terminal-border)] p-4 md:border-r md:p-5">
                <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-muted)]">
                  Live metrics
                </div>
                <ul className="space-y-2.5">
                  {liveMetrics.map((m) => (
                    <li key={m.k} className="flex items-center justify-between gap-3">
                      <span className="text-[color:var(--terminal-muted)]">{m.k}</span>
                      <motion.span
                        key={m.v}
                        initial={reduce ? false : { opacity: 0.35 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.35 }}
                        className="font-bold tabular-nums text-[color:var(--terminal-ochre)]"
                      >
                        {m.v}
                      </motion.span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 md:p-5">
                <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-muted)]">
                  Acquisition intelligence
                </div>
                <ul className="space-y-2">
                  {DEMO_ROWS.map((row) => (
                    <li
                      key={row.label}
                      className="flex items-center justify-between gap-2 border-b border-dashed border-[color:var(--terminal-border)] py-1.5 last:border-0"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-[color:var(--terminal-muted)]">
                        <span className={heatDot(row.heat)} aria-hidden />
                        <span className="truncate">{row.label}</span>
                      </span>
                      <span className="shrink-0 font-bold tabular-nums text-[color:var(--terminal-ochre)]">{row.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="border-t border-[color:var(--terminal-border)] px-4 py-2.5 text-[10px] text-[color:var(--terminal-muted)] md:px-5 md:py-3 md:text-[11px]">
              <span className="inline-block align-middle">
                <span className={cn('mr-1 inline-block h-3 w-1.5 bg-[color:var(--terminal-ochre)]', !reduce && 'animate-pulse')} />
              </span>
              Awaiting your parameters — model outputs refresh on edit.
            </div>
          </div>
        </div>
        </div>
      </div>
      <HeroMarketPulseStrip className="mt-auto" />
    </section>
  );
}
