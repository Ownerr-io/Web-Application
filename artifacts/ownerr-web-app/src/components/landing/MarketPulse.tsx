import { cn } from "@/lib/utils";

const ITEMS: { label: string; value: string }[] = [
  { label: "SaaS medians", value: "7.2x ARR · +0.3σ w/w" },
  { label: "Investor appetite", value: "62 IDX · soft bid" },
  { label: "Acquisition index", value: "118.4 · expansion" },
  { label: "AI vertical heat", value: "High · strategic" },
  { label: "Exit window", value: "Favorable · 90d" },
  { label: "ARR benchmarks", value: "$1–5M band tight" },
  { label: "Seed → Series A", value: "14% · rolling 8q" },
];

function Strip({ ariaHidden }: { ariaHidden?: boolean }) {
  return (
    <div
      className="flex shrink-0 items-center gap-2 px-1"
      aria-hidden={ariaHidden}
    >
      {ITEMS.map((it, i) => (
        <div
          key={`${it.label}-${i}`}
          className="inline-flex shrink-0 items-center gap-2 rounded-md border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)] px-3 py-1.5"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-muted)]">
            {it.label}
          </span>
          <span className="text-[11px] font-bold tabular-nums text-[color:var(--terminal-ochre)]">
            {it.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Bottom strip inside the hero — full viewport width marquee. */
export function HeroMarketPulseStrip({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-full shrink-0 border-t border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface-2)] py-2 md:py-2.5",
        className,
      )}
      role="region"
      aria-label="Market pulse"
    >
      <div className="w-full min-w-0 overflow-hidden">
        <div className="market-pulse-marquee flex w-max">
          <Strip />
          <Strip ariaHidden />
        </div>
      </div>
    </div>
  );
}

/** Full-bleed strip (e.g. reuse outside hero). */
export function MarketPulse() {
  return (
    <div
      className="border-y border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface-2)] py-2"
      role="region"
      aria-label="Market pulse"
    >
      <div className="relative overflow-hidden">
        <div className="market-pulse-marquee flex w-max">
          <Strip />
          <Strip ariaHidden />
        </div>
      </div>
    </div>
  );
}
