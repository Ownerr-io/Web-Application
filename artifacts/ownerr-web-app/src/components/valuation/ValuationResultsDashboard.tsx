import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { StrategicInsightCard, ValuationInputs, ValuationOutputs } from '@/lib/valuationIntel';
import { formatEnterpriseValuation } from '@/lib/utils';
import { useAnimatedNumber } from './useAnimatedNumber';
import { StrategicInsights } from '@/components/landing/StrategicInsights';
import { ValuationGauge } from './ValuationGauge';
import { ValuationCaptureSummary } from './ValuationCaptureSummary';
import { ValuationExportActions } from './ValuationExportActions';
import { buildInvestorNarrative } from '@/lib/valuationExport';
import type { OnboardingMeta } from './types';

type Props = {
  inputs: ValuationInputs;
  outputs: ValuationOutputs;
  insights: StrategicInsightCard[];
  startupName?: string;
  meta: OnboardingMeta;
};

function valuationBand(mid: number, confidencePct: number): { low: number; high: number } {
  const spread = 0.08 + (100 - confidencePct) / 1000;
  return { low: mid * (1 - spread), high: mid * (1 + spread) };
}

export function ValuationResultsDashboard({ inputs, outputs, insights, startupName, meta }: Props) {
  const reduce = useReducedMotion();
  const band = useMemo(
    () => valuationBand(outputs.estimatedValuation, outputs.confidencePct),
    [outputs.estimatedValuation, outputs.confidencePct],
  );
  const animatedMid = useAnimatedNumber(outputs.estimatedValuation, 1000, !reduce);

  const narrative = useMemo(() => buildInvestorNarrative(inputs, outputs), [inputs, outputs]);

  const efficiencyLabel = useMemo(() => {
    return inputs.burnMultiple > 0 ? `${inputs.burnMultiple.toFixed(1)}× burn multiple` : '—';
  }, [inputs.burnMultiple]);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="valuation-executive-report mx-auto max-w-[1200px] space-y-12 px-4 py-8 sm:space-y-14 sm:py-10"
    >
      <header className="relative border-b border-white/10 pb-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 flex-1 space-y-2.5">
            <p className="report-kicker">Venture synthesis appraisal</p>
            <h1 className="report-title text-balance">
              {startupName ? `${startupName} · ` : ''}Executive report
            </h1>
            <p className="report-lead max-w-2xl">
              Desk model output for institutional M&amp;A planning. Metrics are indexed against venture comparables and
              your operating profile.
            </p>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-3 border-t border-white/10 pt-5 sm:w-auto sm:max-w-[min(100%,20rem)] sm:items-stretch sm:border-0 sm:pt-0">
            <p className="report-status text-left sm:text-right">Final · synthesized</p>
            <div className="hidden sm:block">
              <ValuationExportActions
                inputs={inputs}
                outputs={outputs}
                insights={insights}
                meta={meta}
                startupName={startupName}
                className="w-full sm:w-auto"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Primary Enterprise Value Section - Completely Cardless */}
      <motion.article
        className="relative grid w-full gap-10 border-b border-white/10 pb-12 md:grid-cols-[1fr_auto] md:items-center"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
      >
        <div className="min-w-0 flex-1 space-y-6">
          <p className="report-kicker">Implied enterprise value range</p>
          {outputs.estimatedValuation <= 0 ? (
            <p className="text-base leading-relaxed text-[color:var(--terminal-muted)]">
              No implied range yet — add{' '}
              <span className="font-bold text-white">MRR or ARR</span> in the
              questionnaire so the model can anchor on revenue.
            </p>
          ) : (
            <p className="report-hero-amount" aria-live="polite">
              {formatEnterpriseValuation(band.low)} – {formatEnterpriseValuation(band.high)}
            </p>
          )}
          <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-3 pt-1">
            <span className="report-midpoint-label">Midpoint anchor valuation</span>
            <span className="report-midpoint-value tabular-nums">
              {formatEnterpriseValuation(animatedMid)}
            </span>
          </div>
        </div>

        {/* Model Confidence Meter (Transparent, borderless) */}
        <div className="flex justify-center shrink-0">
          <ValuationGauge
            value={outputs.confidencePct}
            label="Model Confidence"
            size={220}
          />
        </div>
      </motion.article>

      {/* Row 1: Core Value Drivers (Transparent dials side-by-side with vertical hairline separators) */}
      <section className="space-y-6 border-b border-white/10 pb-10">
        <h2 className="report-section-title">Core valuation drivers</h2>
        <motion.div
          className="grid gap-8 sm:grid-cols-3 w-full"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.12 }}
        >
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-col items-center justify-center text-center sm:border-r sm:border-white/10 sm:px-4 w-full"
          >
            <ValuationGauge
              value={outputs.acquisitionHeat}
              label="Acquisition Appetite"
              subtitle="Corporate M&A heat index"
              size={230}
            />
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center justify-center text-center sm:border-r sm:border-white/10 sm:px-4 w-full"
          >
            <ValuationGauge
              value={outputs.investorInterest}
              label="Investor Demand"
              subtitle="Equity backing likelihood"
              size={230}
            />
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex flex-col items-center justify-center text-center sm:px-4 w-full"
          >
            <ValuationGauge
              value={outputs.growthQuality}
              label="Growth Integrity"
              subtitle="Revenue quality multiple"
              size={230}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* Row 2: Capital Efficiency and Market Timing (Cardless, divided side-by-side) */}
      <motion.div
        className="grid gap-8 sm:grid-cols-2 border-b border-white/10 pb-10"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <motion.div
          className="flex flex-col justify-between sm:border-r sm:border-white/10 sm:pr-8"
          initial={reduce ? false : { opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.32 }}
        >
          <div>
            <span className="report-section-title">Market timing index</span>
            <h4 className="mt-3.5 font-mono text-3xl font-black text-white">
              {outputs.marketTiming}
            </h4>
          </div>
          <p className="mt-4 text-sm text-[color:var(--terminal-muted)] leading-relaxed font-medium">
            Strategic liquidity events and private equity transaction volume currently shape this timing corridor.
          </p>
        </motion.div>

        <motion.div
          className="flex flex-col justify-between pt-6 sm:pt-0 sm:pl-6"
          initial={reduce ? false : { opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.36 }}
        >
          <div>
            <span className="report-section-title">Capital efficiency anchor</span>
            <h4 className="mt-3.5 font-mono text-3xl font-black text-white">
              {efficiencyLabel}
            </h4>
          </div>
          <p className="mt-4 text-sm text-[color:var(--terminal-muted)] leading-relaxed font-medium">
            Appraises Net ARR returns relative to operating capital burn rate, scaling baseline exit multiples.
          </p>
        </motion.div>
      </motion.div>

      {/* Row 3: Strategic M&A Narrative Lines (Cardless borderless bullet list) */}
      <section className="space-y-5 border-b border-white/10 pb-10">
        <h2 className="report-section-title">Strategic deal narrative</h2>
        <ul className="space-y-4">
          {narrative.map((line, i) => (
            <motion.li
              key={line}
              initial={reduce ? false : { opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.06 }}
              className="px-0 py-2.5 text-sm font-semibold leading-relaxed text-[color:var(--terminal-muted)] flex items-start gap-3.5 bg-transparent border-0 shadow-none"
            >
              <span className="text-[color:var(--terminal-lime)] shrink-0 font-extrabold font-mono select-none">&gt;&gt;</span>
              <span className="text-white/80">{line}</span>
            </motion.li>
          ))}
        </ul>
      </section>

      {/* Row 4: Verified Data Submission Matrix (Brings the audit matrix cleanly to bottom hierarchy) */}
      <section className="border-b border-white/10 pb-10">
        <ValuationCaptureSummary inputs={inputs} meta={meta} />
      </section>

      {/* Row 5: Deep Insights Section */}
      <section className="space-y-6 pt-2">
        <h2 className="report-section-title text-base tracking-[0.12em] sm:text-lg">
          Deep portfolio intelligence
        </h2>
        <div className="border-t border-white/10 pt-6">
          <StrategicInsights insights={insights} />
        </div>
      </section>
    </motion.div>
  );
}
