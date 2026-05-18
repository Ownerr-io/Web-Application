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
      className="border-0 bg-transparent p-0 shadow-none space-y-6"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="border-b border-white/10 pb-4">
        <h3 className="text-xs font-black uppercase tracking-[0.25em] text-[#EBFBBC]">
          VERIFIED DATA SUBMISSION MATRIX
        </h3>
        <p className="mt-1.5 text-sm font-medium text-[color:var(--terminal-muted)]">
          Audit ledger of corporate and financial inputs provided during questionnaire synthesis.
        </p>
      </div>

      <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 md:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="border-b border-white/[0.04] pb-4 flex flex-col justify-between"
          >
            <dt className="text-[10px] font-black uppercase tracking-widest text-[color:var(--terminal-muted)] line-clamp-1">
              {row.label}
            </dt>
            <dd className="mt-2 font-mono text-lg font-bold text-white leading-none">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </motion.section>
  );
}
