import { MarketingLayout } from '@/components/MarketingLayout';
import { AcquisitionFlow } from '@/components/landing/AcquisitionFlow';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { marketplacePath } from '@/lib/appPaths';
import { MARKETING_SHELL_CLASS } from '@/lib/marketingShell';
import { cn } from '@/lib/utils';

const ROLES = [
  {
    title: 'Founders & operators',
    points: [
      'Run scenario valuations with defensible ranges and confidence bands.',
      'Publish verified listings when you are ready — metrics stay aligned to the model.',
      'Track readiness scores buyers actually use in first-pass screens.',
    ],
  },
  {
    title: 'Investors & acquirers',
    points: [
      'Filter supply by retention, efficiency, and sector multiples in one desk view.',
      'Compare IOI timing and bid depth against rolling market intelligence.',
      'Move from indication to diligence without re-keying the same data room.',
    ],
  },
] as const;

const CHECKLIST = [
  'Revenue and growth inputs tied to valuation engine',
  'Strategic intelligence cards generated per scenario',
  'Verification stack before marketplace visibility',
  'Structured bid workflow with audit-friendly history',
] as const;

export default function HowItWorksPage() {
  return (
    <MarketingLayout>
      <div className={cn(MARKETING_SHELL_CLASS, 'space-y-10 py-10 sm:space-y-12 sm:py-14')}>
        <header className="space-y-3.5 border-b border-[color:var(--terminal-border)] pb-8">
          <p className="terminal-eyebrow">Workflow</p>
          <h1 className="text-balance leading-tight">From model to mandate</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-[color:var(--terminal-muted)]">
            Ownerr keeps intelligence and execution on one spine: valuation scenarios inform what you list, how you bid,
            and how diligence progresses — without re-building trust at each hop.
          </p>
        </header>

        <AcquisitionFlow />

        <section className="grid gap-4 md:grid-cols-2">
          {ROLES.map((role) => (
            <article
              key={role.title}
              className="rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)] p-5"
            >
              <h2 className="text-balance text-base font-bold">{role.title}</h2>
              <ul className="mt-4 space-y-3">
                {role.points.map((point) => (
                  <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-[color:var(--terminal-muted)]">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[color:var(--terminal-lime)]" aria-hidden />
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface-2)] p-6">
          <h2 className="text-balance">Acquisition readiness</h2>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--terminal-muted)]">
            Verification and readiness scores align buyer expectations before first contact. Sellers see the same
            progression bars in-product — reducing broken processes and re-trades late in cycle.
          </p>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {CHECKLIST.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 rounded-[8px] border border-[color:var(--terminal-border)]/80 bg-[color:var(--terminal-surface)] px-3 py-2.5 text-xs font-medium leading-relaxed text-[color:var(--terminal-fg)]"
              >
                <span className="font-mono text-[color:var(--terminal-ochre)]" aria-hidden>
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-wrap gap-3 border-t border-[color:var(--terminal-border)] pt-8">
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
          <Button
            asChild
            variant="ghost"
            className="h-11 rounded-[10px] font-bold text-[color:var(--terminal-muted)] hover:text-[color:var(--terminal-fg)]"
          >
            <Link href="/market-intelligence">Market intelligence</Link>
          </Button>
        </section>
      </div>
    </MarketingLayout>
  );
}
