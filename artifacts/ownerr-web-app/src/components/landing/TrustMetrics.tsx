import { motion, useReducedMotion } from 'framer-motion';

const ROWS = [
  {
    label: 'Revenue verification',
    score: 92,
    detail: 'Provider-linked MRR / ARR reconciliation',
  },
  {
    label: 'Traffic verification',
    score: 78,
    detail: 'First-party analytics + cohort stability',
  },
  {
    label: 'Domain verification',
    score: 88,
    detail: 'DNS + mailbox control attestations',
  },
  {
    label: 'Trust labels',
    score: 85,
    detail: 'Issuer-backed badges surfaced on listings',
  },
  {
    label: 'Readiness score',
    score: 74,
    detail: 'Data room depth vs. category closing benchmarks',
  },
] as const;

export function TrustMetrics() {
  const reduce = useReducedMotion();
  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_minmax(0,0.9fr)] lg:items-start">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[color:var(--terminal-muted)]">Trust + verification</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-[color:var(--terminal-fg)] sm:text-3xl">Evidence-first listings</h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[color:var(--terminal-muted)]">
          Verification gates reduce adverse selection. Signals compound into a readiness curve founders can improve
          before going live — buyers see the same progression in diligence view.
        </p>
      </div>
      <div className="space-y-3 rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)] p-4">
        {ROWS.map((r, i) => (
          <div key={r.label} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs font-bold text-[color:var(--terminal-fg)]">
              <span>{r.label}</span>
              <span className="tabular-nums text-[color:var(--terminal-ochre)]">{r.score}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--terminal-bg)]">
              <motion.div
                className="h-full rounded-full bg-[color:var(--terminal-lime)]"
                initial={reduce ? false : { width: 0 }}
                whileInView={{ width: `${r.score}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: reduce ? 0 : i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <p className="text-[11px] text-[color:var(--terminal-muted)]">{r.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
