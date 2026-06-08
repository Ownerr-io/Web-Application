import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "buyer" | "founder" | "startup";

const LABEL: Record<Variant, string> = {
  buyer: "Verified Buyer",
  founder: "Verified Founder",
  startup: "Verified Startup",
};

export function VerificationBadge({
  variant,
  className,
  compact,
}: {
  variant: Variant;
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300",
        className,
      )}
    >
      <BadgeCheck className="h-3 w-3 shrink-0" aria-hidden />
      {compact
        ? variant === "buyer"
          ? "Buyer"
          : variant === "founder"
            ? "Founder"
            : "Startup"
        : LABEL[variant]}
    </span>
  );
}
