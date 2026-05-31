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
  Legend,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import type { NetworkCharts } from "@/lib/ownerr-network/adminMembersTypes";
import { BRAND_CHART_HSL } from "@/lib/brandChartColors";

const trendConfig = {
  count: { label: "Count", color: BRAND_CHART_HSL[0] },
  volume: { label: "Volume", color: BRAND_CHART_HSL[1] },
} satisfies ChartConfig;

const PIE_COLORS = [...BRAND_CHART_HSL];

function dayLabel(v: string): string {
  return v.length >= 10 ? v.slice(5, 10) : v;
}

export function NetworkDashboardCharts({
  charts,
}: {
  charts: NetworkCharts | null;
}) {
  if (!charts) return null;

  const hasAny =
    charts.signupsByDay.length > 0 ||
    charts.referralsByDay.length > 0 ||
    charts.walletVolumeByDay.length > 0 ||
    charts.referralStatusBreakdown.length > 0 ||
    charts.profileCompletionBuckets.length > 0;

  if (!hasAny) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {charts.signupsByDay.length > 0 ? (
          <Card className="brand-panel-card p-5 shadow-none">
            <p className="text-sm font-medium mb-4">New members (30d)</p>
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

        {charts.referralsByDay.length > 0 ? (
          <Card className="brand-panel-card p-5 shadow-none">
            <p className="text-sm font-medium mb-4">Referrals recorded (30d)</p>
            <ChartContainer config={trendConfig} className="h-[220px] w-full">
              <BarChart
                data={charts.referralsByDay.map((d) => ({
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
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {charts.referralStatusBreakdown.length > 0 ? (
          <Card className="brand-panel-card p-5 shadow-none">
            <p className="text-sm font-medium mb-4">Referral status</p>
            <ChartContainer
              config={trendConfig}
              className="mx-auto h-[200px] w-full"
            >
              <PieChart>
                <ChartTooltip
                  content={<ChartTooltipContent nameKey="name" />}
                />
                <Pie
                  data={charts.referralStatusBreakdown.map((s) => ({
                    name: s.status,
                    count: s.count,
                  }))}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={40}
                  outerRadius={70}
                >
                  {charts.referralStatusBreakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ChartContainer>
          </Card>
        ) : null}

        {charts.profileCompletionBuckets.length > 0 ? (
          <Card className="p-5 lg:col-span-2">
            <p className="text-sm font-medium mb-4">Profile completion (%)</p>
            <ChartContainer config={trendConfig} className="h-[200px] w-full">
              <BarChart
                data={charts.profileCompletionBuckets.map((b) => ({
                  name: b.bucket,
                  count: b.count,
                }))}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="name"
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
      </div>

      {charts.walletVolumeByDay.some((d) => d.volume !== 0) ? (
        <Card className="brand-panel-card p-5 shadow-none">
          <p className="text-sm font-medium mb-4">
            Wallet transaction volume (30d)
          </p>
          <ChartContainer config={trendConfig} className="h-[220px] w-full">
            <BarChart
              data={charts.walletVolumeByDay.map((d) => ({
                label: dayLabel(String(d.day)),
                volume: d.volume,
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
                width={40}
                tickLine={false}
                axisLine={false}
                fontSize={10}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="volume" fill="var(--color-volume)" radius={4} />
            </BarChart>
          </ChartContainer>
        </Card>
      ) : null}
    </div>
  );
}
