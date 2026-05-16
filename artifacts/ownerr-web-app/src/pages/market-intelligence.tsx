import { MarketingLayout } from '@/components/MarketingLayout';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { marketplacePath } from '@/lib/appPaths';

const PANELS = [
  { k: 'M&A_VELOCITY', v: '↑ 6.2% q/q', sub: 'Strategic > financial sponsor mix' },
  { k: 'AI_DEAL_HEAT', v: 'High · inflow', sub: 'Bid depth concentrated in infra + workflow' },
  { k: 'MULTIPLE_DRIFT', v: '-0.4 turns', sub: 'SaaS $2–8M ARR band tightening' },
  { k: 'CROSS_BORDER', v: 'Stable', sub: 'FX-hedged processes unchanged w/w' },
  { k: 'SECONDARIES', v: 'Thin', sub: 'LP-led blocks below 12mo median' },
  { k: 'EARLY_STAGE', v: 'Soft', sub: 'Seed extension cadence elevated' },
] as const;

export default function MarketIntelligencePage() {
  return (
    <MarketingLayout>
      <div className="mx-auto max-w-[1200px] space-y-8 px-4 py-10 sm:py-14">
        <header className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--terminal-muted)]">
            Market intelligence
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[color:var(--terminal-fg)] sm:text-4xl">
            Startup liquidity radar
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-[color:var(--terminal-muted)]">
            Rolling desk notes distilled into a terminal-native snapshot. Figures are illustrative composites — pair with
            your own scenario outputs before allocation decisions.
          </p>
        </header>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PANELS.map((p) => (
            <div
              key={p.k}
              className="rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)] p-4"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-muted)]">{p.k}</div>
              <div className="mt-2 font-mono text-lg font-bold tabular-nums text-[color:var(--terminal-ochre)]">{p.v}</div>
              <p className="mt-2 text-xs leading-relaxed text-[color:var(--terminal-muted)]">{p.sub}</p>
            </div>
          ))}
        </div>
        <div className="rounded-[10px] border border-dashed border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface-2)] p-5">
          <p className="text-sm font-bold text-[color:var(--terminal-fg)]">Desk note</p>
          <p className="mt-2 text-xs leading-relaxed text-[color:var(--terminal-muted)]">
            Buyers are underwriting slower but paying for verified retention and margin durability. Listings with full
            verification stack clear diligence in fewer cycles — route through Ownerr verification before broad
            outreach.
          </p>
          <Button
            asChild
            className="mt-4 h-10 rounded-[10px] border-0 bg-[color:var(--terminal-ochre)] font-bold text-[#0b0b0c] hover:bg-[color:var(--terminal-ochre-hover)]"
          >
            <Link href={marketplacePath('/acquire')}>View verified supply</Link>
          </Button>
        </div>
      </div>
    </MarketingLayout>
  );
}
