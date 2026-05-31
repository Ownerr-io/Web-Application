import { Card } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import type { OwnerrOsCharts } from "@/lib/ownerr-os/adminFoundersTypes";
import { BRAND_CHART_HSL } from "@/lib/brandChartColors";

const trendConfig = {
  count: { label: "Count", color: BRAND_CHART_HSL[0] },
} satisfies ChartConfig;

const PIE_COLORS = [...BRAND_CHART_HSL];

function dayLabel(v: string): string {
  return v.length >= 10 ? v.slice(5, 10) : v;
}

export function OwnerrOsDashboardCharts({
  charts,
}: {
  charts: OwnerrOsCharts | null;
}) {
  if (!charts) return null;

  const hasAny =
    charts.submissionsByDay.length > 0 ||
    charts.visitsByDay.length > 0 ||
    charts.signupsByDay.length > 0 ||
    charts.trafficSources.length > 0 ||
    charts.listingStatusBreakdown.length > 0;

  if (!hasAny) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {charts.submissionsByDay.length > 0 ? (
          <Card className="brand-panel-card p-5 shadow-none">
            <p className="text-sm font-medium mb-4">
              Founder submissions (30d)
            </p>
            <ChartContainer config={trendConfig} className="h-[220px] w-full">
              <BarChart
                data={charts.submissionsByDay.map((d) => ({
                  label: dayLabel(String(d.day)),
                  count: d.count,
                }))}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                />
                <YAxis
                  width={32}
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
              </BarChart>
            </ChartContainer>
          </Card>
        ) : null}

        {charts.visitsByDay.length > 0 ? (
          <Card className="brand-panel-card p-5 shadow-none">
            <p className="text-sm font-medium mb-4">Referral visits (30d)</p>
            <ChartContainer config={trendConfig} className="h-[220px] w-full">
              <BarChart
                data={charts.visitsByDay.map((d) => ({
                  label: dayLabel(String(d.day)),
                  count: d.count,
                }))}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                />
                <YAxis
                  width={32}
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
              </BarChart>
            </ChartContainer>
          </Card>
        ) : null}

        {charts.signupsByDay.length > 0 ? (
          <Card className="brand-panel-card p-5 shadow-none">
            <p className="text-sm font-medium mb-4">Referral signups (30d)</p>
            <ChartContainer config={trendConfig} className="h-[220px] w-full">
              <BarChart
                data={charts.signupsByDay.map((d) => ({
                  label: dayLabel(String(d.day)),
                  count: d.count,
                }))}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                />
                <YAxis
                  width={32}
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
              </BarChart>
            </ChartContainer>
          </Card>
        ) : null}

        {charts.trafficSources.length > 0 ? (
          <Card className="brand-panel-card p-5 shadow-none">
            <p className="text-sm font-medium mb-4">Traffic sources</p>
            <ChartContainer config={trendConfig} className="h-[220px] w-full">
              <PieChart>
                <Pie
                  data={charts.trafficSources}
                  dataKey="count"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ source, count }) => `${source} (${count})`}
                >
                  {charts.trafficSources.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </Card>
        ) : null}

        {charts.listingStatusBreakdown.length > 0 ? (
          <Card className="brand-panel-card p-5 shadow-none">
            <p className="text-sm font-medium mb-4">
              OS catalog listings by status
            </p>
            <ChartContainer config={trendConfig} className="h-[220px] w-full">
              <BarChart
                data={charts.listingStatusBreakdown.map((d) => ({
                  label: d.status,
                  count: d.count,
                }))}
                layout="vertical"
                margin={{ left: 8 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={72}
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
              </BarChart>
            </ChartContainer>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
