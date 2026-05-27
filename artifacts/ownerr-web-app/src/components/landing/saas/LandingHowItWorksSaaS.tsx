import { Link } from 'wouter';
import { Reveal, RevealItem, RevealStagger } from '@/components/landing/saas/Reveal';
import { SectionHeader } from '@/components/landing/saas/SectionHeader';
import { marketingRoutes } from '@/routes/marketingRoutes';
import { cn } from '@/lib/utils';

const STEPS = [
  {
    step: '01',
    title: 'Model the business',
    body: 'Stress growth, retention, and efficiency in the valuation terminal. Outputs update as you iterate.',
    accent: 'lime' as const,
  },
  {
    step: '02',
    title: 'Read the market',
    body: 'Anchor price against multiples, bid depth, and sector drift from the intelligence layer.',
    accent: 'orange' as const,
  },
  {
    step: '03',
    title: 'List or acquire',
    body: 'Verified marketplace supply with structured workflows and audit-friendly deal history.',
    accent: 'red' as const,
  },
  {
    step: '04',
    title: 'Scale distribution',
    body: 'Founder OS and Unemployed Network extend reach without leaving the platform.',
    accent: 'lime' as const,
  },
] as const;

const accentText = {
  lime: 'text-brand-lime',
  orange: 'text-brand-orange',
  red: 'text-brand-red',
};

export function LandingHowItWorksSaaS() {
  return (
    <section className="luxury-section-gap saas-section-shell border-t border-[color:var(--terminal-border)]/60">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeader
          index="03"
          label="Process"
          title="From model to mandate"
          description="A deliberate sequence — not a feature dump. Each step feeds the next on one spine."
          className="lg:max-w-xl"
        />
        <Reveal delay={1}>
          <Link
            href={marketingRoutes.howItWorks}
            className="inline-flex items-center gap-2 text-sm font-bold text-brand-orange hover:underline"
          >
            Full workflow
            <span aria-hidden>→</span>
          </Link>
        </Reveal>
      </div>

      <RevealStagger className="mt-14 space-y-0">
        {STEPS.map((s, i) => (
          <RevealItem key={s.step}>
            <div
              className={cn(
                'grid gap-6 border-t border-[color:var(--terminal-border)]/70 py-8 md:grid-cols-[6rem_1fr] md:gap-10 md:py-10',
                i === 0 && 'border-t-0 pt-0',
              )}
            >
              <div>
                <p className={cn('font-mono text-2xl font-light tabular-nums', accentText[s.accent])}>{s.step}</p>
              </div>
              <div className="max-w-2xl">
                <h3 className="text-xl font-bold text-[color:var(--terminal-display)]">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[color:var(--terminal-muted)] sm:text-[15px]">
                  {s.body}
                </p>
              </div>
            </div>
          </RevealItem>
        ))}
      </RevealStagger>
    </section>
  );
}
