import type { ListingVerificationGates } from "@/lib/intelligence/listingVerificationApi";
import {
  MANDATORY_VERIFICATION_GATE_ROWS,
  summarizeVerificationGates,
} from "@/lib/marketplace/verificationDesk";
import { CheckCircle2, CircleDashed, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  gates: ListingVerificationGates;
  className?: string;
};

function Row({
  icon: Icon,
  tone,
  title,
  items,
}: {
  icon: typeof CheckCircle2;
  tone: "ok" | "bad" | "pending";
  title: string;
  items: { label: string; detail?: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          "flex items-center gap-2 text-xs font-semibold uppercase tracking-wide",
          tone === "ok" && "text-emerald-700 dark:text-emerald-400",
          tone === "bad" && "text-destructive",
          tone === "pending" && "text-muted-foreground",
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {title}
      </div>
      <ul className="space-y-1 pl-5 text-sm">
        {items.map((item) => (
          <li key={item.label} className="text-foreground/90">
            <span className="font-medium">{item.label}</span>
            {item.detail ? (
              <span className="text-muted-foreground"> — {item.detail}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function VerificationGateSummary({ gates, className }: Props) {
  const summary = summarizeVerificationGates(gates);

  return (
    <div
      className={cn(
        "rounded-lg border border-border/80 bg-background/60 p-4 space-y-4",
        className,
      )}
    >
      <p className="text-sm font-medium">Checklist status</p>
      <Row
        icon={CheckCircle2}
        tone="ok"
        title="Verified"
        items={summary.verified}
      />
      <Row icon={XCircle} tone="bad" title="Needs fix" items={summary.failed} />
      <Row
        icon={CircleDashed}
        tone="pending"
        title="Still to do"
        items={summary.pending}
      />
      {summary.verified.length === MANDATORY_VERIFICATION_GATE_ROWS.length ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          All checks passed — your listing will publish automatically when
          processing finishes.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Only incomplete or failed steps are shown below. Verified steps stay
          saved — you do not need to re-enter them.
        </p>
      )}
    </div>
  );
}
