import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ValuationFullViewport } from "@/components/valuation/ValuationFullViewport";
import { useKeyboardBottomInset } from "@/components/valuation/useKeyboardBottomInset";
import { MARKETING_SHELL_CLASS } from "@/lib/marketingShell";
import { scrollPageToTop } from "@/lib/scrollPageToTop";
import { cn } from "@/lib/utils";
import {
  FOUNDER_QUESTIONS,
  getQuestionValue,
  questionProgress,
  validateQuestion,
  type FounderFormDraft,
  type FounderQuestion,
} from "./founderOsQuestions";
import { OWNERR_OS_FORM_PREFILL_NOTE } from "./ownerrOsFormDefaults";

const easePremium = [0.22, 1, 0.36, 1] as const;

type Props = {
  questionIndex: number;
  draft: FounderFormDraft;
  onDraftChange: (draft: FounderFormDraft) => void;
  onQuestionIndexChange: (index: number) => void;
  onComplete: () => void;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function FounderOsClaudeFlow({
  questionIndex,
  draft,
  onDraftChange,
  onQuestionIndexChange,
  onComplete,
}: Props) {
  const reduce = useReducedMotion();
  const keyboardInset = useKeyboardBottomInset();
  const [error, setError] = useState<string | undefined>();
  const mobileActionBarHeight = 76;
  const q = FOUNDER_QUESTIONS[questionIndex];
  const progress = questionProgress(questionIndex);
  const value = q ? getQuestionValue(q, draft) : "";

  const patchValue = useCallback(
    (raw: string) => {
      if (!q || q.id === "photo") return;
      onDraftChange({ ...draft, [q.id]: raw });
      setError(undefined);
    },
    [q, draft, onDraftChange],
  );

  const goNext = (skip = false) => {
    if (!q) return;
    if (!skip) {
      const err = validateQuestion(q, draft);
      if (err) {
        setError(err);
        return;
      }
    }
    if (questionIndex >= FOUNDER_QUESTIONS.length - 1) {
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
      <div
        className={cn(
          MARKETING_SHELL_CLASS,
          "relative z-20 shrink-0 pt-3 sm:pt-6",
        )}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 text-xs font-black uppercase tracking-[0.25em] text-[#EBFBBC]">
          <span>
            Listing step {questionIndex + 1} / {FOUNDER_QUESTIONS.length}
          </span>
          <span className="tabular-nums text-[color:var(--terminal-lime)]">
            {progress}%
          </span>
        </div>
        {questionIndex > 0 ? (
          <p className="mx-auto mt-2 max-w-2xl text-center text-[11px] font-medium leading-snug text-[color:var(--terminal-muted)]">
            {OWNERR_OS_FORM_PREFILL_NOTE}
          </p>
        ) : null}
        <motion.div className="mx-auto mt-3.5 h-1.5 max-w-2xl overflow-hidden rounded-full bg-white/10 sm:mt-4">
          <motion.div
            className="h-full bg-gradient-to-r from-[color:var(--terminal-ochre)] to-[color:var(--terminal-lime)] shadow-[0_0_8px_var(--terminal-lime)]"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </motion.div>
      </div>

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
            className="relative mx-auto flex w-full max-w-2xl flex-col border-0 bg-transparent p-0 shadow-none"
            initial={reduce ? false : { opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -32 }}
            transition={{ duration: 0.5, ease: easePremium }}
          >
            <div
              className="pointer-events-none absolute -left-32 -top-32 h-[300px] w-[300px] rounded-full opacity-20 blur-[100px]"
              style={{ background: "var(--terminal-glow)" }}
            />
            <form
              id="founder-os-step-form"
              className="z-10 w-full"
              onSubmit={(e) => {
                e.preventDefault();
                goNext(false);
              }}
            >
              <h2 className="text-balance leading-tight">{q.prompt}</h2>
              {q.hint ? (
                <p className="mt-3.5 text-sm font-semibold tracking-wide text-[color:var(--terminal-muted)]">
                  {q.hint}
                </p>
              ) : null}
              <div className="mt-10 sm:mt-12">
                <FounderQuestionField
                  q={q}
                  draft={draft}
                  value={value}
                  onChange={patchValue}
                  onPhoto={async (file) => {
                    if (!file) {
                      onDraftChange({ ...draft, founderPhoto: undefined });
                      return;
                    }
                    if (file.size > 2_500_000) {
                      setError("Image must be under 2.5MB.");
                      return;
                    }
                    const dataUrl = await readFileAsDataUrl(file);
                    onDraftChange({ ...draft, founderPhoto: dataUrl });
                    setError(undefined);
                  }}
                  error={error}
                />
                {error ? (
                  <p className="mt-4 text-sm font-bold text-[color:var(--terminal-ochre)]">
                    {error}
                  </p>
                ) : null}
              </div>
            </form>
          </motion.div>
        </AnimatePresence>
      </div>

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
              className="h-12 shrink-0 rounded-[10px] border border-white/10 px-8 text-sm font-black uppercase tracking-widest text-[color:var(--terminal-muted)] hover:bg-white/[0.04] hover:text-white"
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
                className="h-12 shrink-0 rounded-[10px] px-8 text-sm font-black uppercase tracking-widest text-[color:var(--terminal-muted)] hover:text-white"
              >
                Skip
              </Button>
            ) : null}
            <Button
              type="submit"
              form="founder-os-step-form"
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-[10px] border-0 bg-[color:var(--terminal-ochre)] px-10 text-sm font-black uppercase tracking-widest text-[color:var(--brand-accent-ink)] shadow-[0_4px_20px_rgba(212,167,71,0.22)]"
            >
              {questionIndex >= FOUNDER_QUESTIONS.length - 1 ? (
                <>
                  <Rocket className="h-4 w-4 shrink-0" aria-hidden />
                  List me
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </div>
      </div>
    </ValuationFullViewport>
  );
}

function FounderQuestionField({
  q,
  draft,
  value,
  onChange,
  onPhoto,
  error,
}: {
  q: FounderQuestion;
  draft: FounderFormDraft;
  value: string;
  onChange: (v: string) => void;
  onPhoto: (file: File | undefined) => Promise<void>;
  error?: string;
}) {
  const invalid = Boolean(error);

  if (q.kind === "photo") {
    return (
      <div className="space-y-4">
        {draft.founderPhoto ? (
          <img
            src={draft.founderPhoto}
            alt=""
            className="h-24 w-24 rounded-[10px] border border-white/20 object-cover"
          />
        ) : null}
        <input
          type="file"
          accept="image/*"
          className="text-sm text-[color:var(--terminal-muted)] file:mr-4 file:rounded-[10px] file:border-0 file:bg-[color:var(--terminal-ochre)] file:px-4 file:py-2 file:font-bold file:text-[color:var(--brand-accent-ink)]"
          onChange={(e) => void onPhoto(e.target.files?.[0])}
        />
      </div>
    );
  }

  if (q.kind === "select" && q.selectOptions) {
    return (
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger
          className={cn(
            "flex h-16 w-full items-center justify-between rounded-none border-0 border-b border-white/20 bg-transparent px-0 text-left text-2xl font-bold tracking-tight text-white shadow-none focus:border-b-2 focus:border-[color:var(--terminal-lime)] focus:ring-0 sm:text-4xl",
            invalid && "border-b-[color:var(--terminal-ochre)]",
          )}
        >
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent className="rounded-xl border border-white/10 bg-[color:var(--terminal-bg)] p-1 text-white shadow-2xl">
          {q.selectOptions.map((opt) => (
            <SelectItem
              key={opt}
              value={opt}
              className="cursor-pointer py-3 font-semibold uppercase"
            >
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (q.kind === "textarea") {
    return (
      <textarea
        autoFocus
        rows={5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={q.placeholder ?? "Type here"}
        className={cn(
          "w-full resize-none rounded-none border-0 border-b border-white/20 bg-transparent px-0 text-[17px] font-bold leading-snug tracking-tight text-white outline-none placeholder:text-white/25 focus:border-b-2 focus:border-[color:var(--terminal-lime)] sm:text-2xl",
          invalid && "border-b-[color:var(--terminal-ochre)]",
        )}
      />
    );
  }

  return (
    <input
      autoFocus
      type={q.kind === "url" ? "url" : "text"}
      enterKeyHint="next"
      placeholder={q.placeholder ?? "Type here"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-14 w-full min-w-0 rounded-none border-0 border-b border-white/20 bg-transparent px-0 text-[17px] font-bold tracking-tight text-white outline-none placeholder:text-white/25 focus:border-b-2 focus:border-[color:var(--terminal-lime)] sm:h-16 sm:text-4xl",
        invalid && "border-b-[color:var(--terminal-ochre)]",
      )}
    />
  );
}
