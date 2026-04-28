import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { Link, useLocation, useRouter } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { mockStartups, type Startup } from '@/lib/mockData';
import { mergeWithUserStartups, USER_STARTUPS_CHANGED_EVENT } from '@/lib/userStartups';
import { cn, formatShortCurrency } from '@/lib/utils';
import { StartupTripleScores } from '@/components/StartupTripleScores';

function formatGrowthLine(s: Startup): { text: string; isNeg: boolean } | null {
  const n = s.revenueGrowth30dPct ?? s.momGrowth;
  if (n == null || n === 0) return null;
  const isNeg = n < 0;
  const arrow = n > 0 ? '↑' : '↓';
  return { text: `${arrow}${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 1 })}%`, isNeg };
}

function MarketplaceSaleCard({ startup }: { startup: Startup }) {
  const router = useRouter();
  const [, setLocation] = useLocation();
  const logoColor = startup.logoColor ?? '#E6EAFF';
  const growth = formatGrowthLine(startup);
  const strike = startup.askingPriceStrike;
  const href = `/startup/${startup.slug}`;
  const resolvedHref = router.hrefs(
    href.startsWith('~') ? href.slice(1) : router.base + href,
    router,
  );

  function openListing(e: MouseEvent<HTMLElement>) {
    if (e.defaultPrevented) return;
    if (e.button !== 0) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) {
      window.open(resolvedHref, '_blank', 'noopener,noreferrer');
      return;
    }
    e.preventDefault();
    setLocation(href);
  }

  function openListingKey(e: KeyboardEvent<HTMLElement>) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    setLocation(href);
  }

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={`Open ${startup.name} startup listing`}
      onClick={openListing}
      onKeyDown={openListingKey}
      className={cn(
        'group relative flex h-full min-h-[280px] w-full min-w-0 max-w-full cursor-pointer flex-col overflow-hidden rounded-[14px] border p-4 text-left text-inherit transition-colors',
        'border-border bg-card text-card-foreground',
        'hover:border-muted-foreground/25',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'dark:border-[#2f3336] dark:bg-gradient-to-b dark:from-[#1a1a1a] dark:to-[#141414] dark:text-white',
        'dark:hover:border-[#536471]',
      )}
    >


      <div className="relative z-0 flex min-h-0 flex-1 flex-col pr-6">
        <div className="flex gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/10 ring-1 ring-black/5 dark:border-white/10 dark:ring-white/5"
            style={{ backgroundColor: logoColor }}
          >
            <img
              src={`https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(startup.name)}`}
              alt=""
              className="h-8 w-8"
              loading="lazy"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-mono text-[15px] font-bold leading-tight text-foreground group-hover:underline dark:text-white">
              {startup.name}
            </h3>
            <p
              className="mt-1.5 inline-block max-w-full truncate rounded-md px-2 py-0.5 text-[11px] font-medium text-foreground/90 dark:text-zinc-100"
              style={{ backgroundColor: `${logoColor}50` }}
              title={startup.category}
            >
              {startup.category}
            </p>
          </div>
        </div>

        <p className="mt-3 line-clamp-2 min-h-0 flex-1 text-[13px] leading-snug text-muted-foreground dark:text-zinc-400">
          {startup.description}
        </p>
      </div>

      <div className="relative z-0 mt-4 border-t border-dashed border-border pt-3 dark:border-zinc-700/80">
        <div className="grid grid-cols-3 gap-2 text-center sm:gap-3">
          <div className="min-w-0">
            <div className="text-[9px] font-bold uppercase leading-tight tracking-wider text-muted-foreground dark:text-zinc-500">
              Revenue (30d)
            </div>
            <div className="mt-1 font-mono text-sm font-bold tabular-nums text-foreground dark:text-zinc-50">
              {formatShortCurrency(startup.revenue)}
            </div>
            {growth != null ? (
              <div
                className={cn(
                  'mt-0.5 font-mono text-[11px] font-semibold',
                  growth.isNeg ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400',
                )}
              >
                {growth.text}
              </div>
            ) : (
              <div className="mt-0.5 h-4" aria-hidden />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[9px] font-bold uppercase leading-tight tracking-wider text-muted-foreground dark:text-zinc-500">
              Asking price
            </div>
            <div className="mt-1 space-y-0.5 font-mono text-sm font-bold tabular-nums text-foreground dark:text-zinc-50">
              {strike != null && (
                <div className="text-[11px] line-through text-muted-foreground dark:text-zinc-500">
                  {formatShortCurrency(strike)}
                </div>
              )}
              <div>{startup.price != null ? formatShortCurrency(startup.price) : '—'}</div>
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[9px] font-bold uppercase leading-tight tracking-wider text-muted-foreground dark:text-zinc-500">
              Multiple
            </div>
            <div className="mt-1 font-mono text-sm font-bold tabular-nums text-foreground dark:text-zinc-50">
              {startup.multiple != null ? `${startup.multiple.toFixed(1)}x` : '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-0 mt-3 border-t border-dashed border-border pt-3 dark:border-zinc-700/80">
        <StartupTripleScores startup={startup} />
      </div>
    </article>
  );
}

export function MoreStartupsForSaleSection() {
  return null;
}