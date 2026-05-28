import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ValuationInputs } from "@/lib/valuationIntel";
import { AnalysisValuationCounter } from "./AnalysisValuationCounter";
import { ValuationLottieAnimation } from "./ValuationLottieAnimation";
import { MARKETING_SHELL_CLASS } from "@/lib/marketingShell";
import {
  VALUATION_ANALYSIS_COUNTER_CLASS,
  VALUATION_ANALYSIS_INTEL_CLASS,
  VALUATION_ANALYSIS_LOTTIE_CLASS,
} from "./valuationHeroLottieSize";

const ANALYSIS_LOTTIE_SRC = "/Valuation.lottie";

const INTELLIGENCE_LINES = [
  "Analyzing MRR growth patterns…",
  "Calculating ARR projections…",
  "Evaluating capital efficiency…",
  "Processing retention metrics…",
  "Mapping funding trajectory…",
  "Benchmarking sector multiples…",
  "Running AI-driven comparables…",
  "Estimating market positioning…",
  "Simulating growth velocity…",
  "Computing founder efficiency score…",
] as const;

const ANALYSIS_SYNC_MS = 8200;
const REDUCED_SYNC_MS = 1500;
const EXIT_FADE_MS = 480;

type Props = {
  estimatedValuation: number;
  inputs: ValuationInputs;
  onComplete: () => void;
};

const easePremium = [0.22, 1, 0.36, 1] as const;

type Phase = "sync" | "exit";

export function AiAnalysisScreen({ estimatedValuation, onComplete }: Props) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("sync");
  const [convergencePct, setConvergencePct] = useState(0);
  const finishedRef = useRef(false);

  const syncMs = reduce ? REDUCED_SYNC_MS : ANALYSIS_SYNC_MS;

  useEffect(() => {
    finishedRef.current = false;
    setPhase("sync");
    setConvergencePct(0);

    const timers: number[] = [];
    timers.push(window.setTimeout(() => setPhase("exit"), syncMs));

    return () => timers.forEach(clearTimeout);
  }, [syncMs]);

  useEffect(() => {
    if (phase !== "sync") return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / syncMs);
      const eased = 1 - (1 - t) ** 2.1;
      setConvergencePct(Math.round(eased * 100));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, syncMs]);

  const lineIdx = useMemo(() => {
    if (INTELLIGENCE_LINES.length <= 1) return 0;
    const step = 100 / INTELLIGENCE_LINES.length;
    return Math.min(
      INTELLIGENCE_LINES.length - 1,
      Math.floor(convergencePct / step),
    );
  }, [convergencePct]);

  useEffect(() => {
    if (phase !== "exit" || finishedRef.current) return;
    finishedRef.current = true;
    const t = window.setTimeout(onComplete, reduce ? 80 : EXIT_FADE_MS);
    return () => clearTimeout(t);
  }, [phase, onComplete, reduce]);

  useEffect(() => {
    if (phase !== "sync" && phase !== "exit") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [phase]);

  const showHero = phase === "sync";

  return (
    <motion.div
      className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-x-hidden overflow-y-visible"
      initial={false}
      animate={{ opacity: phase === "exit" ? 0 : 1 }}
      transition={{
        duration: reduce ? 0.15 : EXIT_FADE_MS / 1000,
        ease: easePremium,
      }}
    >
      <motion.div
        className={cn(
          MARKETING_SHELL_CLASS,
          "relative z-10 flex h-full min-h-0 flex-col overflow-x-hidden overflow-y-visible pb-4 pt-5 sm:pt-6",
        )}
        initial={false}
      >
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-x-hidden overflow-y-visible">
          <AnimatePresence mode="wait">
            {showHero ? (
              <motion.div
                key="hero"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, filter: "blur(4px)" }}
                transition={{ duration: 0.45, ease: easePremium }}
                className="analysis-hero flex w-full max-w-[min(100%,40rem)] flex-col items-center overflow-visible"
              >
                <p className="analysis-kicker mb-2 shrink-0 text-center">
                  Implied pricing anchor
                </p>

                <motion.div className="analysis-counter-slot" layout={false}>
                  <AnalysisValuationCounter
                    estimatedValuation={estimatedValuation}
                    progressPct={convergencePct}
                    className={cn(
                      VALUATION_ANALYSIS_COUNTER_CLASS,
                      "font-bold text-[color:var(--terminal-ochre)]",
                    )}
                  />
                </motion.div>

                {!reduce ? (
                  <motion.div
                    className={cn(
                      "analysis-lottie-slot mt-[clamp(0.125rem,0.35dvh,0.25rem)]",
                    )}
                    aria-hidden
                  >
                    <motion.div
                      className="flex w-full items-center justify-center"
                      initial={{ opacity: 0, y: "22%" }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: 0.08,
                        duration: 0.95,
                        ease: easePremium,
                      }}
                    >
                      <ValuationLottieAnimation
                        src={ANALYSIS_LOTTIE_SRC}
                        loop
                        decorative
                        className={cn(
                          VALUATION_ANALYSIS_LOTTIE_CLASS,
                          "drop-shadow-[0_0_40px_color-mix(in_srgb,var(--terminal-lime)_18%,transparent)]",
                        )}
                      />
                    </motion.div>
                  </motion.div>
                ) : null}

                <motion.div className="analysis-intel-slot mt-[clamp(0.5rem,1.5dvh,0.85rem)]">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={lineIdx}
                      className={cn(
                        VALUATION_ANALYSIS_INTEL_CLASS,
                        "text-pretty text-center font-mono line-clamp-2",
                      )}
                      initial={
                        reduce
                          ? false
                          : { opacity: 0, y: 10, filter: "blur(6px)" }
                      }
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={
                        reduce
                          ? undefined
                          : { opacity: 0, y: -6, filter: "blur(4px)" }
                      }
                      transition={{ duration: 0.5, ease: easePremium }}
                      aria-live="polite"
                    >
                      {INTELLIGENCE_LINES[lineIdx]}
                    </motion.p>
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <motion.div
          className="mx-auto w-full max-w-md shrink-0 pt-2"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.45 }}
        >
          <motion.div className="mb-2 flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.2em] text-[color:var(--terminal-muted)]">
            <span>Model convergence</span>
            <span className="tabular-nums text-[color:var(--terminal-lime)]">
              {convergencePct}%
            </span>
          </motion.div>
          <div className="relative h-[3px] overflow-hidden rounded-full bg-[color:var(--terminal-surface-2)]/90">
            <motion.div
              className="relative h-full overflow-hidden rounded-full"
              style={{ width: `${convergencePct}%` }}
              transition={{ duration: 0.35, ease: easePremium }}
            >
              <motion.div className="absolute inset-0 bg-[color:var(--terminal-lime)]/85" />
              <motion.div
                className="absolute inset-y-0 w-[45%] bg-gradient-to-r from-transparent via-[color:var(--terminal-fg)]/25 to-transparent"
                animate={reduce ? undefined : { x: ["-120%", "280%"] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
