import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { AUTH_ROUTES } from "@/routing/routeRegistry";
import { persistGetStartedProduct } from "@/lib/auth/getStartedIntent";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "nav" | "hero";
};

export function OwnerrOsCtaButton({
  className,
  size = "md",
  variant = "hero",
}: Props) {
  const reduce = useReducedMotion();
  const [, setLocation] = useLocation();

  const sizeClass =
    size === "sm"
      ? "h-9 px-3 text-xs"
      : size === "lg"
        ? "h-12 px-6 text-sm md:h-13 md:text-base"
        : "h-10 px-4 text-xs sm:text-sm";

  return (
    <motion.button
      type="button"
      onClick={() => {
        persistGetStartedProduct("ownerr_os");
        setLocation(`${AUTH_ROUTES.start}?product=ownerr-os`);
      }}
      whileHover={reduce ? undefined : { scale: 1.02 }}
      whileTap={reduce ? undefined : { scale: 0.98 }}
      className={cn(
        "group relative inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden rounded-[10px] font-bold shadow-sm transition-colors",
        sizeClass,
        variant === "hero"
          ? "btn-platform-gradient text-[color:var(--terminal-fg)]"
          : "border border-[color:var(--terminal-ochre)]/50 bg-[color:var(--terminal-surface-2)] text-[color:var(--terminal-fg)] hover:border-[color:var(--terminal-ochre)]",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          background:
            "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)",
        }}
      />
      <Sparkles className="h-4 w-4 shrink-0 text-current" aria-hidden />
      <span className="relative tracking-wide">List on OWNERR OS</span>
    </motion.button>
  );
}
