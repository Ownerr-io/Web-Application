import { RevealItem, RevealStagger } from '@/components/landing/saas/Reveal';
import { SectionHeader } from '@/components/landing/saas/SectionHeader';

const METRICS = [
  { value: '68%', label: 'Verified listing share', sub: 'Quality-weighted marketplace supply' },
  { value: '11.4d', label: 'Median time-to-IOI', sub: 'Counterparty velocity' },
  { value: '5', label: 'Integrated products', sub: 'Single platform architecture' },
  { value: '24/7', label: 'Desk-native terminal', sub: 'Scenarios refresh on edit' },
] as const;

export function LandingSocialProof() {
  return (
    <section className="luxury-section-gap saas-section-shell border-t border-[color:var(--terminal-border)]/60">
      <SectionHeader
        index="01"
        label="Proof"
        title={
          <>
            Traction that reads like a <span className="platform-gradient-text">private desk</span>
          </>
        }
        description="Signals we surface in product — not vanity counters. Built for founders, acquirers, and operators who need defensible numbers."
      />
      <RevealStagger className="mt-14 grid gap-px overflow-hidden rounded-[10px] border border-[color:var(--terminal-border)]/70 bg-[color:var(--terminal-border)]/40 sm:grid-cols-2 lg:grid-cols-4">
        {METRICS.map((m) => (
          <RevealItem key={m.label}>
            <div className="luxury-panel h-full px-6 py-8 sm:px-7">
              <p className="font-mono text-3xl font-light tabular-nums tracking-tight platform-gradient-text lg:text-4xl">
                {m.value}
              </p>
              <p className="mt-4 text-sm font-bold text-[color:var(--terminal-fg)]">{m.label}</p>
              <p className="mt-2 text-xs leading-relaxed text-[color:var(--terminal-muted)]">{m.sub}</p>
            </div>
          </RevealItem>
        ))}
      </RevealStagger>
    </section>
  );
}
