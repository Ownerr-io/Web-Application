import { motion, useReducedMotion } from 'framer-motion';

const STEPS = [
  {
    n: '01',
    title: 'Run valuation',
    body: 'Load operating metrics and strategic intent — scenario engine returns range, confidence, and timing.',
  },
  {
    n: '02',
    title: 'Generate strategic intelligence',
    body: 'Surface acquisition heat, investor flow, and risk concentration versus rolling comparables.',
  },
  {
    n: '03',
    title: 'Enter acquisition marketplace',
    body: 'Cross from intelligence to verified listings, bids, and structured workflows without re-onboarding.',
  },
  {
    n: '04',
    title: 'Connect with investors and acquirers',
    body: 'Route to inbox, diligence rooms, and counterparty matching with audit-friendly history.',
  },
] as const;

export function AcquisitionFlow() {
  const reduce = useReducedMotion();
  return (
    <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((s, idx) => (
        <motion.div
          key={s.n}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-30px' }}
          transition={{ duration: 0.3, delay: reduce ? 0 : idx * 0.06 }}
          className="saas-glass-card saas-glass-card-hover flex h-full min-h-[11.5rem] flex-col rounded-[12px] border border-[color:var(--terminal-border)]/80 p-5 sm:min-h-[12.5rem]"
        >
          <div className="mb-3 shrink-0 text-[10px] font-bold uppercase tracking-[0.24em] text-[color:var(--terminal-muted)]">
            {s.n}
          </div>
          <h3 className="shrink-0 text-base font-bold text-[color:var(--terminal-fg)]">{s.title}</h3>
          <p className="mt-2 flex-1 text-xs leading-relaxed text-[color:var(--terminal-muted)]">{s.body}</p>
        </motion.div>
      ))}
    </div>
  );
}
