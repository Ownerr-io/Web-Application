import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useIsDark } from "@/components/ThemeToggle";
import { formatCurrency, formatShortCurrency } from "@/lib/utils";
import type { TimeSeriesPoint } from "@/lib/mockMarketplaceService";

export function MarketplaceTrendChart({
  title,
  subtitle,
  points,
  mode = "currency",
}: {
  title: string;
  subtitle: string;
  points: TimeSeriesPoint[];
  mode?: "currency" | "number";
}) {
  const isDark = useIsDark();
  const gridStroke = isDark ? "#2a2a2a" : "#d4d4d8";
  const tickFill = isDark ? "#737373" : "#52525b";
  const latestValue = points.at(-1)?.value ?? 0;

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</div>
        <div className="text-2xl font-bold tabular-nums">
          {mode === "currency" ? formatCurrency(latestValue) : latestValue.toLocaleString("en-US")}
        </div>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="mt-4 h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`${title}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={gridStroke} strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: tickFill, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) =>
                mode === "currency" ? formatShortCurrency(Number(value)) : Number(value).toLocaleString("en-US")
              }
            />
            <Tooltip
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as TimeSeriesPoint | undefined;
                if (!active || !point) return null;
                return (
                  <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-xl">
                    <div className="font-bold text-foreground">{point.label}</div>
                    <div className="mt-1">
                      {mode === "currency" ? formatCurrency(point.value) : point.value.toLocaleString("en-US")}
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              fill={`url(#${title}-fill)`}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
