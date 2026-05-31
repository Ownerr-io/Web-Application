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
import type { AdminMarketplaceSummary } from "@/lib/admin/summaryTypes";
import type { MarketplaceCharts } from "@/lib/marketplace/adminParticipantsTypes";
import { BRAND_CHART_HSL } from "@/lib/brandChartColors";

const pipelineConfig = {
  count: { label: "Deals", color: BRAND_CHART_HSL[0] },
} satisfies ChartConfig;

const trendConfig = {
  count: { label: "Count", color: BRAND_CHART_HSL[1] },
} satisfies ChartConfig;

const funnelConfig = {
  count: { label: "Stage volume", color: BRAND_CHART_HSL[2] },
} satisfies ChartConfig;

const PIE_COLORS = [...BRAND_CHART_HSL];

function formatDay(v: string): string {
  if (v.length >= 10) return v.slice(5, 10);
  return v;
}

type Props = {
  summary: AdminMarketplaceSummary;
  charts: MarketplaceCharts | null | undefined;
};

export function MarketplaceDashboardCharts({ summary, charts }: Props) {
  const pipeline = summary.dealPipeline ?? [];
  const industry = summary.industryAnalytics ?? [];
  const funnelData = (
    charts?.funnel?.length ? charts.funnel : (summary.funnel ?? [])
  ).map((s) => ({
    name: s.stage.replace(/([A-Z])/g, " $1").trim(),
    count: s.count,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {charts?.interestsByDay?.length ? (
          <Card className="brand-panel-card p-5 shadow-none">
            <p className="text-sm font-medium mb-4">
              Interests over time (30d)
            </p>
            <ChartContainer config={trendConfig} className="h-[240px] w-full">
              <BarChart
                data={charts.interestsByDay.map((d) => ({
                  label: formatDay(String(d.day)),
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

        {charts?.bidsByDay?.length ? (
          <Card className="brand-panel-card p-5 shadow-none">
            <p className="text-sm font-medium mb-4">Bids over time (30d)</p>
            <ChartContainer config={trendConfig} className="h-[240px] w-full">
              <BarChart
                data={charts.bidsByDay.map((d) => ({
                  label: formatDay(String(d.day)),
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

      <div className="grid gap-6 lg:grid-cols-2">
        {pipeline.length > 0 ? (
          <Card className="brand-panel-card p-5 shadow-none">
            <p className="text-sm font-medium mb-4">Deal pipeline by stage</p>
            <ChartContainer
              config={pipelineConfig}
              className="h-[240px] w-full"
            >
              <BarChart
                data={pipeline.map((p) => ({ name: p.status, count: p.count }))}
                layout="vertical"
                margin={{ left: 8 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={88}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
              </BarChart>
            </ChartContainer>
          </Card>
        ) : null}

        {(charts?.listingStatusBreakdown?.length ?? 0) > 0 ? (
          <Card className="brand-panel-card p-5 shadow-none">
            <p className="text-sm font-medium mb-4">Listings by status</p>
            <ChartContainer
              config={pipelineConfig}
              className="mx-auto h-[240px] w-full max-w-sm"
            >
              <PieChart>
                <ChartTooltip
                  content={<ChartTooltipContent nameKey="name" />}
                />
                <Pie
                  data={charts!.listingStatusBreakdown.map((s) => ({
                    name: s.status,
                    count: s.count,
                  }))}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {charts!.listingStatusBreakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ChartContainer>
          </Card>
        ) : null}
      </div>

      {funnelData.length > 0 ? (
        <Card className="brand-panel-card p-5 shadow-none">
          <p className="text-sm font-medium mb-4">Marketplace funnel</p>
          <ChartContainer config={funnelConfig} className="h-[260px] w-full">
            <BarChart data={funnelData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                fontSize={10}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={56}
              />
              <YAxis
                width={40}
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

      {industry.length > 0 ? (
        <Card className="brand-panel-card p-5 shadow-none">
          <p className="text-sm font-medium mb-4">Industry interest volume</p>
          <ChartContainer config={trendConfig} className="h-[280px] w-full">
            <BarChart
              data={industry.slice(0, 10).map((i) => ({
                name:
                  i.industry.length > 14
                    ? `${i.industry.slice(0, 14)}…`
                    : i.industry,
                interests: i.interestCount,
                bids: i.bidCount,
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
                width={36}
                tickLine={false}
                axisLine={false}
                fontSize={10}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar
                dataKey="interests"
                fill={BRAND_CHART_HSL[0]}
                radius={4}
                name="Interests"
              />
              <Bar
                dataKey="bids"
                fill={BRAND_CHART_HSL[2]}
                radius={4}
                name="Bids"
              />
            </BarChart>
          </ChartContainer>
        </Card>
      ) : null}
    </div>
  );
}
