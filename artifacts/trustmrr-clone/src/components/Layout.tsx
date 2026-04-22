import React, { useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Star, Search, Plus } from 'lucide-react';
import { sponsorCardsLeft, sponsorCardsRight, type SponsorCard } from '@/lib/mockData';
import { applyTheme, getInitialTheme } from './ThemeToggle';

function SponsorCardView({ s }: { s: SponsorCard }) {
  return (
    <div
      className="rounded-[10px] border border-black/10 dark:border-white/10 px-3 py-3 text-center cursor-pointer hover:-translate-y-0.5 transition-transform shadow-sm"
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      <div className="mx-auto mb-1.5 w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: s.fg }}>
        {(s.letter ?? s.name.charAt(0)).toUpperCase()}
      </div>
      <div className="font-bold text-[12px] leading-tight truncate">{s.name}</div>
      <div className="text-[10px] opacity-80 mt-1 leading-snug line-clamp-2">{s.desc}</div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  useEffect(() => {
    applyTheme(getInitialTheme());
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-foreground selection:text-background">
      <div className="max-w-[1400px] mx-auto px-4 pt-10 flex flex-col lg:flex-row gap-6">

        {/* Left rail */}
        <aside className="hidden lg:block w-[170px] shrink-0">
          <div className="sticky top-6 flex flex-col gap-3">
            {sponsorCardsLeft.map((s, i) => <SponsorCardView key={i} s={s} />)}
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          {/* Header */}
          <header className="mb-8 flex flex-col items-center text-center">
            <Link href="/" className="flex items-center gap-2 mb-5 hover:opacity-80 transition-opacity">
              <Star className="w-5 h-5 fill-[#5B5BFF] text-[#5B5BFF]" />
              <span className="text-base font-bold tracking-tight">TrustMRR</span>
            </Link>

            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tighter leading-[1.05] mb-7 max-w-3xl">
              The database of verified startup revenues
            </h1>

            <div className="flex w-full max-w-xl mx-auto gap-2 mb-5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder='"SaaS over $10K/mo"'
                  className="w-full h-11 pl-10 pr-4 rounded-[8px] border border-border bg-card text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring text-sm shadow-sm"
                />
              </div>
              <button className="h-11 px-5 bg-card text-foreground font-bold border border-border rounded-[10px] whitespace-nowrap hover:-translate-y-0.5 transition-transform inline-flex items-center gap-1 shadow-sm">
                <Plus className="w-4 h-4" /> Add startup
              </button>
            </div>

            <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
              {[
                { href: '/acquire',    label: 'Buy/sell' },
                { href: '/feed',       label: 'Feed' },
                { href: '/stats',      label: 'Stats' },
                { href: '/cofounders', label: 'Co-founders' },
                { href: '/game',       label: '$1 vs $1,000,000' },
              ].map((l, i, arr) => (
                <React.Fragment key={l.href}>
                  <Link href={l.href} className={location === l.href ? 'text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}>
                    {l.label}
                  </Link>
                  {i < arr.length - 1 && <span className="text-muted-foreground/50">·</span>}
                </React.Fragment>
              ))}
            </nav>
          </header>

          {/* Promo strip */}
          <div className="w-full promo-strip border border-black/40 dark:border-black/30 border-dashed rounded-[10px] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mb-12 shadow-sm transform -rotate-[0.5deg] hover:rotate-0 transition-transform cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
              <span className="font-bold text-sm text-black">First 250 Founders / Investors get a FREE listing + FREE explore for life</span>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="flex flex-col gap-1 w-full sm:w-32">
                <div className="flex justify-between text-xs font-bold text-black">
                  <span>147 / 250</span>
                  <span>claimed</span>
                </div>
                <div className="h-2 bg-black/15 rounded-full overflow-hidden w-full">
                  <div className="h-full bg-black w-[58%] rounded-full" />
                </div>
              </div>
              <span className="text-sm font-bold whitespace-nowrap group-hover:underline text-black">Claim spot →</span>
            </div>
          </div>

          <div className="animate-in fade-in duration-500">{children}</div>
        </main>

        {/* Right rail */}
        <aside className="hidden lg:block w-[170px] shrink-0">
          <div className="sticky top-6 flex flex-col gap-3">
            {sponsorCardsRight.map((s, i) => <SponsorCardView key={i} s={s} />)}
            <div className="rounded-[10px] border border-dashed border-border p-3 text-center">
              <div className="text-[10px] text-muted-foreground">Advertise</div>
              <div className="text-[10px] text-muted-foreground">1/20 spot left</div>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}
