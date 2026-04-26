import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link } from 'wouter';
import { Switch } from '@/components/ui/switch';
import { mockStartups } from '@/lib/mockData';
import {
  aggregateByCategory,
  aggregateMrrByTech,
  buildStatsDataset,
  countAboveGrowthDiagonal,
  distributionBuckets,
  getFounderByHandle,
  highArrLowFollowers,
  olympicsByCountry,
  timeToMilestoneAverages,
} from '@/lib/statsDerivedData';
import { dicebearShapesSvg, formatCurrency, founderAvatarUrl } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { FounderLink, StartupLink } from '@/components/EntityLink';
import { useIsDark } from '@/components/ThemeToggle';

const card = 'rounded-xl border border-border bg-card p-4 text-card-foreground sm:p-5';
const h2 = 'font-mono text-sm font-bold tracking-tight text-foreground';
const sub = 'text-xs text-muted-foreground';
/** Recharts needs generous bottom/left room so x-axis title + tick labels are not clipped */
const M_SCATTER = { top: 20, right: 28, left: 60, bottom: 72 };

function xAxisTitle(text: string, labelFill: string) {
  return {
    value: text,
    position: 'bottom' as const,
    offset: 18,
    style: { fill: labelFill, fontSize: 12, fontWeight: 500, textAnchor: 'middle' as const },
  };
}
function yAxisTitle(text: string, labelFill: string) {
  return {
    value: text,
    angle: -90,
    position: 'insideLeft' as const,
    offset: 4,
    style: { fill: labelFill, fontSize: 12, fontWeight: 500, textAnchor: 'middle' as const },
  };
}
const tableWrap = 'mt-3 overflow-x-auto rounded-lg border border-border';
const th =
  'border-b border-border bg-muted/50 px-3 py-2 text-left text-[10px] font-mono font-bold uppercase text-muted-foreground';
const td = 'border-b border-border/80 px-3 py-2 text-xs text-foreground';

function numberTickK(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

export function StatsDashboard() {
  const rows = useMemo(() => buildStatsDataset(mockStartups), []);
  const techRows = useMemo(() => aggregateMrrByTech(rows), [rows]);
  const categoryRows = useMemo(() => aggregateByCategory(rows), [rows]);
  const olympics = useMemo(() => olympicsByCountry(rows), [rows]);
  const highLow = useMemo(() => highArrLowFollowers(rows, 10), [rows]);
  const growthCompare = useMemo(() => countAboveGrowthDiagonal(rows), [rows]);
  const revDist = useMemo(() => distributionBuckets(rows, 'revenue'), [rows]);
  const followerDist = useMemo(() => distributionBuckets(rows, 'xFollowers'), [rows]);
  const timeGrowth = useMemo(() => timeToMilestoneAverages(rows), [rows]);

  const [logFollowers, setLogFollowers] = useState(true);
  const [logRevenue, setLogRevenue] = useState(true);
  const [logGrowth, setLogGrowth] = useState(true);
  const [logTibX, setLogTibX] = useState(true);
  const [logTibY, setLogTibY] = useState(true);

  const isDark = useIsDark();
  const chart = useMemo(
    () =>
      isDark
        ? {
            grid: '#27272a',
            tick: { fontSize: 10, fill: '#a1a1aa' },
            axis: '#52525b',
            tooltipBg: '#18181b',
            tooltipBorder: '#3f3f46',
            tooltipLabel: '#e4e4e7',
            bar1: '#3f3f46',
            bar2: '#52525b',
            barHi: '#e4e4e7',
            ref: '#a1a1aa',
            diag: '#71717a',
            cell0: '#e4e4e7',
            cell1: '#52525b',
          }
        : {
            grid: '#e4e4e7',
            tick: { fontSize: 10, fill: '#52525b' },
            axis: '#a1a1aa',
            tooltipBg: '#ffffff',
            tooltipBorder: '#d4d4d8',
            tooltipLabel: '#18181b',
            bar1: '#a1a1aa',
            bar2: '#d4d4d8',
            barHi: '#3f3f46',
            ref: '#737373',
            diag: '#a1a1aa',
            cell0: '#3f3f46',
            cell1: '#d4d4d8',
          },
    [isDark],
  );

  const dataRevVsX = useMemo(
    () =>
      rows.map((r) => {
        const f = getFounderByHandle(r.founderHandle);
        return {
          x: r.xFollowers,
          y: r.arr,
          name: r.name,
          followers: r.xFollowers,
          slug: r.slug,
          founderHandle: r.founderHandle,
          handle: f?.twitter ?? `@${r.founderHandle}`,
          founderAvatarSeed: f?.avatarSeed ?? r.founderHandle,
        };
      }),
    [rows],
  );

  const dataGrowthVsGrowth = useMemo(
    () =>
      rows.map((r) => ({
        x: r.xFollowerGrowthPct,
        y: r.revGrowthComparePct,
        name: r.name,
        slug: r.slug,
        founderHandle: r.founderHandle,
        founderAvatarSeed: getFounderByHandle(r.founderHandle)?.avatarSeed ?? r.founderHandle,
      })),
    [rows],
  );

  const dataRevVsTime = useMemo(
    () =>
      rows.map((r) => ({
        x: Math.max(1, r.daysInBusiness),
        y: r.revenue * 12,
        name: r.name,
        slug: r.slug,
        founderHandle: r.founderHandle,
      })),
    [rows],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-16 font-sans text-foreground">
      <div>
        <h1 className="font-mono text-2xl font-bold text-foreground">Stats</h1>
        <p className="mt-1 text-sm text-muted-foreground">Verified revenue, founders, and markets across Ownerr</p>
      </div>

      {/* 1 */}
      <section className={card}>
        <h2 className={h2}>1. Revenue distribution</h2>
        <p className={sub}>Count of startups by MRR band</p>
        <div className="mt-4 h-72 w-full min-w-0 max-w-full">
          <ResponsiveContainer>
            <BarChart data={revDist} margin={{ top: 12, right: 12, left: 44, bottom: 32 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis
                dataKey="name"
                tick={chart.tick}
                stroke={chart.axis}
                tickMargin={8}
                height={40}
                label={xAxisTitle('MRR band', chart.tick.fill)}
              />
              <YAxis tick={chart.tick} stroke={chart.axis} allowDecimals={false} width={40} label={yAxisTitle('Startups', chart.tick.fill)} />
              <Tooltip
                contentStyle={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, fontSize: 12 }}
                labelStyle={{ color: chart.tooltipLabel }}
                formatter={(v: number) => [v, 'Startups']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} fill={chart.bar1} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 2 */}
      <section className={card}>
        <h2 className={h2}>2. Time to growth</h2>
        <p className={sub}>Average months to reach revenue milestones (modelled from verified MRR + age)</p>
        <div className="mt-4 h-72 w-full min-w-0 max-w-full">
          <ResponsiveContainer>
            <BarChart
              data={timeGrowth}
              layout="vertical"
              margin={{ top: 12, right: 24, left: 12, bottom: 36 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} horizontal={false} />
              <XAxis
                type="number"
                tick={chart.tick}
                stroke={chart.axis}
                unit=" mo"
                tickMargin={6}
                label={xAxisTitle('Average months to milestone', chart.tick.fill)}
              />
              <YAxis
                dataKey="milestone"
                type="category"
                width={120}
                tick={chart.tick}
                stroke={chart.axis}
              />
              <Tooltip
                contentStyle={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}` }}
                formatter={(v: number) => [`${v} mo`, 'Avg. months']}
              />
              <Bar dataKey="months" fill={chart.bar2} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 3 */}
      <section className={card}>
        <h2 className={h2}>3. Founder 𝕏 followers</h2>
        <p className={sub}>Distribution of 𝕏 (Twitter) followers across founders in the dataset</p>
        <div className="mt-4 h-72 w-full min-w-0 max-w-full">
          <ResponsiveContainer>
            <BarChart data={followerDist} margin={{ top: 12, right: 12, left: 44, bottom: 32 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis
                dataKey="name"
                tick={chart.tick}
                interval={0}
                height={48}
                stroke={chart.axis}
                tickMargin={6}
                label={xAxisTitle('𝕏 follower count band', chart.tick.fill)}
              />
              <YAxis tick={chart.tick} stroke={chart.axis} allowDecimals={false} width={40} label={yAxisTitle('Founders', chart.tick.fill)} />
              <Tooltip
                contentStyle={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}` }}
                formatter={(v: number) => [v, 'Founders']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} fill={chart.bar1} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 4 */}
      <section className={card}>
        <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={h2}>4. Revenue vs 𝕏 followers (log scale)</h2>
            <p className={sub}>
              ARR (y) vs founder 𝕏 reach (x). Dashed guides at $1.5M and ~300 followers.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>Log 𝕏</span>
              <Switch checked={logFollowers} onCheckedChange={setLogFollowers} />
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>Log revenue</span>
              <Switch checked={logRevenue} onCheckedChange={setLogRevenue} />
            </div>
          </div>
        </div>
        <div className="h-[500px] w-full min-w-0 max-w-full">
          <ResponsiveContainer>
            <ScatterChart margin={M_SCATTER}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis
                type="number"
                dataKey="x"
                name="Followers"
                scale={logFollowers ? 'log' : 'linear'}
                domain={logFollowers ? [1, 200000] : ['auto', 'auto']}
                tick={chart.tick}
                stroke={chart.axis}
                tickMargin={10}
                tickFormatter={numberTickK}
                label={xAxisTitle('𝕏 Followers (log scale)', chart.tick.fill)}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Revenue"
                scale={logRevenue ? 'log' : 'linear'}
                domain={logRevenue ? [50_000, 70_000_000] : ['auto', 'auto']}
                tick={chart.tick}
                stroke={chart.axis}
                width={56}
                tickFormatter={numberTickK}
                tickMargin={6}
                label={yAxisTitle('Revenue (log scale, ARR)', chart.tick.fill)}
              />
              <Tooltip content={TipRevVsFollowers} cursor={{ strokeDasharray: '3 3' }} allowEscapeViewBox={{ x: true, y: true }} />
              <ReferenceLine
                y={1_500_000}
                stroke={chart.ref}
                strokeDasharray="4 4"
                strokeOpacity={0.6}
                label={{ value: '$1.5M', fill: chart.ref, fontSize: 9 }}
              />
              <ReferenceLine
                x={300}
                stroke={chart.ref}
                strokeDasharray="4 4"
                strokeOpacity={0.6}
                label={{ value: '300', position: 'top', fill: chart.ref, fontSize: 9 }}
              />
              <Scatter data={dataRevVsX} shape={AvatarShape} isAnimationActive={false} fill={chart.ref} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-right font-mono text-[10px] text-muted-foreground">ownerr.io</p>
      </section>

      {/* 5 */}
      <section className={card}>
        <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={h2}>5. Follower growth vs revenue growth</h2>
            <p className={sub}>Above the diagonal = revenue growth outpaced followers · Below = followers grew faster</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              ↑ Revenue faster · <span className="text-muted-foreground/80">↓ Followers faster</span>
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>Log scale</span>
            <Switch checked={logGrowth} onCheckedChange={setLogGrowth} />
          </div>
        </div>
        <div className="h-[500px] w-full min-w-0 max-w-full">
          <ResponsiveContainer>
            <ScatterChart margin={M_SCATTER}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis
                type="number"
                dataKey="x"
                name="Follower gr."
                scale={logGrowth ? 'log' : 'linear'}
                domain={logGrowth ? [0.1, 200] : ['auto', 'auto']}
                tick={chart.tick}
                stroke={chart.axis}
                tickMargin={10}
                label={xAxisTitle('𝕏 Follower growth % (log)', chart.tick.fill)}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Revenue gr."
                scale={logGrowth ? 'log' : 'linear'}
                domain={logGrowth ? [0.1, 200] : ['auto', 'auto']}
                tick={chart.tick}
                stroke={chart.axis}
                width={56}
                tickMargin={6}
                label={yAxisTitle('Revenue growth % (log)', chart.tick.fill)}
              />
              <Tooltip content={TipGrowth} cursor={{ strokeDasharray: '3 3' }} />
              <ReferenceLine
                segment={[
                  { x: 0.1, y: 0.1 },
                  { x: 200, y: 200 },
                ]}
                stroke={chart.diag}
                strokeDasharray="5 4"
                strokeOpacity={0.7}
                label={{ value: 'Equal growth', position: 'insideTopLeft', fill: chart.diag, fontSize: 9 }}
              />
              <Scatter data={dataGrowthVsGrowth} shape={AvatarShape} isAnimationActive={false} fill={chart.ref} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 rounded-lg border border-sky-200/80 bg-sky-50 px-3 py-2 text-center text-xs text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200">
          Revenue outpaced followers in {growthCompare.pct}% of cases (n={growthCompare.n})
        </div>
      </section>

      {/* 6 */}
      <section className={card}>
        <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={h2}>6. Revenue vs time in business</h2>
            <p className={sub}>ARR vs days since founded (synthetic from founded year + dataset)</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>Log time</span>
              <Switch checked={logTibX} onCheckedChange={setLogTibX} />
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>Log revenue</span>
              <Switch checked={logTibY} onCheckedChange={setLogTibY} />
            </div>
          </div>
        </div>
        <div className="h-[500px] w-full min-w-0 max-w-full">
          <ResponsiveContainer>
            <ScatterChart margin={M_SCATTER}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis
                type="number"
                dataKey="x"
                scale={logTibX ? 'log' : 'linear'}
                domain={logTibX ? [5, 5000] : ['auto', 'auto']}
                tick={chart.tick}
                stroke={chart.axis}
                tickMargin={10}
                tickFormatter={timeTick}
                label={xAxisTitle('Time in business (days, log scale)', chart.tick.fill)}
              />
              <YAxis
                type="number"
                dataKey="y"
                scale={logTibY ? 'log' : 'linear'}
                domain={logTibY ? [10, 50_000_000] : ['auto', 'auto']}
                tick={chart.tick}
                stroke={chart.axis}
                width={56}
                tickFormatter={numberTickK}
                tickMargin={6}
                label={yAxisTitle('Revenue (log scale, ARR)', chart.tick.fill)}
              />
              <Tooltip content={TipTime} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={dataRevVsTime} shape={LogoShape} isAnimationActive={false} fill={chart.ref} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 7 */}
      <section className={card}>
        <h2 className={h2}>7. Startup Olympics</h2>
        <p className={sub}>Countries ranked by total verified MRR (monthly) from the dataset</p>
        <div className={tableWrap}>
          <table className="w-full min-w-[480px] border-collapse">
            <thead>
              <tr>
                <th className={th}>#</th>
                <th className={th}>Country</th>
                <th className={th}>Total MRR</th>
                <th className={th}>ARR</th>
                <th className={th}>Startups</th>
              </tr>
            </thead>
            <tbody>
              {olympics.map((r, i) => (
                <tr key={r.iso} className="hover:bg-muted/50">
                  <td className={td}>{i + 1}</td>
                  <td className={cn(td, 'font-mono font-bold')}>
                    {r.name} <span className="text-muted-foreground">({r.iso})</span>
                  </td>
                  <td className={td}>{formatCurrency(r.totalMrr)}</td>
                  <td className={td}>{formatCurrency(r.arr)}</td>
                  <td className={td}>{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 8 */}
      <section className={card}>
        <h2 className={h2}>8. Top tech stacks by revenue</h2>
        <p className={sub}>Aggregated MRR by inferred primary stack (deterministic from category + slug)</p>
        <div className="mt-4 h-80 w-full min-w-0 max-w-full">
            <ResponsiveContainer>
              <BarChart
                data={techRows.map(([name, mrr]) => ({ name, mrr }))}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 36 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} horizontal={false} />
                <XAxis
                  type="number"
                  tick={chart.tick}
                  stroke={chart.axis}
                  tickFormatter={numberTickK}
                  tickMargin={6}
                  label={xAxisTitle('MRR (Σ)', chart.tick.fill)}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  tick={{ fontSize: 9, fill: chart.tick.fill }}
                  stroke={chart.axis}
                />
                <Tooltip
                  contentStyle={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}` }}
                  formatter={(v: number) => [formatCurrency(v), 'MRR']}
                />
                <Bar dataKey="mrr" radius={[0, 3, 3, 0]}>
                  {techRows.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? chart.cell0 : chart.cell1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
        </div>
      </section>

      {/* 9 */}
      <section className={card}>
        <h2 className={h2}>9. Most profitable categories</h2>
        <p className={sub}>Totals across verified startups in each category</p>
        <div className={tableWrap}>
          <table className="w-full min-w-[520px] border-collapse">
            <thead>
              <tr>
                <th className={th}>#</th>
                <th className={th}>Category</th>
                <th className={th}>Total revenue (ARR)</th>
                <th className={th}>MRR (Σ)</th>
                <th className={th}>Growth (30d avg)</th>
              </tr>
            </thead>
            <tbody>
              {categoryRows.map((r, i) => (
                <tr key={r.category} className="hover:bg-muted/50">
                  <td className={td}>{i + 1}</td>
                  <td className={cn(td, 'font-medium text-foreground')}>{r.category}</td>
                  <td className={td}>{formatCurrency(r.totalRevenue)}</td>
                  <td className={td}>{formatCurrency(r.mrr)}</td>
                  <td className={td}>{r.growth30d.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 10 */}
      <section className={card}>
        <h2 className={h2}>10. High revenue ($1M+ ARR), least followers</h2>
        <p className={sub}>Startups with ≥ $1M ARR, sorted by lowest 𝕏 followers first</p>
        <div className={tableWrap}>
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                <th className={th}>#</th>
                <th className={th}>Startup</th>
                <th className={th}>Founder</th>
                <th className={th}>Revenue (ARR)</th>
                <th className={th}>𝕏 followers</th>
              </tr>
            </thead>
            <tbody>
              {highLow.map((r, i) => {
                const f = getFounderByHandle(r.founderHandle);
                return (
                  <tr key={r.slug} className="hover:bg-muted/50">
                    <td className={td}>{i + 1}</td>
                    <td className={td}>
                      <Link href={`/startup/${r.slug}`} className="inline-flex items-center gap-2 font-medium text-foreground hover:underline">
                        <img
                          src={dicebearShapesSvg(r.name)}
                          alt=""
                          className="h-7 w-7 rounded-md border border-border"
                        />
                        {r.name}
                      </Link>
                    </td>
                    <td className={td}>
                      <FounderLink
                        handle={r.founderHandle}
                        className="inline-flex items-center gap-2 text-muted-foreground"
                      >
                        <img
                          src={founderAvatarUrl(f?.avatarSeed ?? r.founderHandle)}
                          alt=""
                          className="h-7 w-7 rounded-full border border-border"
                        />
                        <span>{f?.name ?? r.founderHandle}</span>
                      </FounderLink>
                    </td>
                    <td className={td}>{formatCurrency(r.arr)}</td>
                    <td className={td}>{r.xFollowers.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function timeTick(v: number) {
  if (v < 1) return String(v);
  if (v < 400) return `${Math.round(v)}d`;
  const y = v / 365;
  if (y < 1.2) return `${Math.round((v / 30) * 10) / 10}m`;
  return `${y.toFixed(1)}y`;
}

type RevXTip = {
  x: number;
  y: number;
  name: string;
  followers: number;
  handle: string;
  founderAvatarSeed: string;
  slug: string;
  founderHandle: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TipRevVsFollowers({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const p = payload[0].payload as RevXTip;
  return (
    <div className="z-50 max-w-xs rounded-lg border border-border bg-popover p-2 text-left text-popover-foreground shadow-xl">
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <img src={dicebearShapesSvg(p.name)} alt="" className="h-8 w-8 rounded border border-border" />
        <div>
          <div className="text-xs font-bold">
            <StartupLink slug={p.slug} className="text-foreground">
              {p.name}
            </StartupLink>
          </div>
          <div className="text-[10px] text-muted-foreground">ARR {formatCurrency(p.y)}</div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        <img src={founderAvatarUrl(p.founderAvatarSeed)} alt="" className="h-6 w-6 rounded-full border border-border" />
        <div>
          <div>
            <FounderLink handle={p.founderHandle} className="text-foreground">
              {p.handle}
            </FounderLink>
          </div>
          <div className="text-muted-foreground">{p.followers.toLocaleString()} followers</div>
        </div>
      </div>
    </div>
  );
}

type AvPayload = { founderAvatarSeed: string; slug: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AvatarShape(props: any) {
  const { cx, cy, payload, index } = props;
  if (cx == null || cy == null) return <g />;
  const p = payload as AvPayload;
  if (!p?.founderAvatarSeed) return <g />;
  const id = `c-av-${String(cx).replace(/\./g, 'p')}-${String(cy).replace(/\./g, 'p')}-${String(index)}`;
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <circle cx={cx} cy={cy} r={8} />
        </clipPath>
      </defs>
      <image
        href={founderAvatarUrl(p.founderAvatarSeed)}
        x={cx - 8}
        y={cy - 8}
        width={16}
        height={16}
        clipPath={`url(#${id})`}
        preserveAspectRatio="xMidYMid slice"
      />
      <circle cx={cx} cy={cy} r={8} fill="none" stroke="#fafafa" strokeWidth={0.6} opacity={0.85} />
    </g>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LogoShape(props: any) {
  const { cx, cy, payload, index } = props;
  if (cx == null || cy == null) return <g />;
  const p = payload as { name: string; slug: string };
  if (!p?.name) return <g />;
  const id = `c-lg-${String(cx).replace(/\./g, 'p')}-${String(cy).replace(/\./g, 'p')}-${String(index)}`;
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <circle cx={cx} cy={cy} r={7} />
        </clipPath>
      </defs>
      <image
        href={dicebearShapesSvg(p.name)}
        x={cx - 7}
        y={cy - 7}
        width={14}
        height={14}
        clipPath={`url(#${id})`}
        preserveAspectRatio="xMidYMid slice"
      />
      <circle cx={cx} cy={cy} r={7} fill="none" stroke="#e4e4e7" strokeWidth={0.5} opacity={0.6} />
    </g>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TipGrowth({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const p = payload[0].payload as { x: number; y: number; name: string; slug: string; founderHandle: string };
  return (
    <div className="z-50 rounded-lg border border-border bg-popover p-2 text-xs text-popover-foreground shadow-xl">
      <div className="font-bold text-foreground">
        <StartupLink slug={p.slug} className="text-foreground">
          {p.name}
        </StartupLink>
      </div>
      <div className="text-muted-foreground">Revenue +{p.y.toFixed(1)}% · Followers +{p.x.toFixed(1)}%</div>
    </div>
  );
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TipTime({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const p = payload[0].payload as { x: number; y: number; name: string; slug: string; founderHandle: string };
  return (
    <div className="z-50 rounded-lg border border-border bg-popover p-2 text-xs text-popover-foreground shadow-xl">
      <div className="font-bold text-foreground">
        <StartupLink slug={p.slug} className="text-foreground">
          {p.name}
        </StartupLink>
      </div>
      <div>ARR {formatCurrency(p.y)}</div>
      <div className="text-muted-foreground">~{Math.round(p.x)} days in business</div>
    </div>
  );
}
