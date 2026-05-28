import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ValuationInputs } from "@/lib/valuationIntel";
import { cn } from "@/lib/utils";
import { MARKETING_SHELL_CLASS } from "@/lib/marketingShell";
import { LivePreviewChips } from "./LivePreviewChips";
import { buildPreviewChips } from "./previewInsights";
import { ValuationFullViewport } from "./ValuationFullViewport";
import type { OnboardingMeta } from "./types";
import {
  VALUATION_QUESTIONS,
  getQuestionValue,
  questionProgress,
  setQuestionValue,
  validateQuestion,
  type ValuationQuestion,
} from "./valuationQuestions";
import { scrollPageToTop } from "@/lib/scrollPageToTop";
import { useKeyboardBottomInset } from "./useKeyboardBottomInset";

const easePremium = [0.16, 1, 0.3, 1] as const;

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
  const keyboardInset = useKeyboardBottomInset();
  const [error, setError] = useState<string | undefined>();
  const mobileActionBarHeight = 76;
  const q = VALUATION_QUESTIONS[questionIndex];
  const chips = useMemo(() => buildPreviewChips(inputs), [inputs]);
  const progress = questionProgress(questionIndex);
  const value = q ? getQuestionValue(q, inputs, meta) : "";

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

  useEffect(() => {
    scrollPageToTop();
  }, [questionIndex]);

  if (!q) return null;

  return (
    <ValuationFullViewport
      center={false}
      className="grid grid-rows-[auto_1fr_auto] py-4"
    >
      {/* Top Header & Minimal Progress Track */}
      <div
        className={cn(
          MARKETING_SHELL_CLASS,
          "relative z-20 shrink-0 pt-3 sm:pt-6",
        )}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 text-xs font-black uppercase tracking-[0.25em] text-[#EBFBBC]">
          <span>
            Indicator {questionIndex + 1} / {VALUATION_QUESTIONS.length}
          </span>
          <span className="tabular-nums text-[color:var(--terminal-lime)]">
            {progress}% Completed
          </span>
        </div>
        <motion.div className="mx-auto mt-3.5 h-1.5 max-w-2xl rounded-full bg-white/10 overflow-hidden sm:mt-4">
          <motion.div
            className="h-full bg-gradient-to-r from-[color:var(--terminal-ochre)] to-[color:var(--terminal-lime)] shadow-[0_0_8px_var(--terminal-lime)] transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </motion.div>
      </div>

      {/* Main Expansive Questionnaire Area (Completely Cardless) */}
      <div
        data-scroll-reset
        className={cn(
          MARKETING_SHELL_CLASS,
          "relative z-20 flex min-h-0 items-center justify-center overflow-y-auto overscroll-y-contain py-6 sm:py-8",
          "max-sm:pb-28",
        )}
        style={{
          paddingBottom:
            keyboardInset > 0
              ? keyboardInset + mobileActionBarHeight + 12
              : undefined,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            className="relative mx-auto w-full max-w-2xl border-0 bg-transparent p-0 shadow-none flex flex-col"
            initial={reduce ? false : { opacity: 0, y: 65 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -45 }}
            transition={{ duration: 0.55, ease: easePremium }}
          >
            {/* Ambient background glow */}
            <div
              className="absolute -left-32 -top-32 h-[300px] w-[300px] rounded-full opacity-20 blur-[100px] pointer-events-none"
              style={{ background: "var(--terminal-glow)" }}
            />

            <form
              id="valuation-step-form"
              className="w-full z-10"
              onSubmit={(e) => {
                e.preventDefault();
                goNext(false);
              }}
            >
              {/* Thin elegant luxury typography */}
              <h2 className="text-balance leading-tight">{q.prompt}</h2>
              {q.hint ? (
                <p className="mt-3.5 text-sm font-semibold text-[color:var(--terminal-muted)] tracking-wide">
                  {q.hint}
                </p>
              ) : null}

              <div className="mt-10 sm:mt-12">
                <QuestionField
                  q={q}
                  value={value}
                  onChange={patchValue}
                  error={error}
                />
                {error ? (
                  <motion.p
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 text-sm font-bold text-[color:var(--terminal-ochre)] flex items-center gap-1.5"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    {error}
                  </motion.p>
                ) : null}
              </div>

              {/* Expansive chips display (no divider above insights) */}
              <div className="mt-12">
                <LivePreviewChips chips={chips} />
              </div>
            </form>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom action row — fixed above keyboard on mobile */}
      <div
        className={cn(
          "z-30 shrink-0",
          "bg-gradient-to-t from-[color:var(--terminal-bg)] via-[color:var(--terminal-bg)] to-[color:var(--terminal-bg)]/95",
          MARKETING_SHELL_CLASS,
          "pt-3 sm:relative sm:pt-6",
          "max-sm:fixed max-sm:left-0 max-sm:right-0",
          "pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]",
        )}
        style={{ bottom: keyboardInset }}
      >
        <div className="mx-auto flex max-w-2xl items-center gap-2 sm:gap-3">
          {questionIndex > 0 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={goBack}
              className="h-12 shrink-0 rounded-[10px] border border-white/10 bg-transparent px-8 text-sm font-black uppercase tracking-widest text-[color:var(--terminal-muted)] hover:bg-white/[0.04] hover:text-white transition-all duration-300"
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
                className="h-12 shrink-0 rounded-[10px] px-8 text-sm font-black uppercase tracking-widest text-[color:var(--terminal-muted)] hover:bg-transparent hover:text-white transition-all duration-300"
              >
                Skip
              </Button>
            ) : null}
            <Button
              type="submit"
              form="valuation-step-form"
              className="h-12 shrink-0 rounded-[10px] border-0 bg-[color:var(--terminal-ochre)] px-10 text-sm font-black uppercase tracking-widest text-[#0b0b0c] shadow-[0_4px_20px_rgba(212,167,71,0.22)] transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              {questionIndex >= VALUATION_QUESTIONS.length - 1
                ? "Run Analysis"
                : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    </ValuationFullViewport>
  );
}

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

  if (q.kind === "select" && q.selectOptions) {
    return (
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger
          className={cn(
            "h-16 w-full min-w-0 rounded-none border-0 border-b border-white/20 bg-transparent px-0 text-2xl font-bold tracking-tight text-white shadow-none ring-0 placeholder:text-white/25 focus:border-[color:var(--terminal-lime)] focus:ring-0 focus:border-b-2 transition-all duration-300 sm:text-4xl text-left flex justify-between items-center",
            invalid && "border-b-[color:var(--terminal-ochre)]",
          )}
        >
          <SelectValue placeholder={q.placeholder ?? "Select option"} />
        </SelectTrigger>
        <SelectContent className="border border-white/10 bg-[color:var(--terminal-bg)] text-white shadow-2xl rounded-xl p-1 max-h-80 overflow-y-auto">
          {q.selectOptions.map((opt) => (
            <SelectItem
              key={opt}
              value={opt}
              className="text-sm sm:text-base font-semibold uppercase tracking-wider text-white/70 hover:text-white focus:bg-white/5 focus:text-white cursor-pointer py-3 px-4 rounded-lg"
            >
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const isTel = q.kind === "tel";
  const isNumber = q.kind === "number";

  return (
    <input
      autoFocus
      type={
        q.kind === "email"
          ? "email"
          : q.kind === "url"
            ? "url"
            : isTel
              ? "tel"
              : "text"
      }
      inputMode={
        isTel
          ? "tel"
          : isNumber
            ? "decimal"
            : q.kind === "email"
              ? "email"
              : "text"
      }
      autoComplete={isTel ? "tel" : q.kind === "email" ? "email" : undefined}
      enterKeyHint="next"
      placeholder={q.placeholder ?? (isTel ? "+1 555 000 0000" : "Type here")}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={(e) => {
        requestAnimationFrame(() => {
          e.currentTarget.scrollIntoView({
            block: "center",
            behavior: "smooth",
          });
        });
      }}
      className={cn(
        "h-14 w-full min-w-0 rounded-none border-0 border-b border-white/20 bg-transparent px-0 font-bold tracking-tight text-white outline-none placeholder:text-white/25 focus:border-[color:var(--terminal-lime)] focus:border-b-2 transition-all duration-300 sm:h-16",
        "text-[17px] leading-snug sm:text-4xl",
        isTel && "font-mono tabular-nums tracking-normal",
        invalid && "border-b-[color:var(--terminal-ochre)]",
      )}
      aria-invalid={invalid}
      aria-label={q.prompt}
    />
  );
}
