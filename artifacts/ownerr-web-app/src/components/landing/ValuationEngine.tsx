import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_VALUATION_INPUTS,
  type FounderGoal,
  type ValuationInputs,
  computeValuationIntel,
} from "@/lib/valuationIntel";
import { formatShortCurrency, cn } from "@/lib/utils";

const INDUSTRIES = [
  "SaaS",
  "AI",
  "Fintech",
  "Consumer",
  "DevTools",
  "Healthcare",
  "Other",
] as const;
const STAGES = ["Pre-seed", "Seed", "Series A", "Series B", "Growth"] as const;
const GEO = [
  "United States",
  "Europe",
  "UK",
  "Asia",
  "LATAM",
  "Global remote",
] as const;

function num(v: string, fallback: number): number {
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

type Props = {
  /** Controlled inputs — when both are set, internal state is disabled (e.g. `/valuation` insights sync). */
  value?: ValuationInputs;
  onChange?: (next: ValuationInputs) => void;
};

export function ValuationEngine({ value, onChange }: Props) {
  const reduceMotion = useReducedMotion();
  const reduce = Boolean(reduceMotion);
  const [internal, setInternal] = useState<ValuationInputs>(
    DEFAULT_VALUATION_INPUTS,
  );
  const controlled = value !== undefined && typeof onChange === "function";
  const i = controlled ? value! : internal;

  const update = useCallback(
    (fn: (prev: ValuationInputs) => ValuationInputs) => {
      const base = controlled ? value! : internal;
      const next = fn(base);
      if (controlled) onChange!(next);
      else setInternal(next);
    },
    [controlled, value, internal, onChange],
  );

  const out = useMemo(() => computeValuationIntel(i), [i]);

  const inputSig = useMemo(() => JSON.stringify(i), [i]);
  const skipFirstSig = useRef(true);
  const [recalcPulse, setRecalcPulse] = useState(0);
  useEffect(() => {
    if (skipFirstSig.current) {
      skipFirstSig.current = false;
      return;
    }
    setRecalcPulse((n) => n + 1);
  }, [inputSig]);

  const pad = "p-5 sm:p-6";

  return (
    <div className={cnShell()}>
      <div
        className={`border-b border-[color:var(--terminal-border)] px-4 py-3 ${pad}`}
      >
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-[color:var(--terminal-muted)]">
          Valuation engine
        </h2>
        <p className="mt-1 text-xs text-[color:var(--terminal-muted)]">
          Inputs stream through a private scenario model — outputs are
          illustrative, not a fairness opinion.
        </p>
      </div>
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div
          className={`space-y-4 border-[color:var(--terminal-border)] lg:border-r ${pad}`}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="MRR ($)">
              <Input
                inputMode="decimal"
                className="font-mono text-xs"
                value={i.mrr || ""}
                onChange={(e) =>
                  update((s) => ({ ...s, mrr: num(e.target.value, s.mrr) }))
                }
              />
            </Field>
            <Field label="ARR ($)">
              <Input
                inputMode="decimal"
                placeholder="0 = derive from MRR"
                className="font-mono text-xs"
                value={i.arr || ""}
                onChange={(e) =>
                  update((s) => ({ ...s, arr: num(e.target.value, 0) }))
                }
              />
            </Field>
            <Field label="Profit margin %">
              <Input
                inputMode="decimal"
                className="font-mono text-xs"
                value={i.profitMarginPct}
                onChange={(e) =>
                  update((s) => ({
                    ...s,
                    profitMarginPct: num(e.target.value, s.profitMarginPct),
                  }))
                }
              />
            </Field>
            <Field label="Operating expenses / mo ($)">
              <Input
                inputMode="decimal"
                className="font-mono text-xs"
                value={i.operatingExpensesMonthly}
                onChange={(e) =>
                  update((s) => ({
                    ...s,
                    operatingExpensesMonthly: num(
                      e.target.value,
                      s.operatingExpensesMonthly,
                    ),
                  }))
                }
              />
            </Field>
            <Field label="Monthly growth %">
              <Input
                inputMode="decimal"
                className="font-mono text-xs"
                value={i.monthlyGrowthPct}
                onChange={(e) =>
                  update((s) => ({
                    ...s,
                    monthlyGrowthPct: num(e.target.value, s.monthlyGrowthPct),
                  }))
                }
              />
            </Field>
            <Field label="Churn % (monthly)">
              <Input
                inputMode="decimal"
                className="font-mono text-xs"
                value={i.churnPctMonthly}
                onChange={(e) =>
                  update((s) => ({
                    ...s,
                    churnPctMonthly: num(e.target.value, s.churnPctMonthly),
                  }))
                }
              />
            </Field>
            <Field label="CAC ($)">
              <Input
                inputMode="decimal"
                className="font-mono text-xs"
                value={i.cac}
                onChange={(e) =>
                  update((s) => ({ ...s, cac: num(e.target.value, s.cac) }))
                }
              />
            </Field>
            <Field label="LTV ($)">
              <Input
                inputMode="decimal"
                className="font-mono text-xs"
                value={i.ltv}
                onChange={(e) =>
                  update((s) => ({ ...s, ltv: num(e.target.value, s.ltv) }))
                }
              />
            </Field>
            <Field label="Burn multiple">
              <Input
                inputMode="decimal"
                className="font-mono text-xs"
                value={i.burnMultiple}
                onChange={(e) =>
                  update((s) => ({
                    ...s,
                    burnMultiple: num(e.target.value, s.burnMultiple),
                  }))
                }
              />
            </Field>
            <Field label="Runway (months)">
              <Input
                inputMode="decimal"
                className="font-mono text-xs"
                value={i.runwayMonths}
                onChange={(e) =>
                  update((s) => ({
                    ...s,
                    runwayMonths: num(e.target.value, s.runwayMonths),
                  }))
                }
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Industry">
              <Select
                value={i.industry}
                onValueChange={(v) => update((s) => ({ ...s, industry: v }))}
              >
                <SelectTrigger className="font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((x) => (
                    <SelectItem key={x} value={x} className="font-mono text-xs">
                      {x}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Stage">
              <Select
                value={i.stage}
                onValueChange={(v) => update((s) => ({ ...s, stage: v }))}
              >
                <SelectTrigger className="font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((x) => (
                    <SelectItem key={x} value={x} className="font-mono text-xs">
                      {x}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Geography">
              <Select
                value={i.geography}
                onValueChange={(v) => update((s) => ({ ...s, geography: v }))}
              >
                <SelectTrigger className="font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GEO.map((x) => (
                    <SelectItem key={x} value={x} className="font-mono text-xs">
                      {x}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Founder goal">
              <Select
                value={i.founderGoal}
                onValueChange={(v) =>
                  update((s) => ({ ...s, founderGoal: v as FounderGoal }))
                }
              >
                <SelectTrigger className="font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unsure" className="font-mono text-xs">
                    Unsure
                  </SelectItem>
                  <SelectItem value="exit" className="font-mono text-xs">
                    Exit
                  </SelectItem>
                  <SelectItem value="raise" className="font-mono text-xs">
                    Raise
                  </SelectItem>
                  <SelectItem value="hold" className="font-mono text-xs">
                    Hold / compound
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>

        <motion.div
          className={cn("space-y-4", pad, "bg-[color:var(--terminal-bg)]")}
          animate={
            reduce || recalcPulse === 0
              ? undefined
              : {
                  boxShadow: [
                    "inset 0 0 0 0 rgba(189,252,115,0)",
                    "inset 0 0 0 1px rgba(189,252,115,0.5)",
                    "inset 0 0 0 0 rgba(189,252,115,0)",
                  ],
                }
          }
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-muted)]">
              Output stream
            </div>
            {!reduce ? (
              <span className="inline-flex items-center gap-1.5 rounded border border-dashed border-[color:var(--terminal-border)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[color:var(--terminal-muted)] tabular-nums">
                <motion.span
                  className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--terminal-ochre)]"
                  animate={
                    recalcPulse > 0
                      ? { scale: [1, 1.45, 1], opacity: [1, 0.75, 1] }
                      : { scale: 1, opacity: 1 }
                  }
                  transition={{ duration: 0.45, ease: "easeOut" }}
                />
                Live model
              </span>
            ) : null}
          </div>
          {recalcPulse > 0 && !reduce ? (
            <div className="h-1 overflow-hidden rounded-full bg-[color:var(--terminal-border)]">
              <motion.div
                key={recalcPulse}
                className="h-full origin-left bg-[color:var(--terminal-ochre)]"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: "0% 50%" }}
              />
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Out
              label="Estimated valuation"
              value={formatShortCurrency(out.estimatedValuation)}
              accent
              reduce={reduce}
              emphasizeValues
            />
            <Out
              label="Investor interest"
              value={`${out.investorInterest} / 100`}
              reduce={reduce}
              emphasizeValues
            />
            <Out
              label="Acquisition heat"
              value={`${out.acquisitionHeat} / 100`}
              reduce={reduce}
              emphasizeValues
            />
            <Out
              label="Market timing"
              value={out.marketTiming}
              wide
              reduce={reduce}
              emphasizeValues
            />
            <Out
              label="Growth quality"
              value={`${out.growthQuality} / 100`}
              reduce={reduce}
              emphasizeValues
            />
            <Out
              label="Revenue stability"
              value={`${out.revenueStability} / 100`}
              reduce={reduce}
              emphasizeValues
            />
            <Out
              label="Liquidity signal"
              value={out.liquiditySignal}
              wide
              reduce={reduce}
              emphasizeValues
            />
            <Out
              label="Confidence %"
              value={`${out.confidencePct}%`}
              reduce={reduce}
              emphasizeValues
            />
            <Out
              label="Suggested timeline"
              value={out.suggestedTimeline}
              wide
              reduce={reduce}
              emphasizeValues
            />
          </div>
          <div className="rounded-[8px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)] p-3 text-xs leading-snug text-[color:var(--terminal-muted)]">
            <span className="font-bold text-[color:var(--terminal-ochre)]">
              REC ·{" "}
            </span>
            {out.strategicRecommendation}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function cnShell() {
  return "min-w-0 overflow-x-auto rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)] shadow-sm";
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-muted)]">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Out({
  label,
  value,
  accent,
  wide,
  reduce,
  emphasizeValues,
}: {
  label: string;
  value: string;
  accent?: boolean;
  wide?: boolean;
  reduce: boolean;
  emphasizeValues?: boolean;
}) {
  const shell =
    "border-[color:var(--terminal-border)] bg-[color:var(--terminal-bg)]";
  const valueCls = accent
    ? "text-[color:var(--terminal-ochre)]"
    : "text-[color:var(--terminal-fg)]/90";

  const valueNode =
    emphasizeValues && !reduce ? (
      <motion.div
        key={value}
        layout="position"
        initial={{ scale: 0.96, opacity: 0.65 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 520, damping: 34, mass: 0.65 }}
        className={cn(
          "mt-1 font-mono text-sm font-bold tabular-nums",
          valueCls,
        )}
      >
        {value}
      </motion.div>
    ) : (
      <div
        className={cn(
          "mt-1 font-mono text-sm font-bold tabular-nums",
          valueCls,
        )}
      >
        {value}
      </div>
    );

  return (
    <div
      className={cn(
        wide ? "sm:col-span-2" : "",
        "rounded-[8px] border px-3 py-2",
        shell,
      )}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-muted)]">
        {label}
      </div>
      {valueNode}
    </div>
  );
}
