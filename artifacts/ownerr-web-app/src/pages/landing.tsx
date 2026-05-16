import { useMemo } from 'react';
import { Link } from 'wouter';
import { HeroTerminal } from '@/components/landing/HeroTerminal';
import { ValuationEngine } from '@/components/landing/ValuationEngine';
import { StrategicInsights } from '@/components/landing/StrategicInsights';
import { MarketplaceBridge } from '@/components/landing/MarketplaceBridge';
import { TrustMetrics } from '@/components/landing/TrustMetrics';
import { AcquisitionFlow } from '@/components/landing/AcquisitionFlow';
import { DEFAULT_VALUATION_INPUTS, buildStrategicInsights, computeValuationIntel } from '@/lib/valuationIntel';
import { marketplacePath } from '@/lib/appPaths';

export default function Landing() {
  const insights = useMemo(() => {
    const o = computeValuationIntel(DEFAULT_VALUATION_INPUTS);
    return buildStrategicInsights(DEFAULT_VALUATION_INPUTS, o);
  }, []);

  return (
    <>
      <HeroTerminal />
      <div className="mx-auto max-w-[1200px] space-y-10 px-4 py-10 sm:space-y-16 sm:py-16 md:py-20">
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-[color:var(--terminal-fg)] sm:text-2xl">Scenario engine</h2>
          <p className="max-w-2xl text-sm text-[color:var(--terminal-muted)]">
            Model your operating reality in a terminal-native layout. Outputs update as you stress inputs — mirroring
            how desks iterate live during a process.
          </p>
          <ValuationEngine />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-[color:var(--terminal-fg)] sm:text-2xl">Strategic insights</h2>
          <p className="max-w-2xl text-sm text-[color:var(--terminal-muted)]">
            Narrative cards translate quantitative output into decision language — with explicit confidence and the
            metrics that drove each call.
          </p>
          <StrategicInsights insights={insights} />
        </section>

        <TrustMetrics />

        <MarketplaceBridge />

        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-[color:var(--terminal-fg)] sm:text-2xl">How it works</h2>
          <AcquisitionFlow />
        </section>

        <div className="flex flex-col items-start justify-between gap-4 rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)] px-5 py-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold text-[color:var(--terminal-fg)]">Ready to run your desk?</p>
            <p className="mt-1 text-xs text-[color:var(--terminal-muted)]">Deep-dive valuation workspace with export-friendly outputs.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            <Link
              href="/valuation"
              className="inline-flex h-11 min-h-11 w-full shrink-0 items-center justify-center rounded-[10px] bg-[color:var(--terminal-ochre)] px-5 text-sm font-bold text-[color:var(--brand-accent-ink)] shadow-sm transition-colors hover:bg-[color:var(--terminal-ochre-hover)] sm:h-10 sm:min-h-10 sm:w-auto"
            >
              Open valuation workspace
            </Link>
            <Link
              href={marketplacePath('/acquire')}
              className="inline-flex h-11 min-h-11 w-full shrink-0 items-center justify-center rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface-2)] px-5 text-sm font-bold text-[color:var(--terminal-fg)] transition-colors hover:bg-[color:var(--terminal-bg)] sm:h-10 sm:min-h-10 sm:w-auto"
            >
              Browse marketplace
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
