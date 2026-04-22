import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { mockStartups, leaderboardStartups, mockFounders } from '@/lib/mockData';
import { StartupCard } from '@/components/StartupCard';
import { LiveGlobe } from '@/components/LiveGlobe';
import { WhatsHappening } from '@/components/WhatsHappening';
import { BottomSection } from '@/components/BottomSection';
import { formatCurrency } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const recentlyListed = mockStartups.filter(s => s.forSale).slice(0, 8);
  const bestDeals = mockStartups.filter(s => s.forSale && s.multiple && s.multiple < 1.8).slice(0, 8);

  if (!isMounted) return <div className="min-h-[500px]" />;

  return (
    <div className="flex flex-col gap-14">

      {/* Recently listed */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold">Recently listed</h2>
          <Link href="/acquire" className="text-xs text-muted-foreground hover:text-foreground">View all →</Link>
        </div>
        <div className="flex overflow-x-auto pb-3 -mx-4 px-4 gap-3 snap-x snap-mandatory hide-scrollbar">
          {recentlyListed.map(s => (
            <div key={s.slug} className="min-w-[210px] w-[210px] snap-start shrink-0">
              <StartupCard startup={s} />
            </div>
          ))}
        </div>
      </section>

      {/* Best deals */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold">Best deals this week</h2>
          <Link href="/acquire" className="text-xs text-muted-foreground hover:text-foreground">View all →</Link>
        </div>
        <div className="flex overflow-x-auto pb-3 -mx-4 px-4 gap-3 snap-x snap-mandatory hide-scrollbar">
          {bestDeals.map(s => (
            <div key={s.slug} className="min-w-[210px] w-[210px] snap-start shrink-0">
              <StartupCard startup={s} />
            </div>
          ))}
        </div>
      </section>

      {/* Leaderboard */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Leaderboard</h2>
          <div className="flex gap-2">
            <button className="text-xs px-3 py-1.5 bg-card border border-border rounded-[8px] flex items-center gap-1 font-bold">
              MRR <ChevronDown className="w-3 h-3" />
            </button>
            <button className="text-xs px-3 py-1.5 bg-card border border-border rounded-[8px] flex items-center gap-1 font-bold">
              All time <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-[12px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-border text-[11px] text-muted-foreground uppercase tracking-wider">
                  <th className="p-3 font-bold w-12 text-center">#</th>
                  <th className="p-3 font-bold">Startup</th>
                  <th className="p-3 font-bold">Founder</th>
                  <th className="p-3 font-bold text-right">MRR</th>
                  <th className="p-3 font-bold text-right">MoM Growth</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardStartups.slice(0, 25).map((startup, index) => {
                  const founder = mockFounders.find(f => f.handle === startup.founderHandle);
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
                      <td className="p-3 text-center font-bold">{rankDisplay}</td>
                      <td className="p-3">
                        <Link href={`/startup/${startup.slug}`}>
                          <div className="flex items-center gap-3 group cursor-pointer">
                            <div
                              className="w-8 h-8 rounded-[6px] flex items-center justify-center font-bold text-sm border border-black/5 shrink-0"
                              style={{ backgroundColor: startup.logoColor, color: 'rgba(0,0,0,0.7)' }}
                            >
                              {startup.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold group-hover:underline truncate flex items-center gap-2">
                                <span className="truncate">{startup.name}</span>
                                {startup.forSale && (
                                  <span className="text-[9px] bg-[#FFE9A8] text-black px-1.5 py-0.5 rounded font-bold uppercase tracking-wider whitespace-nowrap">FOR SALE</span>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate max-w-[280px]">{startup.description}</div>
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="p-3">
                        {founder ? (
                          <Link href={`/founder/${founder.handle}`}>
                            <div className="flex items-center gap-2 group cursor-pointer w-max">
                              <img
                                src={`https://api.dicebear.com/7.x/notionists/svg?seed=${founder.avatarSeed}`}
                                alt={founder.name}
                                className="w-6 h-6 rounded-full bg-muted"
                              />
                              <span className="text-sm group-hover:underline">{founder.name}</span>
                            </div>
                          </Link>
                        ) : <span className="text-sm text-muted-foreground">-</span>}
                      </td>
                      <td className="p-3 text-right font-bold">{formatCurrency(startup.revenue)}</td>
                      <td className="p-3 text-right">
                        <div className={`inline-flex items-center justify-end gap-1 text-xs font-bold ${
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

      {/* Live globe */}
      <LiveGlobe />

      {/* What's happening */}
      <WhatsHappening />

      {/* Stats overview */}
      <section>
        <h2 className="text-xl font-bold mb-4">Stats overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPI label="Total Verified MRR" value={formatCurrency(leaderboardStartups.reduce((s, x) => s + x.revenue, 0))} />
          <KPI label="Verified Startups" value={String(mockStartups.length)} />
          <KPI label="Founders" value={String(mockFounders.length)} />
          <KPI label="Listings for sale" value={String(mockStartups.filter(s => s.forSale).length)} accent />
        </div>
      </section>

      <BottomSection />
    </div>
  );
}

function KPI({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`startup-card p-5 flex flex-col items-center justify-center text-center ${accent ? 'bg-[#E6FFE8] text-black' : ''}`}>
      <div className="text-xs text-muted-foreground mb-2">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
