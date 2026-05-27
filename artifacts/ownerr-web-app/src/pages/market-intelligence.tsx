import { MarketingLayout } from '@/components/MarketingLayout';
import { MARKETING_SHELL_CLASS } from '@/lib/marketingShell';
import { cn } from '@/lib/utils';

const PANELS = [
  { k: 'M&A_VELOCITY', v: '↑ 6.2% q/q', sub: 'Strategic > financial sponsor mix', tone: 'up' as const },
  { k: 'AI_DEAL_HEAT', v: 'High · inflow', sub: 'Bid depth concentrated in infra + workflow', tone: 'hot' as const },
  { k: 'MULTIPLE_DRIFT', v: '-0.4 turns', sub: 'SaaS $2–8M ARR band tightening', tone: 'down' as const },
  { k: 'CROSS_BORDER', v: 'Stable', sub: 'FX-hedged processes unchanged w/w', tone: 'flat' as const },
  { k: 'SECONDARIES', v: 'Thin', sub: 'LP-led blocks below 12mo median', tone: 'flat' as const },
  { k: 'EARLY_STAGE', v: 'Soft', sub: 'Seed extension cadence elevated', tone: 'down' as const },
] as const;

const SECTOR_ROWS = [
  { sector: 'B2B SaaS · workflow', multiple: '4.8–6.2× ARR', trend: 'Tightening', note: 'Buyers discount sub-85% NRR' },
  { sector: 'AI infra · tooling', multiple: '7.5–11× ARR', trend: 'Premium', note: 'Strategic scarcity on verified data moats' },
  { sector: 'Vertical fintech', multiple: '3.2–4.5× revenue', trend: 'Stable', note: 'Reg path drives diligence length' },
  { sector: 'Consumer subscription', multiple: '2.1–3.0× revenue', trend: 'Soft', note: 'CAC payback >18mo penalized' },
  { sector: 'Marketplace / network', multiple: '5.5–8.0× GMV net', trend: 'Selective', note: 'Liquidity depth matters more than GMV' },
] as const;

const PULSE = [
  { label: 'Median time-to-IOI', value: '11.4d', delta: '-1.2d vs 90d' },
  { label: 'Verified listing share', value: '68%', delta: '+4pp w/w' },
  { label: 'Strategic bid share', value: '41%', delta: 'Flat w/w' },
] as const;

function toneClass(tone: (typeof PANELS)[number]['tone']) {
  if (tone === 'up' || tone === 'hot') return 'text-[color:var(--terminal-lime)]';
  if (tone === 'down') return 'text-[color:var(--terminal-ochre)]';
  return 'text-[color:var(--terminal-fg)]';
}

export default function MarketIntelligencePage() {
  return (
    <MarketingLayout>
      <div className={cn(MARKETING_SHELL_CLASS, 'space-y-10 py-10 sm:space-y-12 sm:py-14')}>
        <header className="space-y-3.5 border-b border-[color:var(--terminal-border)] pb-8">
          <p className="terminal-eyebrow">Market intelligence</p>
          <h1 className="text-balance leading-tight">Startup liquidity radar</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-[color:var(--terminal-muted)]">
            Rolling desk notes distilled into a terminal-native snapshot. Figures are illustrative composites — pair
            with your own scenario outputs before allocation decisions.
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          {PULSE.map((p) => (
            <div
              key={p.label}
              className="rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)] px-4 py-3"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-muted)]">
                {p.label}
              </p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums text-[color:var(--terminal-ochre)]">{p.value}</p>
              <p className="mt-1 text-xs text-[color:var(--terminal-muted)]">{p.delta}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PANELS.map((p) => (
            <div
              key={p.k}
              className="rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)] p-4 transition-colors hover:border-[color:var(--terminal-ochre)]/30"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-muted)]">{p.k}</div>
              <div className={cn('mt-2 font-mono text-lg font-bold tabular-nums', toneClass(p.tone))}>{p.v}</div>
              <p className="mt-2 text-xs leading-relaxed text-[color:var(--terminal-muted)]">{p.sub}</p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]">
          <div className="border-b border-[color:var(--terminal-border)] px-4 py-3">
            <h2 className="text-balance text-base font-bold">Sector multiple monitor</h2>
            <p className="mt-1 text-xs text-[color:var(--terminal-muted)]">Indicative bands · not investment advice</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-[color:var(--terminal-border)] text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-muted)]">
                  <th className="px-4 py-3 font-bold">Sector</th>
                  <th className="px-4 py-3 font-bold">Band</th>
                  <th className="px-4 py-3 font-bold">Trend</th>
                  <th className="px-4 py-3 font-bold">Desk read</th>
                </tr>
              </thead>
              <tbody>
                {SECTOR_ROWS.map((row) => (
                  <tr key={row.sector} className="border-b border-[color:var(--terminal-border)]/60 last:border-0">
                    <td className="px-4 py-3 font-semibold text-[color:var(--terminal-fg)]">{row.sector}</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-[color:var(--terminal-ochre)]">{row.multiple}</td>
                    <td className="px-4 py-3 text-[color:var(--terminal-muted)]">{row.trend}</td>
                    <td className="px-4 py-3 text-xs leading-relaxed text-[color:var(--terminal-muted)]">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="w-full">
          <div className="w-full rounded-[10px] border border-dashed border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface-2)] px-5 py-6 sm:px-6">
            <div className="flex w-full flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="text-balance">Desk note</h2>
                <p className="mt-3 max-w-none text-sm leading-relaxed text-[color:var(--terminal-muted)]">
                  Buyers are underwriting slower but paying for verified retention and margin durability. Listings with
                  a full verification stack clear diligence in fewer cycles — route through Ownerr verification before
                  broad outreach.
                </p>
                <p className="mt-3 max-w-none text-sm leading-relaxed text-[color:var(--terminal-muted)]/90">
                  Next refresh: composite roll-forward after weekly strategic bid tape. Export scenario PDFs from
                  valuation before sharing externally.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
