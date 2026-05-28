import type { Startup } from "@/lib/mockData";
import { ensureStartupScores } from "@/lib/startupScores";
import { cn } from "@/lib/utils";

type Props = {
  startup: Startup;
  className?: string;
  /** Tight single row for listing cards. */
  compact?: boolean;
  /** `inline`: one horizontal strip (acquire cards). `grid`: three columns (default). */
  layout?: "grid" | "inline";
  /** Grid only: spell out score names (e.g. acquire listing cards). */
  fullScoreLabels?: boolean;
};

/** Business, Lend, and Acquisition power (0–100) — compact row for cards. */
export function StartupTripleScores({
  startup,
  className,
  compact = true,
  layout = "grid",
  fullScoreLabels = false,
}: Props) {
  const s = ensureStartupScores(startup);

  if (layout === "inline") {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-1 rounded-lg border border-border/70 bg-muted/25 px-2 py-1.5 font-mono text-[10px] border-border bg-muted/50",
          className,
        )}
      >
        <span className="min-w-0 shrink truncate">
          <span className="mp-label font-bold uppercase tracking-wide">
            Biz
          </span>{" "}
          <span className="mp-value font-bold tabular-nums">
            {s.businessScore}
          </span>
        </span>
        <span className="mp-muted shrink-0 opacity-40" aria-hidden>
          ·
        </span>
        <span className="min-w-0 shrink truncate text-center">
          <span className="mp-label font-bold uppercase tracking-wide">
            Lend
          </span>{" "}
          <span className="mp-value font-bold tabular-nums">{s.lendScore}</span>
        </span>
        <span className="mp-muted shrink-0 opacity-40" aria-hidden>
          ·
        </span>
        <span className="min-w-0 shrink truncate text-right">
          <span className="mp-label font-bold uppercase tracking-wide">
            Acq
          </span>{" "}
          <span className="mp-value font-bold tabular-nums">
            {s.acquisitionPower}
          </span>
        </span>
      </div>
    );
  }

  const gridLabelClass = cn(
    "mp-label font-bold",
    fullScoreLabels
      ? "mx-auto max-w-[22ch] text-[9px] leading-snug tracking-normal sm:text-[10px]"
      : cn(
          "uppercase tracking-wider",
          compact
            ? "text-[8px] leading-tight sm:text-[9px]"
            : "text-[9px] sm:text-[10px]",
        ),
  );

  return (
    <div
      className={cn(
        "grid grid-cols-3 gap-2",
        compact ? "text-center" : "",
        className,
      )}
    >
      <div className="min-w-0">
        <div className={gridLabelClass}>
          {fullScoreLabels ? "Business score" : "Business"}
        </div>
        <div
          className={cn(
            "mp-value font-mono tabular-nums",
            compact ? "mt-0.5 text-sm" : "mt-1 text-base",
          )}
        >
          {s.businessScore}
        </div>
      </div>
      <div className="min-w-0">
        <div className={gridLabelClass}>
          {fullScoreLabels ? "Lend score" : "Lend"}
        </div>
        <div
          className={cn(
            "mp-value font-mono tabular-nums",
            compact ? "mt-0.5 text-sm" : "mt-1 text-base",
          )}
        >
          {s.lendScore}
        </div>
      </div>
      <div className="min-w-0">
        <div className={gridLabelClass}>
          {fullScoreLabels ? "Acquisition power" : "Acq. power"}
        </div>
        <div
          className={cn(
            "mp-value font-mono tabular-nums",
            compact ? "mt-0.5 text-sm" : "mt-1 text-base",
          )}
        >
          {s.acquisitionPower}
        </div>
      </div>
    </div>
  );
}

/** Three stat cards for startup detail (matches other metric cards). */
export function StartupScoresDetailGrid({ startup }: { startup: Startup }) {
  const s = ensureStartupScores(startup);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-border bg-card p-5 text-center">
        <div className="mp-label text-[10px]">Business score</div>
        <div className="mp-value mt-2 text-2xl tabular-nums">
          {s.businessScore}
        </div>
        <p className="mp-body mt-1 text-xs">
          Revenue quality and momentum (0–100).
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-5 text-center">
        <div className="mp-label text-[10px]">Lend score</div>
        <div className="mp-value mt-2 text-2xl tabular-nums">{s.lendScore}</div>
        <p className="mp-body mt-1 text-xs">
          Lending / repayment capacity proxy (0–100).
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-5 text-center">
        <div className="mp-label text-[10px]">Acquisition power</div>
        <div className="mp-value mt-2 text-2xl tabular-nums">
          {s.acquisitionPower}
        </div>
        <p className="mp-body mt-1 text-xs">
          M&amp;A and buyer attractiveness (0–100).
        </p>
      </div>
    </div>
  );
}
