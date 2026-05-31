import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { BRAND_CHART_HSL } from "@/lib/brandChartColors";
import type { FunnelStage } from "@/lib/admin/summaryTypes";

export function AdminSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-brand-orange">{title}</h3>
        {description ? (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function AdminTodoPanel({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <Alert className="brand-todo-panel">
      <AlertTitle className="text-brand-orange">{title}</AlertTitle>
      <AlertDescription>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

function funnelConversion(current: number, previous: number): string | null {
  if (previous <= 0) return null;
  const pct = Math.round((current / previous) * 100);
  return `${pct}% of prior stage`;
}

export function AdminFunnel({ stages }: { stages: FunnelStage[] }) {
  if (!stages.length) return null;
  return (
    <div className="space-y-2">
      {stages.map((stage, i) => {
        const prev = stages[i - 1]?.count ?? 0;
        const hint = i > 0 ? funnelConversion(stage.count, prev) : null;
        return (
          <div key={stage.stage} className="flex flex-col gap-1">
            <div
              className={cn(
                "brand-funnel-step flex items-center justify-between rounded-lg px-4 py-3 text-sm",
                i % 3 === 0 && "brand-funnel-step--0",
                i % 3 === 1 && "brand-funnel-step--1",
                i % 3 === 2 && "brand-funnel-step--2",
                i >= 3 && "brand-funnel-step--n",
              )}
            >
              <span className="font-medium capitalize">
                {stage.stage.replace(/([A-Z])/g, " $1").trim()}
              </span>
              <span className="tabular-nums font-semibold text-brand-lime">
                {stage.count.toLocaleString()}
              </span>
            </div>
            {hint ? (
              <p className="text-center text-[10px] text-muted-foreground">
                ↓ {hint}
              </p>
            ) : null}
            {stage.note ? (
              <p className="text-[10px] text-muted-foreground px-1">
                {stage.note}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function AdminBarTrend({
  title,
  points,
  xKey,
  yKey,
}: {
  title: string;
  points: Record<string, string | number>[];
  xKey: string;
  yKey: string;
}) {
  if (!points.length) {
    return (
      <Card className="brand-panel-card p-5 shadow-none">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-2 text-xs text-muted-foreground">No trend data yet.</p>
      </Card>
    );
  }

  const chartConfig = {
    [yKey]: {
      label: yKey === "count" ? "Count" : yKey,
      color: BRAND_CHART_HSL[0],
    },
  } satisfies ChartConfig;

  return (
    <Card className="brand-panel-card brand-chart-card p-5 shadow-none">
      <p className="text-sm font-medium mb-4">{title}</p>
      <ChartContainer config={chartConfig} className="h-[220px] w-full">
        <BarChart
          data={points}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 10 }}
            tickFormatter={(v) =>
              typeof v === "string" && v.length > 6 ? v.slice(5) : String(v)
            }
          />
          <YAxis tick={{ fontSize: 10 }} width={36} />
          <ChartTooltip
            cursor={{
              fill: "color-mix(in srgb, var(--brand-lime) 12%, transparent)",
            }}
            content={
              <ChartTooltipContent
                className="border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)] text-foreground shadow-lg"
                labelClassName="text-foreground"
              />
            }
          />
          <Bar
            dataKey={yKey}
            fill={`var(--color-${yKey})`}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
    </Card>
  );
}

export function AdminLeaderboard({
  title,
  rows,
  valueLabel = "Count",
}: {
  title: string;
  rows: { label: string; value: number }[];
  valueLabel?: string;
}) {
  if (!rows.length) return null;
  return (
    <Card className="brand-panel-card p-5 shadow-none">
      <p className="text-sm font-medium mb-3">{title}</p>
      <ul className="divide-y text-sm">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between py-2 first:pt-0"
          >
            <span className="truncate text-muted-foreground pr-2">
              {row.label}
            </span>
            <span className="shrink-0 font-medium tabular-nums brand-leaderboard-value">
              {row.value.toLocaleString()} {valueLabel !== "Count" ? "" : ""}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function AdminCompactTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: (string | number)[][];
}) {
  if (!rows.length) return null;
  return (
    <Card className="brand-panel-card overflow-hidden shadow-none">
      <div className="border-b border-[color:var(--terminal-border)] px-4 py-3">
        <p className="text-sm font-medium text-brand-lime">{title}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b brand-table-head">
              {columns.map((c) => (
                <th
                  key={c}
                  className={cn(
                    "px-3 py-2 text-left font-medium text-muted-foreground",
                    c !== columns[0] && "text-right",
                  )}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b last:border-0">
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={cn(
                      "px-3 py-2 tabular-nums",
                      j > 0 && "text-right",
                      j === 0 && "font-medium max-w-[200px] truncate",
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function AdminActivityFeed({
  items,
}: {
  items: { type: string; at: string; label: string }[];
}) {
  if (!items.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No recent activity in database.
      </p>
    );
  }
  return (
    <ul className="brand-breakdown-list divide-y rounded-lg">
      {items.map((item, i) => (
        <li key={`${item.type}-${item.at}-${i}`} className="px-4 py-3 text-sm">
          <p className="font-medium">{item.type.replace(/_/g, " ")}</p>
          <p className="text-xs text-muted-foreground truncate">{item.label}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {new Date(item.at).toLocaleString()}
          </p>
        </li>
      ))}
    </ul>
  );
}
