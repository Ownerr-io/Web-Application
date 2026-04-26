import { useEffect, useId, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useParams, useSearch, Link } from 'wouter';
import {
  Building2,
  Check,
  ChevronRight,
  ExternalLink,
  Eye,
  Heart,
  Lightbulb,
  Lock,
  MessageCircle,
  Quote,
  Share2,
  Sparkles,
  Target,
  Ticket,
  TrendingUp,
  Users,
  DollarSign,
  Info,
} from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { mockFounders, mockStartups, leaderboardMetricValue, type Startup } from '@/lib/mockData';
import { mergeWithUserStartups } from '@/lib/userStartups';
import { getStartupDetailModel } from '@/lib/startupDetailContent';
import { StartupScoresDetailGrid } from '@/components/StartupTripleScores';
import { formatCurrency, formatShortCurrency, founderAvatarUrl } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FounderLink, StartupLink } from '@/components/EntityLink';
import { useIsDark } from '@/components/ThemeToggle';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { StartupDetailDailyPoint, StartupDetailRich } from '@/lib/startupDetailContent';

function DiscoverCard({ s }: { s: Startup }) {
  const mrr = leaderboardMetricValue(s, 'mrr', 'current');
  const rev30 = mrr;
  const total = Math.round((s.peakMrr ?? s.revenue) * 16);

  return (
    <Link href={`/startup/${s.slug}`} className="group block h-full min-w-0">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-foreground/25 hover:bg-muted/15">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border text-xs font-bold"
              style={{ backgroundColor: s.logoColor }}
            >
              <img
                src={`https://api.dicebear.com/7.x/shapes/svg?seed=${s.name}`}
                alt=""
                className="h-8 w-8"
              />
            </div>
            <div className="min-w-0">
              <div className="font-bold leading-tight group-hover:underline line-clamp-2">{s.name}</div>
            </div>
          </div>
          <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{s.description}</p>
        </div>
        <div className="mt-auto border-t border-dotted border-border bg-muted/10 px-3 py-3">
          <div className="grid grid-cols-3 gap-1 text-center">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                Rev (30D)
              </div>
              <div className="text-xs font-bold tabular-nums">{formatShortCurrency(rev30)}</div>
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">MRR</div>
              <div className="text-xs font-bold tabular-nums">{formatShortCurrency(mrr)}</div>
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Total</div>
              <div className="text-xs font-bold tabular-nums">{formatShortCurrency(total)}</div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function DetailChartBlock({
  detail,
  chartData,
  chartGradId,
  chartMaxNice,
  chartHeaderValue,
}: {
  detail: StartupDetailRich;
  chartData: StartupDetailDailyPoint[];
  chartGradId: string;
  chartMaxNice: number;
  chartHeaderValue: number;
}) {
  const isDark = useIsDark();
  const gridStroke = isDark ? '#2a2a2a' : '#d4d4d8';
  const tickFill = isDark ? '#737373' : '#52525b';
  const prevStroke = isDark ? '#737373' : '#a1a1aa';
  return (
    <section className="rounded-xl border border-border bg-muted/40 p-5 text-foreground shadow-sm sm:p-6 dark:border-white/10 dark:bg-[#0f0f0f] dark:text-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-bold tracking-tight">
              {formatCurrency(chartHeaderValue)}
            </span>
            <span
              className={`text-sm font-bold ${detail.chartVsPrevPct < 0 ? 'text-red-400' : 'text-emerald-400'}`}
            >
              {detail.chartVsPrevPct < 0 ? '↓' : '↑'} {Math.abs(detail.chartVsPrevPct)}% vs. prev period
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground dark:text-zinc-500">
              <Lock className="h-3.5 w-3.5" />
              <span className="select-none blur-sm">00% profit margin</span>
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-hidden />
            <Select defaultValue="revenue">
              <SelectTrigger className="h-9 w-[140px] border-border bg-card font-bold text-foreground dark:border-zinc-600 dark:bg-zinc-900 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Revenue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Select defaultValue="30d">
            <SelectTrigger className="h-9 w-[160px] border-border bg-card font-bold text-foreground dark:border-zinc-600 dark:bg-zinc-900 dark:text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6 h-[280px] w-full sm:h-[320px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={chartGradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={gridStroke} strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: tickFill, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: tickFill, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                domain={[0, chartMaxNice]}
                tickFormatter={(v) => (v >= 1000 ? `$${v / 1000}k` : `$${v}`)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0]?.payload as (typeof chartData)[0];
                  if (!row) return null;
                  return (
                    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-xl">
                      <div className="font-bold text-foreground">{detail.chartMetricLabel}</div>
                      <div className="mt-1 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        {row.label}: {formatCurrency(row.current)}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-muted-foreground">
                        <span className="h-2 w-2 rounded-full bg-zinc-500" />
                        {row.prevLabel}: {formatCurrency(row.prev)}
                      </div>
                      <div className="mt-2 border-t border-border pt-2 text-muted-foreground">
                        {row.charges} charges
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="current"
                stroke="#3b82f6"
                strokeWidth={2}
                fill={`url(#${chartGradId})`}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="prev"
                stroke={prevStroke}
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Chart data unavailable
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4 font-mono text-sm text-muted-foreground dark:border-zinc-800 dark:text-zinc-400">
        <Check className="h-4 w-4 shrink-0 text-blue-500" />
        <span>
          Revenue is verified with a{' '}
          <span className="font-bold text-blue-600 dark:text-blue-400">
            {detail.verifiedProvider === 'paddle' ? 'Paddle' : 'Stripe'}
          </span>{' '}
          API key. Last updated: {detail.lastUpdated}
        </span>
      </div>
    </section>
  );
}

export default function StartupDetail() {
  const { slug } = useParams();
  const chartGradId = useId();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const startup = useMemo(
    () => mergeWithUserStartups(mockStartups).find((s) => s.slug === slug),
    [slug],
  );
  const founder = startup ? mockFounders.find((f) => f.handle === startup.founderHandle) : undefined;

  const leaderboardRank = useMemo(() => {
    if (!startup) return 1;
    const sorted = [...mergeWithUserStartups(mockStartups)].sort((a, b) => b.revenue - a.revenue);
    const i = sorted.findIndex((s) => s.slug === startup.slug);
    return i >= 0 ? i + 1 : 999;
  }, [startup]);

  const detail = useMemo(() => {
    if (!startup) return null;
    return getStartupDetailModel(startup, founder, leaderboardRank);
  }, [startup, founder, leaderboardRank]);

  const chartData: StartupDetailDailyPoint[] = useMemo(
    () => detail?.dailyChart ?? [],
    [detail?.dailyChart],
  );

  const search = useSearch();
  const isLeaderboardView = useMemo(() => {
    const q = search.startsWith('?') ? search.slice(1) : search;
    return new URLSearchParams(q).get('from') === 'leaderboard';
  }, [search]);

  const discoverStartups = useMemo(() => {
    if (!startup) return [] as Startup[];
    return mergeWithUserStartups(mockStartups)
      .filter((s) => s.slug !== startup.slug)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [startup]);

  if (!mounted) return <div className="min-h-[500px]" />;

  if (!startup || !detail) {
    return (
      <div className="startup-card p-12 text-center">
        <h2 className="text-2xl font-bold">Startup not found</h2>
      </div>
    );
  }

  const buyersViewed = detail.buyersViewed;
  const offersReceived = detail.offersReceived;
  const mrrShown = detail.mrrDisplay;
  const foundedLabel = detail.foundedLabel;
  const visitUrl = detail.visitUrl;
  const chartMax =
    chartData.length > 0 ? Math.max(...chartData.map((d) => Math.max(d.current, d.prev)), 100) : 0;
  const chartMaxNice = Math.max(1000, Math.ceil(chartMax / 100) * 100);
  const chartHeaderValue = detail.chartPeriodTotal;

  const shareTitle = startup.name;

  async function onShare() {
    const shareUrl =
      typeof window !== 'undefined'
        ? isLeaderboardView
          ? window.location.href
          : `${window.location.origin}${window.location.pathname}`
        : '';
    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: 'Link copied' });
      }
    } catch {
      toast({ title: 'Could not share', variant: 'destructive' });
    }
  }

  if (isLeaderboardView) {
    return (
      <div className="flex flex-col gap-6 pb-10">
        <nav className="flex flex-wrap items-center gap-1 font-mono text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Ownerr.io
          </Link>
          <ChevronRight className="h-4 w-4 opacity-50" />
          <span className="hover:text-foreground">
            <Link href="/#leaderboard">Startup</Link>
          </span>
          <ChevronRight className="h-4 w-4 opacity-50" />
          <StartupLink slug={startup.slug} className="font-bold text-foreground">
            {startup.name}
          </StartupLink>
        </nav>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-start">
              <div
                className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-black/5 text-4xl font-bold shadow-md dark:border-white/10"
                style={{ backgroundColor: startup.logoColor }}
              >
                <img
                  src={`https://api.dicebear.com/7.x/shapes/svg?seed=${startup.name}`}
                  alt={`${startup.name} avatar`}
                  className="h-16 w-16"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  <StartupLink slug={startup.slug} className="text-foreground">
                    {startup.name}
                  </StartupLink>
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
                  {startup.description}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2 self-start md:self-center">
              <Button
                type="button"
                variant="outline"
                className="font-bold"
                onClick={() => void onShare()}
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <Button type="button" variant="secondary" className="font-bold bg-primary text-primary-foreground" asChild>
                <a href={visitUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Visit
                </a>
              </Button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              All-time revenue
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums">{formatCurrency(detail.allTimeRevenue)}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Ranked #{detail.leaderboardRank} on TrustMRR
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              MRR (estimated)
              <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" aria-hidden />
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums">{formatCurrency(mrrShown)}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {detail.activeSubscriptions} active subscriptions
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Founder
            </div>
            <div className="mt-3 flex min-w-0 flex-col items-center gap-2">
              {founder ? (
                <FounderLink
                  handle={founder.handle}
                  className="flex min-w-0 flex-col items-center gap-2 font-bold text-foreground sm:flex-row"
                >
                  <img
                    src={founderAvatarUrl(founder.avatarSeed)}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-full border border-border bg-muted"
                  />
                  <span className="max-w-full truncate text-center sm:text-left">{founder.name}</span>
                </FounderLink>
              ) : (
                <FounderLink handle={startup.founderHandle} className="block max-w-full truncate font-bold text-foreground">
                  {startup.founderDisplayName ?? startup.founderHandle}
                </FounderLink>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Founded
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums">{foundedLabel}</div>
            <div className="mt-2 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <span aria-hidden>🇺🇸</span>
              <span>United States</span>
            </div>
          </div>
        </div>

        <StartupScoresDetailGrid startup={startup} />

        <DetailChartBlock
          detail={detail}
          chartData={chartData}
          chartGradId={chartGradId}
          chartMaxNice={chartMaxNice}
          chartHeaderValue={chartHeaderValue}
        />

        <section className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-lg font-bold">Startup insights</h2>
          <div className="mt-4 border-t border-border pt-4">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs font-medium text-foreground">
                {startup.category}
              </span>
              {detail.insights.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-lg font-bold">Discover more startups</h2>
            <Link
              href="/#leaderboard"
              className="inline-flex items-center gap-0.5 text-sm font-bold text-muted-foreground hover:text-foreground"
            >
              Advanced Search
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {discoverStartups.map((s) => (
              <DiscoverCard key={s.slug} s={s} />
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-8 sm:gap-6 sm:pb-10">
      <nav className="flex min-w-0 flex-wrap items-center gap-1 text-xs text-muted-foreground sm:text-sm">
        <Link href="/" className="hover:text-foreground">
          Ownerr.io
        </Link>
        <ChevronRight className="h-4 w-4 opacity-50" />
        <span className="hover:text-foreground">
          <Link href="/acquire">Startup</Link>
        </span>
        <ChevronRight className="h-4 w-4 opacity-50" />
        <StartupLink slug={startup.slug} className="font-bold text-foreground">
          {startup.name}
        </StartupLink>
      </nav>

      {startup.forSale && (
        <div className="w-full rounded-xl border border-amber-200/90 bg-amber-50/95 px-4 py-3 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-amber-50/90 sm:px-5 dark:border-amber-900/40 dark:bg-[#14100c]/95 dark:shadow-[0_8px_30px_rgba(0,0,0,0.45)] dark:supports-[backdrop-filter]:bg-[#14100c]/88">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-3 text-center sm:gap-4 lg:flex-row lg:items-center lg:justify-between lg:text-left">
            <div className="min-w-0 w-full">
              <p className="font-bold leading-snug text-amber-950 dark:text-white">
                This startup is for sale. Asking price:{' '}
                <span className="text-amber-700 dark:text-amber-200">
                  {startup.price != null ? formatCurrency(startup.price) : '—'}
                </span>
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                {startup.multiple != null && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-100/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-900 dark:border-white/15 dark:bg-black/30 dark:text-zinc-200">
                    <TrendingUp className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    {startup.multiple.toFixed(1)}x revenue
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-100/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-900 dark:border-white/15 dark:bg-black/30 dark:text-zinc-200">
                  <Eye className="h-3.5 w-3.5 text-amber-700 dark:text-zinc-400" />
                  {buyersViewed.toLocaleString()} buyers saw this recently
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-100/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-900 dark:border-white/15 dark:bg-black/30 dark:text-zinc-200">
                  <Ticket className="h-3.5 w-3.5 text-amber-700 dark:text-zinc-400" />
                  {offersReceived} offers received
                </span>
              </div>
            </div>
            <div className="flex w-full max-w-sm shrink-0 items-center justify-center gap-2 sm:max-w-none sm:justify-end lg:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSaved((s) => !s)}
                className="min-w-0 flex-1 border-amber-300/80 bg-amber-100/50 font-bold text-amber-950 hover:bg-amber-200/60 dark:border-white/25 dark:bg-transparent dark:text-white dark:hover:bg-white/10 sm:flex-none"
              >
                <Heart className={`h-4 w-4 ${saved ? 'fill-amber-500 text-amber-700 dark:fill-amber-400 dark:text-amber-400' : ''}`} />
                Save
              </Button>
              <Button
                type="button"
                onClick={() => setContactOpen(true)}
                className="min-w-0 flex-1 bg-amber-500 font-bold text-black hover:bg-amber-400 hover:text-black sm:flex-none"
              >
                <MessageCircle className="h-4 w-4" />
                Contact Seller
              </Button>
            </div>
          </div>
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-4 sm:gap-5 sm:flex-row sm:items-start">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-black/5 text-4xl font-bold shadow-md sm:h-24 sm:w-24 dark:border-white/10"
              style={{ backgroundColor: startup.logoColor }}
            >
              <img
                src={`https://api.dicebear.com/7.x/shapes/svg?seed=${startup.name}`}
                alt={`${startup.name} avatar`}
                className="h-14 w-14 sm:h-16 sm:w-16"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
                <StartupLink slug={startup.slug} className="text-foreground">
                  {startup.name}
                </StartupLink>
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:mt-3 sm:text-base">
                {startup.description}
              </p>
            </div>
          </div>
          <div className="flex w-full shrink-0 gap-2 self-start md:w-auto md:self-center">
            <Button
              type="button"
              variant="outline"
              className="h-10 flex-1 font-bold md:h-11 md:flex-none"
              onClick={() => void onShare()}
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button type="button" variant="outline" className="h-10 flex-1 font-bold md:h-11 md:flex-none" asChild>
              <a href={visitUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Visit
              </a>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        <div className="rounded-xl border border-border bg-card p-4 text-center sm:p-5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            All-time revenue
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums">{formatCurrency(detail.allTimeRevenue)}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Ranked #{detail.leaderboardRank} on TrustMRR
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center sm:p-5">
          <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            MRR (estimated)
            <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" aria-hidden />
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums">{formatCurrency(mrrShown)}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {detail.activeSubscriptions} active subscriptions
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center sm:p-5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Founder
          </div>
          <div className="mt-3 flex min-w-0 flex-col items-center gap-2">
            {founder ? (
              <FounderLink
                handle={founder.handle}
                className="flex min-w-0 flex-col items-center gap-2 font-bold text-foreground sm:flex-row"
              >
                <img
                  src={founderAvatarUrl(founder.avatarSeed)}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-full border border-border bg-muted"
                />
                <span className="max-w-full truncate text-center sm:text-left">{founder.name}</span>
              </FounderLink>
            ) : (
              <FounderLink handle={startup.founderHandle} className="block max-w-full truncate font-bold text-foreground">
                {startup.founderDisplayName ?? startup.founderHandle}
              </FounderLink>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center sm:p-5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Founded
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums">{foundedLabel}</div>
        </div>
      </div>

      <StartupScoresDetailGrid startup={startup} />

      <DetailChartBlock
        detail={detail}
        chartData={chartData}
        chartGradId={chartGradId}
        chartMaxNice={chartMaxNice}
        chartHeaderValue={chartHeaderValue}
      />

      <section className="rounded-xl border border-border bg-card p-4 sm:p-8">
        <h2 className="mb-4 text-lg font-bold sm:mb-6">Startup insights</h2>
        <div className="grid gap-5 sm:gap-8 lg:grid-cols-2">
          <div className="space-y-5 sm:space-y-6">
            <InsightBlock
              icon={<Lightbulb className="h-4 w-4" />}
              label="Value proposition"
              body={detail.insights.valueProposition}
            />
            <InsightBlock
              icon={<Target className="h-4 w-4" />}
              label="Problem solved"
              body={detail.insights.problemSolved}
            />
            <InsightBlock
              icon={<DollarSign className="h-4 w-4" />}
              label="Pricing"
              body={detail.insights.pricing}
            />
          </div>
          <div className="space-y-5 sm:space-y-6">
            <InsightBlock
              icon={<Users className="h-4 w-4" />}
              label="Target audience"
              body={detail.insights.targetAudience}
            />
            <div>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Building2 className="h-4 w-4" />
                Business details
              </div>
              <div className="flex flex-wrap gap-2">
                {detail.insights.businessPills.map((p) => (
                  <span
                    key={p}
                    className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-bold"
                  >
                    {p}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-bold">
                  <Users className="h-3.5 w-3.5" />
                  {detail.insights.userCountLabel}
                </span>
              </div>
            </div>
            <InsightBlock
              icon={<Sparkles className="h-4 w-4" />}
              label="Additional info"
              body={detail.insights.additionalInfo}
            />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-5 sm:mt-8 sm:pt-6">
          {detail.insights.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-8">
        <h2 className="mb-4 text-lg font-bold sm:mb-6">Tech stack</h2>
        <div className="space-y-4 sm:space-y-5">
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Frontend
            </div>
            <div className="flex flex-wrap gap-2">
              {detail.techStack.frontend.map((t) => (
                <TechPill key={t} tech={t} />
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Backend
            </div>
            <div className="flex flex-wrap gap-2">
              {detail.techStack.backend.map((t) => (
                <TechPill key={t} tech={t} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card px-4 py-7 text-center sm:px-10 sm:py-10">
        <Quote className="mx-auto mb-4 h-8 w-8 text-muted-foreground/40" />
        <blockquote className="mx-auto max-w-2xl text-base font-medium leading-relaxed sm:text-lg">
          {detail.founderQuote}
        </blockquote>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {founder ? (
            <>
              <FounderLink
                handle={founder.handle}
                className="inline-flex items-center gap-3 text-foreground"
              >
                <img
                  src={founderAvatarUrl(founder.avatarSeed)}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full border border-border bg-muted"
                />
                <span className="text-left font-bold">{founder.name}</span>
              </FounderLink>
              <div className="max-w-full text-center text-sm text-muted-foreground sm:text-left">
                Founder of{' '}
                <StartupLink slug={startup.slug} className="text-muted-foreground hover:text-foreground">
                  {startup.name}
                </StartupLink>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 text-left">
              <img
                src={founderAvatarUrl(startup.founderHandle)}
                alt=""
                className="h-10 w-10 rounded-full border border-border bg-muted"
              />
              <div>
                <FounderLink handle={startup.founderHandle} className="block font-bold text-foreground">
                  {startup.founderDisplayName ?? startup.founderHandle}
                </FounderLink>
                <div className="text-sm text-muted-foreground">
                  Founder of{' '}
                  <StartupLink slug={startup.slug} className="text-muted-foreground">
                    {startup.name}
                  </StartupLink>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="max-w-md border-border bg-card sm:rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-left text-xl font-bold">
              Contact Seller for {startup.name}
            </DialogTitle>
            <DialogDescription className="text-left text-sm text-muted-foreground">
              Your message will be analyzed by an AI. Ensure it is detailed and realistic or it will be
              rejected.
            </DialogDescription>
          </DialogHeader>
          <ContactSellerForm
            startupName={startup.name}
            onSent={() => {
              setContactOpen(false);
              toast({ title: 'Offer sent', description: 'We will get back to you if this were live.' });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TechPill({ tech }: { tech: string }) {
  const domain = tech.toLowerCase().replace(/ /g, '').replace(/\./g, '') + '.com';
  const logoUrl = `https://icon.horse/icon/${domain}`;

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-bold">
      <img src={logoUrl} alt={`${tech} logo`} className="h-4 w-4" />
      {tech}
    </span>
  );
}

function InsightBlock({
  icon,
  label,
  body,
}: {
  icon: ReactNode;
  label: string;
  body: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-sm leading-relaxed text-foreground">{body}</p>
    </div>
  );
}

function ContactSellerForm({
  startupName,
  onSent,
}: {
  startupName: string;
  onSent: () => void;
}) {
  const [name, setName] = useState('John Doe');
  const [email, setEmail] = useState('john@example.com');
  const [message, setMessage] = useState('Can you share more about your growth and churn?');
  const [offer, setOffer] = useState('10000');

  function submit(e: FormEvent) {
    e.preventDefault();
    if (message.trim().length < 20) return;
    onSent();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cs-name" className="font-bold">
          Your Name *
        </Label>
        <Input
          id="cs-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border-border bg-background"
          autoComplete="name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cs-email" className="font-bold">
          Your Email *
        </Label>
        <Input
          id="cs-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border-border bg-background"
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cs-msg" className="font-bold">
          Message (minimum 20 characters) *
        </Label>
        <Textarea
          id="cs-msg"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="resize-y border-border bg-background"
          placeholder={`Tell us about your interest in ${startupName}…`}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cs-offer" className="font-bold">
          Offer Amount (USD) (optional)
        </Label>
        <Input
          id="cs-offer"
          inputMode="numeric"
          value={offer}
          onChange={(e) => setOffer(e.target.value)}
          className="border-border bg-background"
        />
      </div>
      <Button type="submit" className="w-full bg-zinc-200 font-bold text-black hover:bg-white">
        Send Offer
      </Button>
    </form>
  );
}