import { useEffect, useId, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type Props = {
  /** Decorative 0–100 index (not enterprise valuation). */
  targetIndex?: number;
  size?: number;
  className?: string;
  label?: string;
  sublabel?: string;
};

const easePremium = [0.22, 1, 0.36, 1] as const;

export function ValuationAuroraOrb({
  targetIndex = 78,
  size = 280,
  className,
  label = "Intelligence signal",
  sublabel = "Live preview · not your valuation",
}: Props) {
  const reduce = useReducedMotion();
  const gradId = useId().replace(/:/g, "");
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [index, setIndex] = useState(reduce ? targetIndex : 0);
  const [ringPct, setRingPct] = useState(reduce ? targetIndex : 0);

  useEffect(() => {
    if (reduce) return;
    const start = performance.now();
    const dur = 1100;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - (1 - t) ** 3;
      const v = targetIndex * eased;
      setIndex(Math.round(v));
      setRingPct(v);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduce, targetIndex]);

  const offset = c - (ringPct / 100) * c;

  return (
    <motion.div
      className={cn("relative mx-auto", className)}
      style={{ width: size, height: size }}
      initial={reduce ? false : { opacity: 0.85, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.55, ease: easePremium }}
    >
      {!reduce ? (
        <>
          <motion.div
            className="pointer-events-none absolute inset-[8%] rounded-full opacity-70 blur-2xl"
            style={{
              background:
                "conic-gradient(from 0deg, color-mix(in srgb, var(--terminal-ochre) 55%, transparent), color-mix(in srgb, var(--terminal-lime) 40%, transparent), color-mix(in srgb, var(--terminal-ochre) 20%, transparent))",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="pointer-events-none absolute inset-[18%] rounded-full border border-[color:var(--terminal-border)]/40"
            animate={{ scale: [1, 1.04, 1], opacity: [0.35, 0.55, 0.35] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="pointer-events-none absolute inset-0"
              animate={{ rotate: 360 }}
              transition={{
                duration: 10 + i * 2.5,
                repeat: Infinity,
                ease: "linear",
              }}
              initial={{ rotate: i * 120 }}
            >
              <span className="absolute left-1/2 top-2 h-2 w-2 -translate-x-1/2 rounded-full bg-[color:var(--terminal-lime)] shadow-[0_0_12px_color-mix(in_srgb,var(--terminal-lime)_55%,transparent)]" />
            </motion.div>
          ))}
        </>
      ) : null}

      <svg
        width={size}
        height={size}
        className="relative -rotate-90"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--terminal-ochre)" />
            <stop offset="45%" stopColor="var(--terminal-lime)" />
            <stop offset="100%" stopColor="var(--terminal-ochre)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="color-mix(in srgb, var(--terminal-border) 85%, transparent)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduce ? 0 : 1.05, ease: easePremium }}
          style={{
            filter:
              "drop-shadow(0 0 14px color-mix(in srgb, var(--terminal-ochre) 35%, transparent))",
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <motion.span
          key={index}
          className="font-mono text-5xl font-bold tabular-nums tracking-tight text-[color:var(--terminal-fg)] sm:text-6xl"
          initial={reduce ? false : { opacity: 0.6, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
        >
          {index}
        </motion.span>
        {label ? (
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--terminal-muted)]">
            {label}
          </p>
        ) : null}
        {sublabel ? (
          <p className="mt-0.5 max-w-[12rem] text-[10px] leading-snug text-[color:var(--terminal-muted)]/80">
            {sublabel}
          </p>
        ) : null}
      </div>
    </motion.div>
  );
}
