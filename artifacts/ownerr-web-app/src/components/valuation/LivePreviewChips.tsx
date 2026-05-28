import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { PreviewChip } from "./previewInsights";

type Props = {
  chips: PreviewChip[];
};

const toneCls: Record<PreviewChip["tone"], string> = {
  positive: "text-[color:var(--terminal-lime)]",
  neutral: "text-[color:var(--terminal-muted)]",
  caution: "text-[color:var(--terminal-ochre)]",
};

export function LivePreviewChips({ chips }: Props) {
  const reduce = useReducedMotion();
  if (chips.length === 0) return null;

  return (
    <ul className="space-y-1 text-center sm:space-y-1.5" aria-live="polite">
      {chips.map((chip, idx) => (
        <motion.li
          key={chip.id}
          initial={reduce ? false : { opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.32, delay: reduce ? 0 : idx * 0.05 }}
          className={cn(
            "text-pretty text-[11px] font-medium leading-snug tracking-wide sm:text-sm",
            toneCls[chip.tone],
          )}
        >
          <span className="mr-2 opacity-50">—</span>
          {chip.label}
        </motion.li>
      ))}
    </ul>
  );
}
