import { useEffect, useId, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type Props = {
  percent: number;
  helperText: string;
  compact?: boolean;
  className?: string;
};

export function CircularProgressTracker({
  percent,
  helperText,
  compact,
  className,
}: Props) {
  const reduce = useReducedMotion();
  const gradId = useId().replace(/:/g, "");
  const [display, setDisplay] = useState(percent);
  const size = compact ? 112 : 168;
  const stroke = compact ? 7 : 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (display / 100) * c;

  useEffect(() => {
    if (reduce) {
      setDisplay(percent);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const from = display;
    const dur = 520;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(from + (percent - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percent, reduce]);

  return (
    <motion.div
      layout
      className={cn(
        "flex flex-col items-center rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-4 shadow-sm backdrop-blur-sm",
        compact ? "p-3" : "p-5",
        className,
      )}
      style={{
        boxShadow:
          "0 0 40px -12px color-mix(in srgb, var(--terminal-ochre) 35%, transparent)",
      }}
    >
      <motion.div
        className="relative"
        animate={reduce ? undefined : { scale: [1, 1.02, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-full opacity-60 blur-xl"
          style={{
            background:
              "radial-gradient(circle, var(--terminal-glow), transparent 70%)",
          }}
        />
        <svg width={size} height={size} className="relative -rotate-90">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--terminal-ochre)" />
              <stop offset="50%" stopColor="var(--terminal-lime)" />
              <stop offset="100%" stopColor="var(--terminal-ochre)" />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="color-mix(in srgb, var(--terminal-border) 90%, transparent)"
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
            animate={{ strokeDashoffset: offset }}
            transition={{
              duration: reduce ? 0 : 0.55,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              filter:
                "drop-shadow(0 0 6px color-mix(in srgb, var(--terminal-ochre) 45%, transparent))",
            }}
          />
        </svg>
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center"
          key={Math.round(display)}
          initial={reduce ? false : { opacity: 0.7, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <span
            className={cn(
              "font-mono font-bold tabular-nums text-[color:var(--terminal-fg)]",
              compact ? "text-2xl" : "text-4xl",
            )}
          >
            {Math.round(display)}%
          </span>
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[color:var(--terminal-muted)]">
            Complete
          </span>
        </motion.div>
      </motion.div>
      <p
        className={cn(
          "mt-3 text-center font-medium leading-snug text-[color:var(--terminal-muted)]",
          compact ? "text-[11px]" : "text-xs",
        )}
      >
        {helperText}
      </p>
    </motion.div>
  );
}
