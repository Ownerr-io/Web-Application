import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
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
import { LivePreviewChips } from './LivePreviewChips';
import { buildPreviewChips } from './previewInsights';
import { ValuationFullViewport } from './ValuationFullViewport';
import type { OnboardingMeta } from './types';
import {
  VALUATION_QUESTIONS,
  getQuestionValue,
  questionProgress,
  setQuestionValue,
  validateQuestion,
  type ValuationQuestion,
} from './valuationQuestions';

const ease = [0.22, 1, 0.36, 1] as const;

type Props = {
  questionIndex: number;
  inputs: ValuationInputs;
  meta: OnboardingMeta;
  onInputsChange: (v: ValuationInputs) => void;
  onMetaChange: (v: OnboardingMeta) => void;
  onQuestionIndexChange: (i: number) => void;
  onComplete: () => void;
};

export function ValuationClaudeFlow({
  questionIndex,
  inputs,
  meta,
  onInputsChange,
  onMetaChange,
  onQuestionIndexChange,
  onComplete,
}: Props) {
  const reduce = useReducedMotion();
  const [error, setError] = useState<string | undefined>();
  const q = VALUATION_QUESTIONS[questionIndex];
  const chips = useMemo(() => buildPreviewChips(inputs), [inputs]);
  const progress = questionProgress(questionIndex);
  const value = q ? getQuestionValue(q, inputs, meta) : '';

  const patchValue = useCallback(
    (raw: string) => {
      if (!q) return;
      const next = setQuestionValue(q, raw, inputs, meta);
      onInputsChange(next.inputs);
      onMetaChange(next.meta);
      setError(undefined);
    },
    [q, inputs, meta, onInputsChange, onMetaChange],
  );

  const goNext = (skip = false) => {
    if (!q) return;
    if (!skip) {
      const err = validateQuestion(q, inputs, meta);
      if (err) {
        setError(err);
        return;
      }
    }
    if (questionIndex >= VALUATION_QUESTIONS.length - 1) {
      onComplete();
      return;
    }
    onQuestionIndexChange(questionIndex + 1);
    setError(undefined);
  };

  const goBack = () => {
    onQuestionIndexChange(Math.max(0, questionIndex - 1));
    setError(undefined);
  };

  if (!q) return null;

  return (
    <ValuationFullViewport center={false} className="grid grid-rows-[auto_1fr_auto]">
      <div className="relative z-20 shrink-0 px-4 pt-3 sm:px-10 sm:pt-6">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--terminal-muted)] sm:tracking-[0.22em]">
          <span className="shrink-0">
            {questionIndex + 1} / {VALUATION_QUESTIONS.length}
          </span>
          <span className="tabular-nums">{progress}%</span>
        </div>
        <motion.div className="mx-auto mt-2 h-px max-w-xl bg-[color:var(--terminal-border)]/70 sm:mt-3">
          <motion.div
            className="h-px bg-[color:var(--terminal-ochre)] transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </motion.div>
      </div>

      <div className="relative z-20 flex min-h-0 items-center justify-center overflow-y-auto overscroll-y-contain px-4 py-6 sm:px-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            className="relative mx-auto w-full max-w-xl"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.32, ease }}
          >
            <form
              id="valuation-step-form"
              className="w-full scroll-mt-24"
              onSubmit={(e) => {
                e.preventDefault();
                goNext(false);
              }}
            >
              <h2 className="text-balance text-xl font-semibold leading-snug tracking-tight text-[color:var(--terminal-fg)] sm:text-[1.75rem]">
                {q.prompt}
              </h2>
              {q.hint ? (
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--terminal-muted)]">{q.hint}</p>
              ) : null}

              <div className="mt-6 sm:mt-8">
                <QuestionField q={q} value={value} onChange={patchValue} error={error} />
                {error ? (
                  <p className="mt-2 text-sm text-[color:var(--terminal-ochre)]">{error}</p>
                ) : null}
              </div>

              <div className="mt-8 hidden sm:block">
                <LivePreviewChips chips={chips} />
              </div>
            </form>
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        className={cn(
          'relative z-30 shrink-0',
          'bg-gradient-to-t from-[color:var(--terminal-bg)] via-[color:var(--terminal-bg)]/98 to-transparent',
          'px-4 pt-4 sm:px-10 sm:pt-6',
          'pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]',
        )}
      >
        <div className="mx-auto flex max-w-xl items-center gap-2 sm:gap-3">
          {questionIndex > 0 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={goBack}
              className="h-11 shrink-0 px-2 font-semibold text-[color:var(--terminal-muted)] hover:bg-transparent hover:text-[color:var(--terminal-fg)]"
            >
              Back
            </Button>
          ) : (
            <span className="w-12 shrink-0" aria-hidden />
          )}
          <div className="ml-auto flex items-center gap-2">
            {q.optional ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => goNext(true)}
                className="h-11 shrink-0 px-2 font-semibold text-[color:var(--terminal-muted)] hover:bg-transparent sm:px-4"
              >
                Skip
              </Button>
            ) : null}
            <Button
              type="submit"
              form="valuation-step-form"
              className="h-11 shrink-0 rounded-full border-0 bg-[color:var(--terminal-ochre)] px-6 text-sm font-bold text-[#0b0b0c] hover:bg-[color:var(--terminal-ochre-hover)] sm:px-7"
            >
              {questionIndex >= VALUATION_QUESTIONS.length - 1 ? 'Run analysis' : 'Continue'}
            </Button>
          </div>
        </div>
      </div>
    </ValuationFullViewport>
  );
}

const lineFieldClass =
  'h-11 w-full min-w-0 rounded-none border-0 border-b border-[color:var(--terminal-border)]/80 bg-transparent px-0 text-left text-lg font-medium text-[color:var(--terminal-fg)] shadow-none ring-0 placeholder:text-[color:var(--terminal-muted)]/55 focus-visible:border-b-[color:var(--terminal-ochre)] focus-visible:ring-0 sm:text-2xl';

function QuestionField({
  q,
  value,
  onChange,
  error,
}: {
  q: ValuationQuestion;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const invalid = Boolean(error);
  const fieldClass = cn(lineFieldClass, invalid && 'border-b-[color:var(--terminal-ochre)]');

  if (q.kind === 'select' && q.selectOptions) {
    return (
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger
          className={cn(
            fieldClass,
            'h-auto min-h-11 py-2 [&>span]:line-clamp-2 [&>span]:text-left',
            '[&>svg]:shrink-0 [&>svg]:opacity-60',
            'data-[placeholder]:text-[color:var(--terminal-muted)]/55',
          )}
        >
          <SelectValue placeholder={q.placeholder ?? 'Choose one'} />
        </SelectTrigger>
        <SelectContent position="popper" className="max-h-[min(50dvh,280px)]">
          {q.selectOptions.map((opt) => (
            <SelectItem key={opt} value={opt} className="text-base">
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      autoFocus
      type={q.kind === 'email' ? 'email' : q.kind === 'url' ? 'url' : q.kind === 'tel' ? 'tel' : 'text'}
      inputMode={q.kind === 'number' ? 'decimal' : undefined}
      placeholder={q.placeholder ?? 'Type here'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={fieldClass}
      aria-invalid={invalid}
    />
  );
}
