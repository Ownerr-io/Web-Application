import { motion, useReducedMotion } from 'framer-motion';
import type { ValuationInputs } from '@/lib/valuationIntel';
import { formatShortCurrency } from '@/lib/utils';
import type { OnboardingMeta } from './types';
import { VALUATION_QUESTIONS, getQuestionValue } from './valuationQuestions';

type Props = {
  inputs: ValuationInputs;
  meta: OnboardingMeta;
};

export function ValuationCaptureSummary({ inputs, meta }: Props) {
  const reduce = useReducedMotion();
  const rows = VALUATION_QUESTIONS.map((q) => {
    const v = getQuestionValue(q, inputs, meta).trim();
    if (!v && q.optional) return null;
    let display = v;
    if (q.id === 'mrr' || q.id === 'arr' || q.id === 'cac' || q.id === 'ltv') {
      const n = Number(v.replace(/,/g, ''));
      if (Number.isFinite(n) && n > 0) display = formatShortCurrency(n);
    }
    if (q.id === 'monthlyGrowthPct' || q.id === 'churnPctMonthly') display = v ? `${v}%` : '—';
    return { label: q.prompt.replace(/\?$/, ''), value: display || '—' };
  }).filter(Boolean) as { label: string; value: string }[];

  return (
    <motion.section
      className="rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)] p-5 sm:p-6"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-[color:var(--terminal-muted)]">
        Your submission
      </h3>
      <p className="mt-1 text-xs text-[color:var(--terminal-muted)]">Everything you shared in the guided flow</p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="rounded-[8px] border border-[color:var(--terminal-border)]/80 bg-[color:var(--terminal-bg)] px-3 py-2.5">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-muted)] line-clamp-2">
              {row.label}
            </dt>
            <dd className="mt-1 font-mono text-sm font-semibold text-[color:var(--terminal-fg)]">{row.value}</dd>
          </div>
        ))}
      </dl>
    </motion.section>
  );
}
