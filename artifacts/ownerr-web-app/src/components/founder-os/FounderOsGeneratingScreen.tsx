import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { MARKETING_SHELL_CLASS } from "@/lib/marketingShell";
import { ValuationFullViewport } from "@/components/valuation/ValuationFullViewport";

const LINES = [
  "Listing your startup on OWNERR OS…",
  "Opening up more reach for your idea…",
  "Wiring your referral link…",
  "Getting your share pack ready — almost there!",
] as const;

const SYNC_MS = 5200;
const REDUCED_MS = 1200;

type Props = {
  startupName: string;
  onComplete: () => void;
};

export function FounderOsGeneratingScreen({ startupName, onComplete }: Props) {
  const reduce = useReducedMotion();
  const syncMs = reduce ? REDUCED_MS : SYNC_MS;
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / syncMs);
      setPct(Math.round((1 - (1 - t) ** 2) * 100));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const done = window.setTimeout(onComplete, syncMs);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(done);
    };
  }, [syncMs, onComplete]);

  const line = useMemo(() => {
    const idx = Math.min(LINES.length - 1, Math.floor((pct / 100) * LINES.length));
    return LINES[idx];
  }, [pct]);

  return (
    <ValuationFullViewport className={MARKETING_SHELL_CLASS}>
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center py-16 text-center">
        <motion.p
          className="text-[11px] font-black uppercase tracking-[0.28em] text-[color:var(--terminal-lime)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          You&apos;re almost live
        </motion.p>
        <h2 className="mt-4 flex flex-wrap items-center justify-center gap-2 text-balance text-3xl font-bold text-[#EBFBBC] sm:text-4xl">
          <span>
            {startupName.trim() || "Your startup"} is joining the list
          </span>
          <CheckCircle2 className="h-8 w-8 shrink-0 text-[color:var(--terminal-lime)]" aria-hidden />
        </h2>
        <p className="mt-3 text-sm font-semibold text-[color:var(--terminal-ochre)]">{line}</p>
        <div className="mt-10 h-2 w-full max-w-md overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full bg-gradient-to-r from-[color:var(--terminal-ochre)] to-[color:var(--terminal-lime)]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-4 font-mono text-xs tabular-nums text-[color:var(--terminal-muted)]">{pct}%</p>
      </div>
    </ValuationFullViewport>
  );
}
