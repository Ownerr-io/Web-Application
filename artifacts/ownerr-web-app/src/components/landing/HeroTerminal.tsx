import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { marketplacePath } from "@/lib/appPaths";
import { marketingRoutes } from "@/routes/marketingRoutes";
import { cn } from "@/lib/utils";
import { HeroMarketPulseStrip } from "@/components/landing/MarketPulse";
import { OwnerrOsCtaButton } from "@/components/founder-os/OwnerrOsCtaButton";

type PulseRow = { label: string; value: string; heat: "low" | "mid" | "high" };

const DEMO_ROWS: PulseRow[] = [
  { label: "ACQ_HEAT", value: "0.74σ", heat: "high" },
  { label: "INV_APPETITE", value: "62 / 100", heat: "mid" },
  { label: "EXIT_WINDOW", value: "Favorable · 90d", heat: "high" },
  { label: "CONF_BAND", value: "±8.4%", heat: "low" },
  { label: "LIQUIDITY", value: "Strategic bid depth ↑", heat: "mid" },
];

function heatDot(heat: PulseRow["heat"]) {
  return cn(
    "h-1.5 w-1.5 rounded-full",
    heat === "high" &&
      "bg-[color:var(--brand-lime)] shadow-[0_0_10px_color-mix(in_srgb,var(--brand-lime)_45%,transparent)]",
    heat === "mid" && "bg-[color:var(--brand-orange)]",
    heat === "low" && "bg-[color:var(--terminal-muted)]",
  );
}

export function HeroTerminal() {
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 2600);
    return () => window.clearInterval(id);
  }, [reduce]);

  const liveMetrics = useMemo(() => {
    const nudge = reduce ? 0 : (tick % 5) * 0.12;
    return [
      { k: "IMPLIED_ARR", v: `$${(4.2 + nudge).toFixed(1)}M` },
      { k: "NET_REV_RET", v: `${(108.4 + nudge).toFixed(1)}%` },
      { k: "RULE_OF_40", v: `${(41 + nudge * 3).toFixed(0)}` },
    ];
  }, [tick, reduce]);

  return (
    <section className="relative flex min-h-[calc(100svh-3.25rem)] flex-col overflow-hidden border-b border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)] pb-[env(safe-area-inset-bottom,0px)] sm:min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4.5rem)]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 85% 0%, color-mix(in srgb, var(--brand-lime) 18%, transparent), transparent 55%), radial-gradient(ellipse 70% 50% at 10% 100%, color-mix(in srgb, var(--brand-red) 12%, transparent), transparent 50%), var(--platform-gradient-soft)",
        }}
      />
      <div className="relative flex flex-1 flex-col justify-center px-4 py-6 pb-8 sm:py-8 md:py-12 lg:py-14">
        <div className="mx-auto grid w-full max-w-[1200px] gap-6 md:grid-cols-[1fr_minmax(0,1.08fr)] md:items-center md:gap-10 lg:gap-12">
          <div className="min-w-0 space-y-5 md:space-y-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-lime md:text-xs">
              Ownerr · Platform terminal
            </p>
            <h1 className="text-balance text-3xl font-bold leading-[1.06] tracking-tight sm:text-4xl md:text-[2.5rem] lg:text-[2.85rem]">
              <span className="text-[color:var(--terminal-display)]">
                Valuation intelligence
              </span>
              <span className="mt-1 block platform-gradient-text">
                for operators who execute
              </span>
            </h1>
            <p className="max-w-xl text-sm font-bold text-[color:var(--terminal-muted)] sm:text-base md:text-lg">
              Know whether to <span className="text-brand-lime">sell</span>,{" "}
              <span className="text-brand-orange">hold</span>, or{" "}
              <span className="text-brand-red">raise</span>
              {" — "}before the market decides for you.
            </p>
            <p className="max-w-xl text-xs leading-relaxed text-[color:var(--terminal-muted)] sm:text-sm">
              One OWNERR platform: scenario valuation, live market intelligence,
              acquisition marketplace, Founder OS viral loop, and Unemployed
              Network — unified navigation, shared brand palette from our logo
              (lime · orange · red).
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <OwnerrOsCtaButton
                size="lg"
                variant="hero"
                className="w-full sm:w-auto"
              />
              <Button
                asChild
                className="btn-platform-gradient h-11 rounded-[10px] px-5 text-sm font-bold md:h-12 md:px-6"
              >
                <Link href={marketingRoutes.valuation}>Run Valuation</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-[10px] border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface-2)] px-5 text-sm font-bold text-[color:var(--terminal-fg)] hover:bg-[color:var(--terminal-surface)] md:h-12 md:px-6"
              >
                <Link href={marketplacePath("/acquire")}>
                  Enter Marketplace
                </Link>
              </Button>
            </div>
          </div>

          <div className="min-w-0">
            <div className="platform-gradient-border flex min-h-[13rem] flex-col rounded-[12px] shadow-[var(--platform-glow)] sm:min-h-[14rem] md:min-h-[15rem]">
              <div className="flex min-h-0 flex-1 flex-col rounded-[11px] bg-[color:var(--terminal-bg)]">
                <div className="flex items-center justify-between border-b border-[color:var(--terminal-border)] px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-muted)] md:px-5 md:py-3 md:text-[11px]">
                  <span className="tabular-nums">
                    session_{reduce ? "static" : "live"}
                  </span>
                  <span className="flex items-center gap-1.5 text-[color:var(--terminal-fg)]">
                    <span
                      className={cn(
                        "inline-block h-2 w-2 rounded-full bg-[color:var(--brand-lime)]",
                        !reduce && "animate-pulse",
                      )}
                    />
                    MARKET_PULSE
                  </span>
                </div>
                <div className="grid min-h-0 flex-1 gap-0 font-mono text-[11px] sm:text-xs md:grid-cols-2 md:text-[13px]">
                  <div className="border-b border-[color:var(--terminal-border)] p-4 md:border-r md:p-5">
                    <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-muted)]">
                      Live metrics
                    </div>
                    <ul className="space-y-2.5">
                      {liveMetrics.map((m) => (
                        <li
                          key={m.k}
                          className="flex items-center justify-between gap-3"
                        >
                          <span className="text-[color:var(--terminal-muted)]">
                            {m.k}
                          </span>
                          <motion.span
                            key={m.v}
                            initial={reduce ? false : { opacity: 0.35 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.35 }}
                            className="font-bold tabular-nums text-brand-orange"
                          >
                            {m.v}
                          </motion.span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 md:p-5">
                    <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-muted)]">
                      Acquisition intelligence
                    </div>
                    <ul className="space-y-2">
                      {DEMO_ROWS.map((row) => (
                        <li
                          key={row.label}
                          className="flex items-center justify-between gap-2 border-b border-dashed border-[color:var(--terminal-border)] py-1.5 last:border-0"
                        >
                          <span className="flex min-w-0 items-center gap-2 text-[color:var(--terminal-muted)]">
                            <span className={heatDot(row.heat)} aria-hidden />
                            <span className="truncate">{row.label}</span>
                          </span>
                          <span className="shrink-0 font-bold tabular-nums text-brand-orange">
                            {row.value}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="border-t border-[color:var(--terminal-border)] px-4 py-2.5 text-[10px] text-[color:var(--terminal-muted)] md:px-5 md:py-3 md:text-[11px]">
                  <span className="inline-block align-middle">
                    <span
                      className={cn(
                        "mr-1 inline-block h-3 w-1.5 bg-[color:var(--brand-orange)]",
                        !reduce && "animate-pulse",
                      )}
                    />
                  </span>
                  Awaiting your parameters — model outputs refresh on edit.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <HeroMarketPulseStrip className="mt-auto" />
    </section>
  );
}
