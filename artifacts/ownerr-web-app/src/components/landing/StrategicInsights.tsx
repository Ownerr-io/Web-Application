import { motion, useReducedMotion } from "framer-motion";
import type { StrategicInsightCard } from "@/lib/valuationIntel";
import { cn } from "@/lib/utils";

type Props = {
  insights: StrategicInsightCard[];
};

export function StrategicInsights({ insights }: Props) {
  const reduce = useReducedMotion();
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {insights.map((card, idx) => (
        <motion.article
          key={card.id}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.28, delay: reduce ? 0 : idx * 0.05 }}
          className={cn(
            "flex flex-col rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)] p-4 shadow-sm transition-shadow hover:shadow-md",
            "hover-elevate",
          )}
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold leading-snug text-[color:var(--terminal-fg)]">
              {card.title}
            </h3>
            <span className="shrink-0 rounded border border-[color:var(--terminal-border)] bg-[color:var(--terminal-bg)] px-2 py-0.5 text-[10px] font-bold tabular-nums text-[color:var(--terminal-lime)]">
              {card.confidence}%
            </span>
          </div>
          <p className="mb-3 flex-1 text-xs leading-relaxed text-[color:var(--terminal-muted)]">
            {card.explanation}
          </p>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-muted)]">
            Referenced
          </div>
          <ul className="mb-3 flex flex-wrap gap-1.5">
            {card.metrics.map((m) => (
              <li
                key={m}
                className="rounded border border-dashed border-[color:var(--terminal-border)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--terminal-fg)]/90"
              >
                {m}
              </li>
            ))}
          </ul>
          <p className="border-t border-[color:var(--terminal-border)] pt-3 text-[11px] leading-snug text-[color:var(--terminal-muted)]">
            <span className="font-bold text-[color:var(--terminal-ochre)]">
              Market reasoning ·{" "}
            </span>
            {card.reasoning}
          </p>
        </motion.article>
      ))}
    </div>
  );
}
