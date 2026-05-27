import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ValuationFullViewport } from "@/components/valuation/ValuationFullViewport";
import { ValuationStageBackdrop } from "@/components/valuation/ValuationStageBackdrop";
import { MARKETING_SHELL_CLASS } from "@/lib/marketingShell";
import {
  OWNERR_NETWORK_ONBOARDING_STEPS,
  type McqAnswers,
} from "@/lib/ownerr-network/mcqQuestions";
import { completeOnboarding, hasCompletedOnboarding } from "@/lib/ownerr-network/api";
import { useOwnerrNetworkAuth } from "@/hooks/useOwnerrNetworkAuth";
import { trackOwnerrNetworkEvent } from "@/lib/ownerr-network/analytics";
import { cn } from "@/lib/utils";
import { PRODUCT_ROUTES } from "@/routing/routeRegistry";

type Step =
  | { kind: "name" }
  | { kind: "username" }
  | { kind: "mcq"; index: number };

const STEPS: Step[] = [
  { kind: "name" },
  { kind: "username" },
  ...OWNERR_NETWORK_ONBOARDING_STEPS.map((_, index) => ({ kind: "mcq" as const, index })),
];

const easePremium = [0.16, 1, 0.3, 1] as const;

export default function OwnerrNetworkOnboardingPage() {
  return <OnboardingExperience />;
}

function OnboardingExperience() {
  const [, setLocation] = useLocation();
  const { profile, refreshProfile } = useOwnerrNetworkAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [answers, setAnswers] = useState<McqAnswers>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    void hasCompletedOnboarding(profile.id).then((done) => {
      if (done) setLocation(PRODUCT_ROUTES.ownerrNetworkDashboard);
    });
  }, [profile, setLocation]);

  useEffect(() => {
    if (profile?.name) setName(profile.name);
    if (profile?.username) setUsername(profile.username);
  }, [profile?.name, profile?.username]);

  const step = STEPS[stepIndex];
  if (!step) return null;

  const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100);

  const goNext = () => {
    setError(null);
    if (step.kind === "name") {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setError("Please enter your full name.");
        return;
      }
      setStepIndex((i) => i + 1);
    } else if (step.kind === "username") {
      const trimmedUser = username.trim();
      if (trimmedUser.length < 3) {
        setError("Username must be at least 3 characters.");
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(trimmedUser)) {
        setError("Username can only contain alphanumeric characters and underscores.");
        return;
      }
      setStepIndex((i) => i + 1);
    }
  };

  function advanceMcq(value: string) {
    const q = OWNERR_NETWORK_ONBOARDING_STEPS[step.kind === "mcq" ? step.index : 0];
    if (!q) return;
    const nextAnswers = { ...answers, [q.field]: value };
    setAnswers(nextAnswers);
    setError(null);

    if (stepIndex >= STEPS.length - 1) {
      setSubmitting(true);
      console.log("[Onboarding] Submitting onboarding survey responses…");
      void completeOnboarding(
        name.trim() || profile?.name || "",
        username.trim() || profile?.username || "",
        nextAnswers
      )
        .then(async () => {
          console.log("[Onboarding] Onboarding completed. Refreshing profile…");
          await refreshProfile();
          await trackOwnerrNetworkEvent("survey_complete", {}, profile?.id);
          setLocation(PRODUCT_ROUTES.ownerrNetworkDashboard);
        })
        .catch((err: unknown) => {
          console.error("[Onboarding] Error submitting onboarding survey:", err);
          setError(
            err instanceof Error
              ? err.message
              : typeof err === "object" && err !== null && "message" in err
              ? String((err as { message?: string }).message)
              : "Failed to complete onboarding. Please try another username or try again."
          );
        })
        .finally(() => setSubmitting(false));
      return;
    }
    setStepIndex((i) => i + 1);
  }

  const goBack = () => {
    setError(null);
    setStepIndex((i) => Math.max(0, i - 1));
  };

  return (
    <ValuationFullViewport className="grid grid-rows-[auto_1fr_auto] py-4">
      <ValuationStageBackdrop intensity="flow" calm />

      {/* Top Header & Progress Track */}
      <div className={cn(MARKETING_SHELL_CLASS, "relative z-20 px-4 pt-3 sm:pt-6")}>
        <div className="mx-auto flex max-w-xl items-center justify-between gap-2 text-xs font-black uppercase tracking-[0.25em] text-[#EBFBBC]">
          <span>
            Setup {stepIndex + 1} / {STEPS.length}
          </span>
          <span className="tabular-nums text-[color:var(--terminal-lime)]">{progress}% Completed</span>
        </div>
        <div className="mx-auto mt-3.5 h-1.5 max-w-xl overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full bg-gradient-to-r from-[color:var(--terminal-ochre)] to-[color:var(--terminal-lime)] shadow-[0_0_8px_var(--terminal-lime)] transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Main Expansive Questionnaire Area (Completely Cardless) */}
      <div className={cn(MARKETING_SHELL_CLASS, "relative z-20 flex min-h-0 items-center justify-center overflow-y-auto overscroll-y-contain px-4 py-6 sm:py-8")}>
        <AnimatePresence mode="wait">
          <motion.div
            key={stepIndex}
            initial={{ opacity: 0, y: 45 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.55, ease: easePremium }}
            className="relative mx-auto w-full max-w-xl border-0 bg-transparent p-0 shadow-none flex flex-col"
          >
            {/* Ambient background glow */}
            <div
              className="absolute -left-32 -top-32 h-[300px] w-[300px] rounded-full opacity-20 blur-[100px] pointer-events-none"
              style={{ background: 'var(--terminal-glow)' }}
            />

            {step.kind === "name" ? (
              <form
                id="onboarding-step-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  goNext();
                }}
                className="w-full z-10"
              >
                <h2 className="text-3xl font-bold text-[color:var(--terminal-display)] tracking-tight">Your name</h2>
                <p className="mt-3.5 text-sm font-semibold text-[color:var(--terminal-muted)] tracking-wide">
                  Please enter your full name as it should appear on your profile.
                </p>
                <div className="mt-10 sm:mt-12">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError(null);
                    }}
                    className={cn(
                      "h-14 w-full min-w-0 rounded-none border-0 border-b border-white/20 bg-transparent px-0 font-bold tracking-tight text-white outline-none placeholder:text-white/25 focus:border-[color:var(--terminal-lime)] focus:border-b-2 transition-all duration-300 sm:h-16 text-[17px] sm:text-4xl leading-snug",
                      error && "border-b-[color:var(--terminal-ochre)] focus:border-[color:var(--terminal-ochre)]"
                    )}
                  />
                </div>
              </form>
            ) : null}

            {step.kind === "username" ? (
              <form
                id="onboarding-step-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  goNext();
                }}
                className="w-full z-10"
              >
                <h2 className="text-3xl font-bold text-[color:var(--terminal-display)] tracking-tight">Username</h2>
                <p className="mt-3.5 text-sm font-semibold text-[color:var(--terminal-muted)] tracking-wide">
                  Choose a unique handle for your profile directory. (Min 3 characters)
                </p>
                <div className="mt-10 sm:mt-12">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError(null);
                    }}
                    className={cn(
                      "h-14 w-full min-w-0 rounded-none border-0 border-b border-white/20 bg-transparent px-0 font-bold tracking-tight text-white outline-none placeholder:text-white/25 focus:border-[color:var(--terminal-lime)] focus:border-b-2 transition-all duration-300 sm:h-16 text-[17px] sm:text-4xl leading-snug",
                      error && "border-b-[color:var(--terminal-ochre)] focus:border-[color:var(--terminal-ochre)]"
                    )}
                  />
                </div>
              </form>
            ) : null}

            {step.kind === "mcq" ? (
              <div className="w-full z-10">
                <h2 className="text-2xl font-bold text-[color:var(--terminal-display)] sm:text-3xl leading-tight tracking-tight">
                  {OWNERR_NETWORK_ONBOARDING_STEPS[step.index]?.prompt}
                </h2>
                <ul className="mt-10 sm:mt-12 space-y-2.5">
                  {OWNERR_NETWORK_ONBOARDING_STEPS[step.index]?.options.map((opt) => (
                    <li key={opt}>
                      <Button
                        type="button"
                        disabled={submitting}
                        variant="outline"
                        className="h-14 w-full justify-start rounded-[10px] border border-white/10 bg-white/[0.02] px-6 text-left text-sm font-bold uppercase tracking-wider text-white/70 shadow-sm transition-all duration-300 hover:border-[color:var(--terminal-ochre)]/40 hover:bg-white/[0.05] hover:text-white transform hover:translate-x-1 active:translate-x-0"
                        onClick={() => advanceMcq(opt)}
                      >
                        {opt}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Display error message if present */}
            {error ? (
              <motion.p
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 text-sm font-bold text-[color:var(--terminal-ochre)] flex items-center gap-1.5"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </motion.p>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Action Row */}
      <div className={cn("z-30 shrink-0 bg-transparent pt-3 sm:relative sm:pt-6 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]", MARKETING_SHELL_CLASS)}>
        <div className="mx-auto flex max-w-xl items-center justify-between">
          {stepIndex > 0 ? (
            <Button
              type="button"
              variant="ghost"
              disabled={submitting}
              onClick={goBack}
              className="h-12 shrink-0 rounded-[10px] border border-white/10 bg-transparent px-8 text-sm font-black uppercase tracking-widest text-[color:var(--terminal-muted)] hover:bg-white/[0.04] hover:text-white transition-all duration-300"
            >
              Back
            </Button>
          ) : (
            <span className="w-12 shrink-0" aria-hidden />
          )}

          {step.kind !== "mcq" ? (
            <Button
              type="submit"
              form="onboarding-step-form"
              disabled={submitting}
              className="h-12 shrink-0 rounded-[10px] border-0 bg-[color:var(--terminal-ochre)] px-10 text-sm font-black uppercase tracking-widest text-[#0b0b0c] shadow-[0_4px_20px_rgba(212,167,71,0.22)] transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none disabled:transform-none"
            >
              Continue
            </Button>
          ) : null}
        </div>
      </div>
    </ValuationFullViewport>
  );
}
