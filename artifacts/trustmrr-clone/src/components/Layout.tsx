import React from 'react';
import { Link, useLocation } from 'wouter';
import { Star } from 'lucide-react';
import { sponsorCards } from '@/lib/mockData';

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const renderSponsorCards = (start: number, end: number) => {
    return sponsorCards.slice(start, end).map((sponsor, i) => (
      <div 
        key={i} 
        className="startup-card p-3 flex items-center gap-3 mb-3 cursor-pointer"
        style={{ backgroundColor: sponsor.color }}
      >
        <div className="w-8 h-8 rounded bg-white/50 flex items-center justify-center font-bold text-black/70 shadow-sm">
          {sponsor.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate">{sponsor.name}</div>
          <div className="text-xs opacity-70 truncate">{sponsor.desc}</div>
        </div>
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-black selection:text-white pb-24">
      <div className="max-w-[1400px] mx-auto px-4 pt-12 flex flex-col lg:flex-row gap-8">
        
        {/* Left Rail (Sponsors) */}
        <aside className="hidden lg:block w-[240px] shrink-0">
          <div className="sticky top-12">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Sponsored</div>
            {renderSponsorCards(0, 4)}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          
          {/* Header */}
          <header className="mb-10 flex flex-col items-center text-center">
            <Link href="/" className="flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity">
              <Star className="w-6 h-6 fill-[#5B5BFF] text-[#5B5BFF]" />
              <span className="text-xl font-bold tracking-tight">TrustMRR</span>
            </Link>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter leading-none mb-8 max-w-2xl">
              The database of verified startup revenues
            </h1>

            <div className="flex w-full max-w-xl mx-auto gap-2 mb-6 relative">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-muted-foreground">
                    <path d="M10 6.5C10 8.433 8.433 10 6.5 10C4.567 10 3 8.433 3 6.5C3 4.567 4.567 3 6.5 3C8.433 3 10 4.567 10 6.5ZM9.30884 10.0159C8.53901 10.6318 7.56251 11 6.5 11C4.01472 11 2 8.98528 2 6.5C2 4.01472 4.01472 2 6.5 2C8.98528 2 11 4.01472 11 6.5C11 7.56251 10.6318 8.53901 10.0159 9.30884L12.8536 12.1464C13.0488 12.3417 13.0488 12.6583 12.8536 12.8536C12.6583 13.0488 12.3417 13.0488 12.1464 12.8536L9.30884 10.0159Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                  </svg>
                </div>
                <input 
                  type="text" 
                  placeholder="SaaS over $10K/mo" 
                  className="w-full h-12 pl-10 pr-4 rounded-[8px] border border-border bg-white outline-none focus:ring-2 focus:ring-black focus:border-transparent font-mono text-sm shadow-sm"
                />
              </div>
              <button className="h-12 px-6 bg-[#E6FFE8] text-black font-bold border border-black border-dashed rounded-[10px] whitespace-nowrap hover:-translate-y-0.5 transition-transform shadow-sm">
                + Add startup
              </button>
            </div>

            <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm font-medium">
              <Link href="/acquire" className={location === '/acquire' ? 'text-black font-bold' : 'text-muted-foreground hover:text-black'}>Buy/sell</Link>
              <span className="text-muted-foreground">·</span>
              <Link href="/feed" className={location === '/feed' ? 'text-black font-bold' : 'text-muted-foreground hover:text-black'}>Feed</Link>
              <span className="text-muted-foreground">·</span>
              <Link href="/stats" className={location === '/stats' ? 'text-black font-bold' : 'text-muted-foreground hover:text-black'}>Stats</Link>
              <span className="text-muted-foreground">·</span>
              <Link href="/cofounders" className={location === '/cofounders' ? 'text-black font-bold' : 'text-muted-foreground hover:text-black'}>Co-founders</Link>
              <span className="text-muted-foreground">·</span>
              <Link href="/game" className={location === '/game' ? 'text-black font-bold' : 'text-muted-foreground hover:text-black'}>$1 vs $1,000,000</Link>
            </nav>
          </header>

          {/* Promo Strip */}
          <div className="w-full bg-[#E6FFE8] border border-black border-dashed rounded-[10px] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mb-12 shadow-sm transform -rotate-1 hover:rotate-0 transition-transform cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="font-bold text-sm">First 250 Founders / Investors get a FREE listing + FREE explore for life</span>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="flex flex-col gap-1 w-full sm:w-32">
                <div className="flex justify-between text-xs font-bold">
                  <span>147 / 250</span>
                  <span>claimed</span>
                </div>
                <div className="h-2 bg-black/10 rounded-full overflow-hidden w-full">
                  <div className="h-full bg-black w-[58%] rounded-full"></div>
                </div>
              </div>
              <span className="text-sm font-bold whitespace-nowrap group-hover:underline">Claim spot →</span>
            </div>
          </div>

          <div className="animate-in fade-in duration-500">
            {children}
          </div>

        </main>

        {/* Right Rail (Sponsors) */}
        <aside className="hidden lg:block w-[240px] shrink-0">
          <div className="sticky top-12 flex flex-col gap-3">
            {renderSponsorCards(4, 9)}
            
            <div className="startup-card p-4 border-dashed border-2 border-border bg-transparent flex flex-col items-center justify-center text-center gap-2 mt-4 cursor-pointer hover:border-black/30">
              <span className="text-sm font-bold text-muted-foreground">Advertise here</span>
              <span className="text-xs text-muted-foreground">Reach 50k+ founders & investors monthly.</span>
            </div>
          </div>
        </aside>

      </div>

      <footer className="max-w-[1400px] mx-auto px-4 py-12 mt-20 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-mono">
        <div>
          Built with care by indie founders. Not affiliated with Stripe. © 2026 TrustMRR
        </div>
        <div className="flex gap-4">
          <a href="#" className="hover:text-black">About</a>
          <a href="#" className="hover:text-black">Methodology</a>
          <a href="#" className="hover:text-black">Twitter</a>
          <a href="#" className="hover:text-black">RSS</a>
          <a href="#" className="hover:text-black">Privacy</a>
        </div>
      </footer>
    </div>
  );
}