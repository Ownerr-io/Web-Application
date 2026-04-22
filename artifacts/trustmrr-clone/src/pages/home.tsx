import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { mockStartups, leaderboardStartups, mockFounders } from '@/lib/mockData';
import { StartupCard } from '@/components/StartupCard';
import { formatCurrency } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const recentlyListed = mockStartups.filter(s => s.forSale).slice(0, 6);
  const bestDeals = mockStartups.filter(s => s.forSale && s.multiple && s.multiple < 1.5).slice(0, 6);

  if (!isMounted) return <div className="min-h-[500px]" />;

  return (
    <div className="flex flex-col gap-16">
      
      {/* Recently Listed Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Recently listed</h2>
          <Link href="/acquire" className="text-sm text-muted-foreground hover:text-black">View all →</Link>
        </div>
        <div className="flex overflow-x-auto pb-4 -mx-4 px-4 gap-4 snap-x snap-mandatory hide-scrollbar">
          {recentlyListed.map(startup => (
            <div key={startup.slug} className="min-w-[280px] w-[280px] snap-start shrink-0">
              <StartupCard startup={startup} />
            </div>
          ))}
        </div>
      </section>

      {/* Best Deals Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Best deals this week</h2>
          <Link href="/acquire" className="text-sm text-muted-foreground hover:text-black">View all →</Link>
        </div>
        <div className="flex overflow-x-auto pb-4 -mx-4 px-4 gap-4 snap-x snap-mandatory hide-scrollbar">
          {bestDeals.map(startup => (
            <div key={startup.slug} className="min-w-[280px] w-[280px] snap-start shrink-0">
              <StartupCard startup={startup} />
            </div>
          ))}
        </div>
      </section>

      {/* Leaderboard Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Leaderboard</h2>
          <div className="flex gap-2">
            <button className="text-sm px-3 py-1 bg-white border border-border rounded-[8px] flex items-center gap-1 shadow-sm font-bold">
              MRR <ChevronDown className="w-3 h-3" />
            </button>
            <button className="text-sm px-3 py-1 bg-white border border-border rounded-[8px] flex items-center gap-1 shadow-sm font-bold">
              All-time <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="bg-white border border-border rounded-[10px] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="p-4 font-bold w-12 text-center">#</th>
                  <th className="p-4 font-bold">Startup</th>
                  <th className="p-4 font-bold">Founder</th>
                  <th className="p-4 font-bold text-right">MRR</th>
                  <th className="p-4 font-bold text-right">MoM Growth</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardStartups.slice(0, 15).map((startup, index) => {
                  const founder = mockFounders.find(f => f.handle === startup.founderHandle);
                  const rank = index + 1;
                  let rankDisplay = rank.toString();
                  if (rank === 1) rankDisplay = '🥇';
                  if (rank === 2) rankDisplay = '🥈';
                  if (rank === 3) rankDisplay = '🥉';

                  return (
                    <motion.tr 
                      key={startup.slug}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors"
                    >
                      <td className="p-4 text-center font-bold">{rankDisplay}</td>
                      <td className="p-4">
                        <Link href={`/startup/${startup.slug}`}>
                          <div className="flex items-center gap-3 group cursor-pointer">
                            <div 
                              className="w-8 h-8 rounded-[6px] flex items-center justify-center font-bold text-sm border border-black/5 shrink-0"
                              style={{ backgroundColor: startup.logoColor, color: 'rgba(0,0,0,0.7)' }}
                            >
                              {startup.name.charAt(0)}
                            </div>
                            <div className="font-bold group-hover:underline">{startup.name}</div>
                            {startup.forSale && (
                              <span className="text-[10px] bg-[#FFE9A8] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider whitespace-nowrap">
                                For Sale
                              </span>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="p-4">
                        {founder && (
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
                        )}
                      </td>
                      <td className="p-4 text-right font-bold">
                        {formatCurrency(startup.revenue)}
                      </td>
                      <td className="p-4 text-right">
                        <div className={`flex items-center justify-end gap-1 text-sm font-bold ${
                          startup.momGrowth > 0 ? 'text-green-600' : startup.momGrowth < 0 ? 'text-red-500' : 'text-muted-foreground'
                        }`}>
                          {startup.momGrowth > 0 && <span>▲</span>}
                          {startup.momGrowth < 0 && <span>▼</span>}
                          {startup.momGrowth === 0 && <span>—</span>}
                          {startup.momGrowth !== 0 && `${Math.abs(startup.momGrowth).toFixed(1)}%`}
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

      {/* Stats Mini Section */}
      <section>
        <h2 className="text-xl font-bold mb-4">Stats overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="startup-card p-6 flex flex-col items-center justify-center text-center">
            <div className="text-sm text-muted-foreground mb-2">Total Verified MRR</div>
            <div className="text-2xl font-bold">{formatCurrency(leaderboardStartups.reduce((sum, s) => sum + s.revenue, 0))}</div>
          </div>
          <div className="startup-card p-6 flex flex-col items-center justify-center text-center">
            <div className="text-sm text-muted-foreground mb-2">Verified Startups</div>
            <div className="text-3xl font-bold">{mockStartups.length}</div>
          </div>
          <div className="startup-card p-6 flex flex-col items-center justify-center text-center">
            <div className="text-sm text-muted-foreground mb-2">Founders</div>
            <div className="text-3xl font-bold">{mockFounders.length}</div>
          </div>
          <div className="startup-card p-6 flex flex-col items-center justify-center text-center bg-[#E6FFE8]">
            <div className="text-sm text-muted-foreground mb-2 text-black/70">Listings for sale</div>
            <div className="text-3xl font-bold">{mockStartups.filter(s => s.forSale).length}</div>
          </div>
        </div>
      </section>

    </div>
  );
}