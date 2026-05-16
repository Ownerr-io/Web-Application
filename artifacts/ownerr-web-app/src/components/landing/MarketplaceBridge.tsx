import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { appPath, marketplacePath } from '@/lib/appPaths';
import { Check } from 'lucide-react';

const BULLETS = [
  'Verified startup listings with revenue, traffic, and domain signals',
  'Structured acquisition workflows from interest through diligence',
  'Buyer / seller matching with institutional-grade bid mechanics',
  'Transparent bidding with audit-friendly offer history',
  'Trust scoring and readiness signals aligned to closing risk',
] as const;

export function MarketplaceBridge() {
  return (
    <section className="rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)] px-5 py-10 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-[1100px]">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[color:var(--terminal-muted)]">Marketplace</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-[color:var(--terminal-fg)] sm:text-3xl">Execution layer, same terminal discipline</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--terminal-muted)]">
          Intelligence is only valuable when it connects to real listings and counterparties. Ownerr pairs scenario
          output with verified supply — so you move from model to mandate without switching context.
        </p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {BULLETS.map((b) => (
            <li key={b} className="flex gap-2.5 text-sm text-[color:var(--terminal-fg)]/90">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[color:var(--terminal-border)] bg-[color:var(--terminal-bg)]">
                <Check className="h-3 w-3 text-[color:var(--terminal-lime)]" aria-hidden />
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button asChild className="h-11 rounded-[10px] border-0 bg-[color:var(--terminal-ochre)] font-bold text-[#0b0b0c] hover:bg-[color:var(--terminal-ochre-hover)]">
            <Link href={appPath('/seller')}>List on Ownerr</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-11 rounded-[10px] border-[color:var(--terminal-border)] bg-transparent font-bold text-[color:var(--terminal-fg)] hover:bg-[color:var(--terminal-surface-2)]"
          >
            <Link href={marketplacePath('/acquire')}>Browse Acquisitions</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
