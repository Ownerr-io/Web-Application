import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'wouter';
import { mockStartups, mockFounders, leaderboardMetricValue } from '@/lib/mockData';
import { mergeWithUserStartups, USER_STARTUPS_CHANGED_EVENT } from '@/lib/userStartups';
import { StartupCard } from '@/components/StartupCard';
import { WhatsHappening } from '@/components/WhatsHappening';
import { BottomSection } from '@/components/BottomSection';
import { formatCurrency, founderAvatarUrl } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useMockSession } from '@/context/MockSessionContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [userStartupsTick, setUserStartupsTick] = useState(0);
  const [metric, setMetric] = useState<'mrr' | 'arr'>('mrr');
  const [period, setPeriod] = useState<'all_time' | 'current'>('all_time');
  const { isAuthenticated, openAuthDialog } = useMockSession();
  const [, setLocation] = useLocation();

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    const bump = () => setUserStartupsTick((t) => t + 1);
    window.addEventListener(USER_STARTUPS_CHANGED_EVENT, bump);
    window.addEventListener('storage', bump);
    return () => {
      window.removeEventListener(USER_STARTUPS_CHANGED_EVENT, bump);
      window.removeEventListener('storage', bump);
    };
  }, []);

  const mergedStartups = useMemo(
    () => mergeWithUserStartups(mockStartups),
    [userStartupsTick],
  );

  const leaderboardRows = useMemo(() => {
    return [...mergedStartups].sort(
      (a, b) =>
        leaderboardMetricValue(b, metric, period) - leaderboardMetricValue(a, metric, period),
    );
  }, [mergedStartups, metric, period]);

  const recentlyListed = mockStartups.filter(s => s.forSale).slice(0, 8);
  const bestDeals = mockStartups.filter(s => s.forSale && s.multiple && s.multiple < 1.8).slice(0, 8);

  if (!isMounted) return <div className="min-h-[500px]" />;

  return (
    <div className="flex flex-col gap-4">

      {/* Recently listed */}
      <section className="min-w-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold sm:text-xl">Recently listed</h2>
          <button
            onClick={() => (isAuthenticated ? setLocation('/acquire') : openAuthDialog())}
            className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
          >
            View all
            <ChevronRight className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
          </button>
        </div>
        <div className="flex w-full min-w-0 overflow-x-auto pb-1 gap-3 snap-x snap-mandatory hide-scrollbar max-lg:-mx-4 max-lg:px-4">
          {recentlyListed.map(s => (
            <div key={s.slug} className="min-w-[210px] w-[210px] snap-start shrink-0">
              <StartupCard startup={s} showBidCta />
            </div>
          ))}
        </div>
      </section>

      {/* Best deals */}
      <section className="min-w-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold sm:text-xl">Best deals this week</h2>
          <button
            onClick={() => (isAuthenticated ? setLocation('/acquire') : openAuthDialog())}
            className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
          >
            View all
            <ChevronRight className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
          </button>
        </div>
        <div className="flex w-full min-w-0 overflow-x-auto pb-1 gap-3 snap-x snap-mandatory hide-scrollbar max-lg:-mx-4 max-lg:px-4">
          {bestDeals.map(s => (
            <div key={s.slug} className="min-w-[210px] w-[210px] snap-start shrink-0">
              <StartupCard startup={s} showBidCta />
            </div>
          ))}
        </div>
      </section>

      {/* Leaderboard */}
      <section id="leaderboard" className="min-w-0 scroll-mt-4">
        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
          <h2 className="text-lg font-bold sm:text-xl">Leaderboard</h2>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="text-xs px-3 py-1.5 bg-card border border-border rounded-[8px] flex items-center gap-1 font-bold hover:bg-muted transition-colors"
                >
                  {metric === 'mrr' ? 'MRR' : 'ARR'} <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuRadioGroup value={metric} onValueChange={(v) => setMetric(v as 'mrr' | 'arr')}>
                  <DropdownMenuRadioItem value="mrr">MRR</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="arr">ARR</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="text-xs px-3 py-1.5 bg-card border border-border rounded-[8px] flex items-center gap-1 font-bold hover:bg-muted transition-colors"
                >
                  {period === 'all_time' ? 'All time' : 'Current'} <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuRadioGroup value={period} onValueChange={(v) => setPeriod(v as 'all_time' | 'current')}>
                  <DropdownMenuRadioItem value="all_time">All time</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="current">Current</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="bg-card border border-border rounded-[12px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-border text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider">
                  <th className="px-2 py-2 font-bold w-10 text-center">#</th>
                  <th className="px-2 py-2 font-bold">Startup</th>
                  <th className="px-2 py-2 font-bold">Founder</th>
                  <th className="px-2 py-2 font-bold text-right">{metric === 'mrr' ? 'MRR' : 'ARR'}</th>
                  <th className="px-2 py-2 font-bold text-right">MoM Growth</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardRows.slice(0, 25).map((startup, index) => {
                  const founder = mockFounders.find(f => f.handle === startup.founderHandle);
                  const metricVal = leaderboardMetricValue(startup, metric, period);
                  const rank = index + 1;
                  let rankDisplay: React.ReactNode = rank.toString();
                  if (rank === 1) rankDisplay = '🥇';
                  if (rank === 2) rankDisplay = '🥈';
                  if (rank === 3) rankDisplay = '🥉';

                  return (
                    <motion.tr
                      key={startup.slug}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.025, 0.4), duration: 0.25 }}
                      className="border-b border-border last:border-0 hover:bg-muted transition-colors"
                    >
                      <td className="px-2 py-1.5 text-center font-bold text-sm">{rankDisplay}</td>
                      <td className="px-2 py-1.5">
                        <Link href={`/startup/${startup.slug}?from=leaderboard`}>
                          <div className="flex items-center gap-2 group cursor-pointer">
                            <div
                              className="w-6 h-6 rounded-[5px] flex items-center justify-center text-xs font-bold border border-black/5 shrink-0"
                              style={{ backgroundColor: startup.logoColor }}
                            >
                              <img
                                src={`https://api.dicebear.com/7.x/shapes/svg?seed=${startup.name}`}
                                alt={`${startup.name} avatar`}
                                className="w-4 h-4"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-sm group-hover:underline flex items-center gap-1.5 flex-wrap">
                                <span className="truncate">{startup.name}</span>
                                {startup.forSale && (
                                  <span className="text-[8px] bg-[#FFE9A8] text-black px-1 py-0.5 rounded font-bold uppercase tracking-wider whitespace-nowrap">FOR SALE</span>
                                )}
                              </div>
                              <div className="text-[10px] text-muted-foreground max-w-[240px] line-clamp-1">{startup.description}</div>
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-2 py-1.5">
                        {founder ? (
                          <Link href={`/founder/${founder.handle}`}>
                            <div className="flex items-center gap-2 group cursor-pointer w-max">
                              <img
                                src={founderAvatarUrl(founder.avatarSeed)}
                                alt={founder.name}
                                className="w-5 h-5 rounded-full bg-muted shrink-0"
                              />
                              <span className="text-xs sm:text-sm group-hover:underline truncate">{founder.name}</span>
                            </div>
                          </Link>
                        ) : startup.founderDisplayName ? (
                          <Link href={`/founder/${encodeURIComponent(startup.founderHandle)}`}>
                            <div className="flex items-center gap-2 w-max group">
                              <img
                                src={founderAvatarUrl(startup.founderHandle)}
                                alt=""
                                className="w-5 h-5 rounded-full bg-muted shrink-0"
                              />
                              <span className="text-xs sm:text-sm truncate group-hover:underline">
                                {startup.founderDisplayName}
                              </span>
                            </div>
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right font-bold text-sm tabular-nums">{formatCurrency(metricVal)}</td>
                      <td className="px-2 py-1.5 text-right">
                        <div className={`inline-flex items-center justify-end gap-1 text-[11px] font-bold ${
                          startup.momGrowth > 0 ? 'text-green-500' : startup.momGrowth < 0 ? 'text-red-500' : 'text-muted-foreground'
                        }`}>
                          {startup.momGrowth > 0 ? '↑' : startup.momGrowth < 0 ? '↓' : '—'}
                          {startup.momGrowth !== 0 && ` ${Math.abs(startup.momGrowth).toFixed(0)}%`}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* What's happening */}
      <WhatsHappening />

      {/* Stats overview */}
      <section className="min-w-0">
        <h2 className="mb-3 text-xl font-bold">Stats overview</h2>
        <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          <KPI label="Total Verified MRR" value={formatCurrency(mergedStartups.reduce((s, x) => s + x.revenue, 0))} />
          <KPI label="Verified Startups" value={String(mockStartups.length)} />
          <KPI label="Founders" value={String(mockFounders.length)} />
          <KPI label="Listings for sale" value={String(mockStartups.filter(s => s.forSale).length)} accent />
        </div>
      </section>

      <section className="min-w-0">
        <BottomSection />
      </section>
    </div>
  );
}

function KPI({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`startup-card flex min-w-0 flex-col items-center justify-center p-4 text-center sm:p-5 ${
        accent ? 'bg-emerald-100 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-50' : ''
      }`}
    >
      <div className="mb-2 text-[11px] font-medium text-muted-foreground sm:text-xs">{label}</div>
      <div className="w-full max-w-full break-words text-lg font-bold tabular-nums leading-tight sm:text-xl md:text-2xl">
        {value}
      </div>
    </div>
  );
}