import { Link } from 'wouter';
import { RevealItem, RevealStagger } from '@/components/landing/saas/Reveal';
import { SectionHeader } from '@/components/landing/saas/SectionHeader';
import { marketingRoutes } from '@/routes/marketingRoutes';
import { marketplacePath } from '@/lib/appPaths';
import { cn } from '@/lib/utils';

const CAPABILITIES = [
  { title: 'Scenario engine', body: 'Live valuation as you edit.', href: marketingRoutes.valuation, wide: true },
  { title: 'Market intelligence', body: 'Multiples and flow in one view.', href: marketingRoutes.marketIntelligence, wide: false },
  { title: 'Verified listings', body: 'Supply aligned to your model.', href: marketplacePath('/'), wide: false },
  { title: 'Structured deals', body: 'Acquisition with clear audit trails.', href: marketingRoutes.howItWorks, wide: false },
  { title: 'Founder OS', body: 'Share cards and referral loops.', href: marketingRoutes.ownerrOs, wide: false },
  { title: 'Ownerr Network', body: 'Profile, discovery, reputation, and referrals.', href: marketingRoutes.ownerrNetwork, wide: false },
] as const;

export function LandingFeaturesBento() {
  return (
    <section className="luxury-section-gap saas-section-shell border-t border-[color:var(--terminal-border)]/60">
      <SectionHeader
        index="04"
        label="Capabilities"
        title="Depth where you need it"
        description="A tight grid of what the terminal actually does — each tile links to the live product."
      />

      <RevealStagger className="mt-14 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CAPABILITIES.map((c) => (
          <RevealItem key={c.title} className={cn(c.wide && 'sm:col-span-2 lg:col-span-2')}>
            <Link
              href={c.href}
              className={cn(
                'luxury-panel group block h-full rounded-[10px] p-6 transition-transform hover:-translate-y-px sm:p-7',
                c.wide && 'lg:p-9',
              )}
            >
              <h3
                className={cn(
                  'font-bold text-[color:var(--terminal-display)]',
                  c.wide ? 'text-xl lg:text-2xl' : 'text-base',
                )}
              >
                {c.title}
              </h3>
              <p className="mt-2 text-sm text-[color:var(--terminal-muted)]">{c.body}</p>
              <span className="mt-6 block text-[10px] font-bold uppercase tracking-[0.22em] text-brand-lime opacity-0 transition-opacity group-hover:opacity-100">
                Open →
              </span>
            </Link>
          </RevealItem>
        ))}
      </RevealStagger>
    </section>
  );
}
