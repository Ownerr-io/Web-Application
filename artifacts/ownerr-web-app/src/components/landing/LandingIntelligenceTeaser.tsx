import { Link } from "wouter";
import { marketingRoutes } from "@/routes/marketingRoutes";
import { cn } from "@/lib/utils";

const SIGNALS = [
  { k: "M&A velocity", v: "↑ 6.2% q/q", tone: "lime" as const },
  { k: "AI deal heat", v: "High inflow", tone: "orange" as const },
  { k: "Multiple drift", v: "-0.4 turns", tone: "red" as const },
] as const;

const toneClass = {
  lime: "text-brand-lime",
  orange: "text-brand-orange",
  red: "text-brand-red",
} as const;

export function LandingIntelligenceTeaser() {
  return (
    <section className="rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/70 p-6 sm:p-8">
      <p className="terminal-eyebrow text-brand-orange">Market intelligence</p>
      <h2 className="mt-2 text-balance text-xl font-bold sm:text-2xl">
        Read the tape before you price
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[color:var(--terminal-muted)]">
        Sector multiples, bid depth, and cross-border flow — the same panels you
        get on the dedicated intelligence page, summarized here on the home
        terminal.
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-3">
        {SIGNALS.map((s) => (
          <li
            key={s.k}
            className="rounded-[8px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-bg)] px-4 py-3"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-muted)]">
              {s.k}
            </p>
            <p
              className={cn(
                "mt-1 font-mono text-sm font-bold",
                toneClass[s.tone],
              )}
            >
              {s.v}
            </p>
          </li>
        ))}
      </ul>
      <Link
        href={marketingRoutes.marketIntelligence}
        className="mt-6 inline-flex text-sm font-bold text-brand-lime hover:underline"
      >
        Open market intelligence
      </Link>
    </section>
  );
}
