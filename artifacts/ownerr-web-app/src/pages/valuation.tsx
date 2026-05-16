import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { MarketingLayout } from '@/components/MarketingLayout';
import { HeroMarketPulseStrip } from '@/components/landing/MarketPulse';
import { ValuationEngine } from '@/components/landing/ValuationEngine';
import { StrategicInsights } from '@/components/landing/StrategicInsights';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_VALUATION_INPUTS,
  type ValuationInputs,
  buildStrategicInsights,
  computeValuationIntel,
} from '@/lib/valuationIntel';
import { marketplacePath } from '@/lib/appPaths';

export default function ValuationPage() {
  const [inputs, setInputs] = useState<ValuationInputs>(DEFAULT_VALUATION_INPUTS);
  const out = useMemo(() => computeValuationIntel(inputs), [inputs]);
  const insights = useMemo(() => buildStrategicInsights(inputs, out), [inputs, out]);

  return (
    <MarketingLayout>
      <HeroMarketPulseStrip />
      <div className="mx-auto max-w-[1200px] space-y-10 px-4 py-10 sm:py-14">
        <header className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--terminal-muted)]">
            Valuation intelligence
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[color:var(--terminal-fg)] sm:text-4xl">Workspace</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-[color:var(--terminal-muted)]">
            Institutional-grade scenario modeling for founders and deal teams. Outputs pair with the marketplace when
            you choose to execute — the same verification stack follows the asset.
          </p>
        </header>
        <ValuationEngine value={inputs} onChange={setInputs} />
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-[color:var(--terminal-fg)]">Live insight synthesis</h2>
          <StrategicInsights insights={insights} />
        </section>
        <div className="flex flex-wrap gap-3">
          <Button
            asChild
            className="h-11 rounded-[10px] border-0 bg-[color:var(--terminal-ochre)] font-bold text-[#0b0b0c] hover:bg-[color:var(--terminal-ochre-hover)]"
          >
            <Link href="/">Back to overview</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-11 rounded-[10px] border-[color:var(--terminal-border)] bg-transparent font-bold text-[color:var(--terminal-fg)] hover:bg-[color:var(--terminal-surface-2)]"
          >
            <Link href={marketplacePath('/acquire')}>Enter marketplace</Link>
          </Button>
        </div>
      </div>
    </MarketingLayout>
  );
}
