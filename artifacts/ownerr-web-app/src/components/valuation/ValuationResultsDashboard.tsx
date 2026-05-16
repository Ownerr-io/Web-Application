import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { StrategicInsightCard, ValuationInputs, ValuationOutputs } from '@/lib/valuationIntel';
import { formatShortCurrency, cn } from '@/lib/utils';
import { useAnimatedNumber } from './useAnimatedNumber';
import { StrategicInsights } from '@/components/landing/StrategicInsights';

type Props = {
  inputs: ValuationInputs;
  outputs: ValuationOutputs;
  insights: StrategicInsightCard[];
  startupName?: string;
};

function valuationBand(mid: number, confidencePct: number): { low: number; high: number } {
  const spread = 0.08 + (100 - confidencePct) / 1000;
  return { low: mid * (1 - spread), high: mid * (1 + spread) };
}

export function ValuationResultsDashboard({ inputs, outputs, insights, startupName }: Props) {
  const reduce = useReducedMotion();
  const band = useMemo(
    () => valuationBand(outputs.estimatedValuation, outputs.confidencePct),
    [outputs.estimatedValuation, outputs.confidencePct],
  );
  const animatedMid = useAnimatedNumber(outputs.estimatedValuation, 1000, !reduce);

  const metricCards = useMemo(
    () => [
      { label: 'Acquisition heat', value: `${outputs.acquisitionHeat}/100`, accent: false },
      { label: 'Investor interest', value: `${outputs.investorInterest}/100`, accent: false },
      { label: 'Market timing', value: outputs.marketTiming, accent: false, wide: true },
      {
        label: 'Capital efficiency',
        value: inputs.burnMultiple > 0 ? `${inputs.burnMultiple.toFixed(1)}× burn` : '—',
        accent: false,
      },
      { label: 'Growth quality', value: `${outputs.growthQuality}/100`, accent: false },
    ],
    [inputs.burnMultiple, outputs],
  );

  const narrative = useMemo(() => buildInvestorNarrative(inputs, outputs), [inputs, outputs]);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-[1200px] space-y-6 px-4 py-8 sm:space-y-8 sm:py-14"
    >
      <header className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--terminal-muted)]">
          Intelligence report
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-[color:var(--terminal-fg)] sm:text-3xl">
          {startupName ? `${startupName} · ` : ''}Valuation synthesis
        </h2>
        <p className="max-w-2xl text-sm text-[color:var(--terminal-muted)]">
          Desk model output for planning — not a fairness opinion. Pair with verified artifacts before outreach.
        </p>
      </header>

      <motion.article
        className="relative overflow-hidden rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)] p-4 shadow-sm sm:p-8"
        initial={reduce ? false : { opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05, duration: 0.4 }}
      >
        <motion.div
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl"
          style={{ background: 'color-mix(in srgb, var(--terminal-ochre) 14%, transparent)' }}
          animate={reduce ? undefined : { opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
        <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <motion.div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-muted)]">
              Implied enterprise range
            </p>
            {outputs.estimatedValuation <= 0 ? (
              <p className="mt-2 text-sm leading-relaxed text-[color:var(--terminal-muted)]">
                No implied range yet — add{' '}
                <span className="font-semibold text-[color:var(--terminal-fg)]">MRR or ARR</span> in the
                questionnaire so the model can anchor on revenue.
              </p>
            ) : (
              <p className="mt-2 break-words font-mono text-2xl font-bold tabular-nums text-[color:var(--terminal-ochre)] sm:text-4xl">
                {formatShortCurrency(band.low)} – {formatShortCurrency(band.high)}
              </p>
            )}
            <p className="mt-2 text-xs text-[color:var(--terminal-muted)]">
              Midpoint anchor{' '}
              <span className="font-mono font-bold text-[color:var(--terminal-fg)]">
                {formatShortCurrency(animatedMid)}
              </span>
            </p>
          </motion.div>
          <div className="rounded-[8px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-bg)] px-4 py-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-muted)]">
              Model confidence
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[color:var(--terminal-lime)]">
              {outputs.confidencePct}%
            </p>
          </div>
        </div>
        <p className="relative mt-4 border-t border-[color:var(--terminal-border)] pt-4 text-xs leading-relaxed text-[color:var(--terminal-muted)]">
          <span className="font-bold text-[color:var(--terminal-ochre)]">Strategic read · </span>
          {outputs.strategicRecommendation}
        </p>
      </motion.article>

      <motion.div
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.12 }}
      >
        {metricCards.map((card, idx) => (
          <motion.div
            key={card.label}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + idx * 0.05 }}
            className={cn(
              'rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-bg)] px-4 py-3 hover-elevate',
              card.wide && 'sm:col-span-2 lg:col-span-1',
            )}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-muted)]">
              {card.label}
            </p>
            <p className="mt-1 font-mono text-sm font-bold text-[color:var(--terminal-fg)]">{card.value}</p>
          </motion.div>
        ))}
      </motion.div>

      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-[color:var(--terminal-muted)]">
          Dynamic strategic insights
        </h3>
        <ul className="space-y-2">
          {narrative.map((line, i) => (
            <motion.li
              key={line}
              initial={reduce ? false : { opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.06 }}
              className="rounded-[8px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)] px-4 py-3 text-sm leading-relaxed text-[color:var(--terminal-muted)]"
            >
              {line}
            </motion.li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-bold text-[color:var(--terminal-fg)]">Deep intelligence cards</h3>
        <StrategicInsights insights={insights} />
      </section>
    </motion.div>
  );
}

function buildInvestorNarrative(inputs: ValuationInputs, o: ValuationOutputs): string[] {
  const lines: string[] = [];
  if (inputs.cac > 0 && inputs.ltv > 0 && inputs.ltv / inputs.cac >= 3) {
    lines.push('Low churn and strong LTV/CAC improve strategic acquisition attractiveness.');
  }
  if (inputs.monthlyGrowthPct > 4 && inputs.burnMultiple <= 2) {
    lines.push('Revenue growth materially outpaces burn expansion.');
  }
  if (o.investorInterest >= 65) {
    lines.push('Investor formation scores suggest room for a priced round if data room quality is high.');
  }
  if (o.acquisitionHeat > o.investorInterest + 8) {
    lines.push('Corporate development heat exceeds incremental venture demand — exit sequencing may dominate.');
  }
  if (inputs.churnPctMonthly > 5) {
    lines.push('Elevated churn compresses multiple expansion — stabilize NRR before optimizing for step-ups.');
  }
  if (lines.length === 0) {
    lines.push(o.strategicRecommendation);
  }
  return lines.slice(0, 4);
}
