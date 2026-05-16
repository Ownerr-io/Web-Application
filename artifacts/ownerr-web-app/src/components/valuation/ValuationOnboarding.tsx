import { useCallback, useMemo, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ValuationInputs } from '@/lib/valuationIntel';
import { cn } from '@/lib/utils';
import { CircularProgressTracker } from './CircularProgressTracker';
import { LivePreviewChips } from './LivePreviewChips';
import { buildPreviewChips } from './previewInsights';
import {
  ONBOARDING_STEP_COUNT,
  STEP_HELPER,
  STEP_PROGRESS,
  type OnboardingMeta,
  type StepFieldErrors,
  isValidEmail,
} from './types';

const INDUSTRIES = ['SaaS', 'AI', 'Fintech', 'Consumer', 'DevTools', 'Healthcare', 'Other'] as const;
const STAGES = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Growth'] as const;
const GEO = ['United States', 'Europe', 'UK', 'Asia', 'LATAM', 'Global remote'] as const;
const MARKETS = ['B2B SaaS', 'B2C', 'Marketplace', 'Infrastructure', 'Vertical SaaS', 'Other'] as const;

const STEP_TITLES = [
  'Startup basics',
  'Revenue signals',
  'Efficiency metrics',
  'Team + market',
  'Almost there',
];

function num(v: string, fallback: number): number {
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

type Props = {
  step: number;
  inputs: ValuationInputs;
  meta: OnboardingMeta;
  errors: StepFieldErrors;
  onStepChange: (next: number) => void;
  onInputsChange: (next: ValuationInputs) => void;
  onMetaChange: (next: OnboardingMeta) => void;
  onValidateStep: (step: number) => StepFieldErrors;
  onComplete: () => void;
};

export function ValuationOnboarding({
  step,
  inputs,
  meta,
  errors,
  onStepChange,
  onInputsChange,
  onMetaChange,
  onValidateStep,
  onComplete,
}: Props) {
  const reduce = useReducedMotion();
  const chips = useMemo(() => buildPreviewChips(inputs), [inputs]);
  const progress = STEP_PROGRESS[step] ?? 12;
  const helper = STEP_HELPER[step] ?? STEP_HELPER[0];

  const patchInputs = useCallback(
    (fn: (prev: ValuationInputs) => ValuationInputs) => onInputsChange(fn(inputs)),
    [inputs, onInputsChange],
  );

  const patchMeta = useCallback(
    (fn: (prev: OnboardingMeta) => OnboardingMeta) => onMetaChange(fn(meta)),
    [meta, onMetaChange],
  );

  const goNext = () => {
    const err = onValidateStep(step);
    if (Object.keys(err).length > 0) return;
    if (step >= ONBOARDING_STEP_COUNT - 1) {
      onComplete();
      return;
    }
    onStepChange(step + 1);
  };

  const goBack = () => onStepChange(Math.max(0, step - 1));

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative mx-auto max-w-[1200px] px-4 py-8 sm:py-10"
    >
      <motion.div
        className="mb-6 lg:hidden"
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <CircularProgressTracker percent={progress} helperText={helper} compact />
      </motion.div>

      <motion.div
        className="mb-4 space-y-3"
        role="progressbar"
        aria-valuenow={step + 1}
        aria-valuemin={1}
        aria-valuemax={ONBOARDING_STEP_COUNT}
      >
        <motion.div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--terminal-muted)]">
            Step {step + 1} of {ONBOARDING_STEP_COUNT}
          </p>
          <p className="text-xs font-semibold text-[color:var(--terminal-fg)]">{STEP_TITLES[step]}</p>
        </motion.div>
        <motion.div className="flex gap-1.5" aria-hidden>
          {Array.from({ length: ONBOARDING_STEP_COUNT }, (_, i) => (
            <motion.span
              key={i}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                i <= step ? 'bg-[color:var(--terminal-ochre)]' : 'bg-[color:var(--terminal-border)]',
              )}
            />
          ))}
        </motion.div>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px] xl:grid-cols-[minmax(0,1fr)_240px]">
        <motion.div
          layout
          className="min-w-0 rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)] shadow-sm"
        >
          <motion.div layout className="border-b border-[color:var(--terminal-border)] px-5 py-4 sm:px-6">
            <h2 className="text-lg font-bold text-[color:var(--terminal-fg)]">{STEP_TITLES[step]}</h2>
            <p className="mt-1 text-xs text-[color:var(--terminal-muted)]">
              {step === 0 && 'Tell us about your company so we can anchor sector benchmarks.'}
              {step === 1 && 'Revenue quality drives most of the valuation band.'}
              {step === 2 && 'Unit economics and burn shape investor and acquirer appetite.'}
              {step === 3 && 'Scale and geography refine comparable transactions.'}
              {step === 4 && 'We’ll deliver your intelligence report — details stay private.'}
            </p>
          </motion.div>

          <form
            className="p-5 sm:p-6"
            onSubmit={(e) => {
              e.preventDefault();
              goNext();
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={reduce ? false : { opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? undefined : { opacity: 0, x: -12 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-4"
              >
                {step === 0 && (
                  <>
                    <Field label="Startup name" error={errors.startupName}>
                      <Input
                        placeholder="Acme Inc."
                        value={meta.startupName}
                        onChange={(e) => patchMeta((s) => ({ ...s, startupName: e.target.value }))}
                        className="text-sm"
                        aria-invalid={Boolean(errors.startupName)}
                      />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Industry" error={errors.industry}>
                        <Select
                          value={inputs.industry}
                          onValueChange={(v) => patchInputs((s) => ({ ...s, industry: v }))}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                          <SelectContent>
                            {INDUSTRIES.map((ind) => (
                              <SelectItem key={ind} value={ind} className="text-sm">
                                {ind}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Funding stage" error={errors.stage}>
                        <Select
                          value={inputs.stage}
                          onValueChange={(v) => patchInputs((s) => ({ ...s, stage: v }))}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                          <SelectContent>
                            {STAGES.map((st) => (
                              <SelectItem key={st} value={st} className="text-sm">
                                {st}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                    <Field label="Founding year" error={errors.foundingYear}>
                      <Input
                        inputMode="numeric"
                        placeholder="e.g. 2021"
                        value={meta.foundingYear}
                        onChange={(e) => patchMeta((s) => ({ ...s, foundingYear: e.target.value }))}
                        className="font-mono text-sm"
                      />
                    </Field>
                  </>
                )}

                {step === 1 && (
                  <motion.div className="grid gap-4 sm:grid-cols-2">
                    <Field label="ARR ($)" hint="Leave blank to derive from MRR">
                      <Input
                        inputMode="decimal"
                        placeholder="0"
                        className="font-mono text-sm"
                        value={inputs.arr || ''}
                        onChange={(e) => patchInputs((s) => ({ ...s, arr: num(e.target.value, 0) }))}
                      />
                    </Field>
                    <Field label="MRR ($)" error={errors.revenue}>
                      <Input
                        inputMode="decimal"
                        className="font-mono text-sm"
                        value={inputs.mrr || ''}
                        onChange={(e) => patchInputs((s) => ({ ...s, mrr: num(e.target.value, s.mrr) }))}
                        aria-invalid={Boolean(errors.revenue)}
                      />
                    </Field>
                    <Field label="Monthly growth %" className="sm:col-span-2">
                      <Input
                        inputMode="decimal"
                        className="font-mono text-sm"
                        value={inputs.monthlyGrowthPct}
                        onChange={(e) =>
                          patchInputs((s) => ({ ...s, monthlyGrowthPct: num(e.target.value, s.monthlyGrowthPct) }))
                        }
                      />
                    </Field>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div className="grid gap-4 sm:grid-cols-2">
                    <Field label="CAC ($)">
                      <Input
                        inputMode="decimal"
                        className="font-mono text-sm"
                        value={inputs.cac || ''}
                        onChange={(e) => patchInputs((s) => ({ ...s, cac: num(e.target.value, s.cac) }))}
                      />
                    </Field>
                    <Field label="LTV ($)">
                      <Input
                        inputMode="decimal"
                        className="font-mono text-sm"
                        value={inputs.ltv || ''}
                        onChange={(e) => patchInputs((s) => ({ ...s, ltv: num(e.target.value, s.ltv) }))}
                      />
                    </Field>
                    <Field label="Churn % (monthly)">
                      <Input
                        inputMode="decimal"
                        className="font-mono text-sm"
                        value={inputs.churnPctMonthly}
                        onChange={(e) =>
                          patchInputs((s) => ({ ...s, churnPctMonthly: num(e.target.value, s.churnPctMonthly) }))
                        }
                      />
                    </Field>
                    <Field label="Burn multiple">
                      <Input
                        inputMode="decimal"
                        className="font-mono text-sm"
                        value={inputs.burnMultiple}
                        onChange={(e) =>
                          patchInputs((s) => ({ ...s, burnMultiple: num(e.target.value, s.burnMultiple) }))
                        }
                      />
                    </Field>
                  </motion.div>
                )}

                {step === 3 && (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Team size" error={errors.teamSize}>
                        <Input
                          inputMode="numeric"
                          placeholder="e.g. 24"
                          value={meta.teamSize}
                          onChange={(e) => patchMeta((s) => ({ ...s, teamSize: e.target.value }))}
                          className="font-mono text-sm"
                        />
                      </Field>
                      <Field label="Customer count">
                        <Input
                          inputMode="numeric"
                          placeholder="Optional"
                          value={meta.customerCount}
                          onChange={(e) => patchMeta((s) => ({ ...s, customerCount: e.target.value }))}
                          className="font-mono text-sm"
                        />
                      </Field>
                    </div>
                    <Field label="Geography" error={errors.geography}>
                      <Select
                        value={inputs.geography}
                        onValueChange={(v) => patchInputs((s) => ({ ...s, geography: v }))}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                        <SelectContent>
                          {GEO.map((g) => (
                            <SelectItem key={g} value={g} className="text-sm">
                              {g}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Market category">
                      <Select
                        value={meta.marketCategory || MARKETS[0]}
                        onValueChange={(v) => patchMeta((s) => ({ ...s, marketCategory: v }))}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MARKETS.map((m) => (
                            <SelectItem key={m} value={m} className="text-sm">
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </>
                )}

                {step === 4 && (
                  <>
                    <Field label="Founder name" error={errors.founderName}>
                      <Input
                        value={meta.founderName}
                        onChange={(e) => patchMeta((s) => ({ ...s, founderName: e.target.value }))}
                        className="text-sm"
                      />
                    </Field>
                    <Field label="Work email" error={errors.workEmail}>
                      <Input
                        type="email"
                        autoComplete="email"
                        value={meta.workEmail}
                        onChange={(e) => patchMeta((s) => ({ ...s, workEmail: e.target.value }))}
                        className="text-sm"
                      />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Company website">
                        <Input
                          type="url"
                          placeholder="https://"
                          value={meta.companyWebsite}
                          onChange={(e) => patchMeta((s) => ({ ...s, companyWebsite: e.target.value }))}
                          className="text-sm"
                        />
                      </Field>
                      <Field label="LinkedIn">
                        <Input
                          placeholder="linkedin.com/in/…"
                          value={meta.linkedIn}
                          onChange={(e) => patchMeta((s) => ({ ...s, linkedIn: e.target.value }))}
                          className="text-sm"
                        />
                      </Field>
                    </div>
                    <Field label="Phone (optional)">
                      <Input
                        type="tel"
                        value={meta.phone}
                        onChange={(e) => patchMeta((s) => ({ ...s, phone: e.target.value }))}
                        className="text-sm"
                      />
                    </Field>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[color:var(--terminal-border)] pt-5">
              {step > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={goBack}
                  className="h-11 rounded-[10px] border-[color:var(--terminal-border)] bg-transparent font-bold"
                >
                  Back
                </Button>
              ) : (
                <span />
              )}
              <Button
                type="submit"
                className="ml-auto h-11 rounded-[10px] border-0 bg-[color:var(--terminal-ochre)] px-6 font-bold text-[#0b0b0c] hover:bg-[color:var(--terminal-ochre-hover)]"
              >
                {step === ONBOARDING_STEP_COUNT - 1 ? 'Generate intelligence' : 'Continue'}
              </Button>
            </div>
            <p className="mt-2 text-right text-[10px] text-[color:var(--terminal-muted)]">Press Enter to continue</p>
          </form>
        </motion.div>

        <aside className="hidden space-y-4 lg:block">
          <div className="sticky top-24 space-y-4">
            <CircularProgressTracker percent={progress} helperText={helper} />
            <div className="rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-bg)]/60 p-4 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-muted)]">
                Live preview
              </p>
              <p className="mt-1 mb-3 text-[11px] leading-snug text-[color:var(--terminal-muted)]">
                Signals update as you type — final valuation unlocks after analysis.
              </p>
              <LivePreviewChips chips={chips} />
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-4 lg:hidden">
        <LivePreviewChips chips={chips} />
      </div>
    </motion.div>
  );
}

export function validateOnboardingStep(
  step: number,
  inputs: ValuationInputs,
  meta: OnboardingMeta,
): StepFieldErrors {
  const err: StepFieldErrors = {};
  if (step === 0) {
    if (!meta.startupName.trim()) err.startupName = 'Enter your startup name';
    if (!inputs.industry) err.industry = 'Select an industry';
    if (!inputs.stage) err.stage = 'Select a funding stage';
    const y = Number(meta.foundingYear);
    if (!meta.foundingYear.trim() || !Number.isFinite(y) || y < 1990 || y > new Date().getFullYear()) {
      err.foundingYear = 'Enter a valid founding year';
    }
  }
  if (step === 1) {
    const hasArr = inputs.arr > 0;
    const hasMrr = inputs.mrr > 0;
    if (!hasArr && !hasMrr) err.revenue = 'Enter ARR or MRR';
  }
  if (step === 3) {
    if (!meta.teamSize.trim() || Number(meta.teamSize) < 1) err.teamSize = 'Enter team size';
    if (!inputs.geography) err.geography = 'Select geography';
  }
  if (step === 4) {
    if (!meta.founderName.trim()) err.founderName = 'Enter your name';
    if (!isValidEmail(meta.workEmail)) err.workEmail = 'Enter a valid work email';
  }
  return err;
}

function Field({
  label,
  children,
  error,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  error?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <motion.div className={cn('space-y-1.5', className)} layout="position">
      <Label className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-muted)]">
        {label}
      </Label>
      {children}
      {hint && !error ? <p className="text-[11px] text-[color:var(--terminal-muted)]">{hint}</p> : null}
      {error ? <p className="text-[11px] font-medium text-[color:var(--terminal-ochre)]">{error}</p> : null}
    </motion.div>
  );
}
