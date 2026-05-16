import { MarketingLayout } from '@/components/MarketingLayout';
import { AcquisitionFlow } from '@/components/landing/AcquisitionFlow';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { marketplacePath } from '@/lib/appPaths';

export default function HowItWorksPage() {
  return (
    <MarketingLayout>
      <div className="mx-auto max-w-[1200px] space-y-10 px-4 py-10 sm:py-14">
        <header className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--terminal-muted)]">Workflow</p>
          <h1 className="text-3xl font-bold tracking-tight text-[color:var(--terminal-fg)] sm:text-4xl">From model to mandate</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-[color:var(--terminal-muted)]">
            Ownerr keeps intelligence and execution on one spine: valuation scenarios inform what you list, how you bid,
            and how diligence progresses — without re-building trust at each hop.
          </p>
        </header>
        <AcquisitionFlow />
        <section className="space-y-4 rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface-2)] p-6">
          <h2 className="text-lg font-bold text-[color:var(--terminal-fg)]">Acquisition readiness</h2>
          <p className="text-sm leading-relaxed text-[color:var(--terminal-muted)]">
            Verification and readiness scores align buyer expectations before first contact. Sellers see the same
            progression bars in-product — reducing broken processes and re-trades late in cycle.
          </p>
        </section>
        <div className="flex flex-wrap gap-3">
          <Button
            asChild
            className="h-11 rounded-[10px] border-0 bg-[color:var(--terminal-ochre)] font-bold text-[#0b0b0c] hover:bg-[color:var(--terminal-ochre-hover)]"
          >
            <Link href="/valuation">Run valuation</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-11 rounded-[10px] border-[color:var(--terminal-border)] bg-transparent font-bold text-[color:var(--terminal-fg)] hover:bg-[color:var(--terminal-surface-2)]"
          >
            <Link href={marketplacePath('/acquire')}>Browse acquisitions</Link>
          </Button>
        </div>
      </div>
    </MarketingLayout>
  );
}
