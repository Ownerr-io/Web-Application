import { MarketingLayout } from '@/components/MarketingLayout';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { marketplacePath } from '@/lib/appPaths';

const TIERS = [
  {
    name: 'Terminal',
    price: '$0',
    cadence: 'while in beta',
    bullets: ['Valuation workspace', 'Market intelligence snapshot', 'Public marketplace browse'],
  },
  {
    name: 'Desk',
    price: 'Contact',
    cadence: 'annual',
    bullets: ['Team seats', 'Deeper verification bundle', 'Priority routing to counterparty desk'],
  },
  {
    name: 'Institution',
    price: 'Contact',
    cadence: 'custom MSA',
    bullets: ['API + data room integrations', 'Custom comparables ingest', 'Dedicated success lead'],
  },
] as const;

export default function PricingPage() {
  return (
    <MarketingLayout>
      <div className="mx-auto max-w-[1200px] space-y-10 px-4 py-10 sm:py-14">
        <header className="space-y-3.5 border-b border-white/10 pb-8">
          <p className="terminal-eyebrow">Pricing</p>
          <h1 className="text-balance leading-tight">Transparent tiers</h1>
          <p className="max-w-2xl text-sm font-medium text-[color:var(--terminal-muted)] leading-relaxed mt-2">
            Start in the terminal workspace, graduate into execution when you need verified supply and structured
            workflows. Enterprise packaging follows your process — not the other way around.
          </p>
        </header>
        <div className="grid gap-4 md:grid-cols-3">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className="flex flex-col rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)] p-5"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-muted)]">{t.name}</div>
              <div className="mt-3 font-mono text-2xl font-bold text-[color:var(--terminal-ochre)]">{t.price}</div>
              <div className="text-xs text-[color:var(--terminal-muted)]">{t.cadence}</div>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-[color:var(--terminal-fg)]/90">
                {t.bullets.map((b) => (
                  <li key={b} className="border-l-2 border-[color:var(--terminal-border)] pl-3">
                    {b}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="mt-6 h-10 w-full rounded-[10px] border-0 bg-[color:var(--terminal-ochre)] font-bold text-[#0b0b0c] hover:bg-[color:var(--terminal-ochre-hover)]"
              >
                <Link href={marketplacePath('/')}>Open marketplace</Link>
              </Button>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-[color:var(--terminal-muted)]">
          Fees on closed transactions may apply on marketplace outcomes — disclosed before you accept a mandate.
        </p>
      </div>
    </MarketingLayout>
  );
}
