import { useMemo } from 'react';
import { mockStartups } from '@/lib/mockData';
import { cn } from '@/lib/utils';

interface TickerItem {
  slug: string;
  name: string;
  growth: number; // percentage
  logoColor: string;
}

function formatGrowthPct(g: number): string {
  const sign = g >= 0 ? '+' : '';
  return `${sign}${g.toFixed(1)}%`;
}

function useTickerItems(): TickerItem[] {
  return useMemo(() => {
    return mockStartups.map((s) => {
      const growth =
        typeof s.revenueGrowth30dPct === 'number'
          ? s.revenueGrowth30dPct
          : s.momGrowth ?? 0;
      return {
        slug: s.slug,
        name: s.name,
        growth,
        logoColor: s.logoColor ?? '#E6EAFF',
      };
    });
  }, []);
}

function TickerStrip({ items, ariaHidden }: { items: TickerItem[]; ariaHidden?: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-1" aria-hidden={ariaHidden}>
      {items.map((item, i) => (
        <div
          key={`${item.slug}-${i}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border/60 bg-background/60 px-2.5 py-1 backdrop-blur-sm"
        >
          <span
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm"
            style={{ backgroundColor: item.logoColor }}
          >
            <img
              src={`https://api.dicebear.com/7.x/shapes/svg?seed=${item.name}`}
              alt=""
              className="h-3.5 w-3.5"
              loading="eager"
              decoding="async"
            />
          </span>
          <span className="max-w-[8rem] shrink-0 truncate text-[11px] font-bold text-foreground sm:max-w-[10rem] sm:text-xs">
            {item.name}
          </span>
          <span
            className={cn(
              'shrink-0 text-[11px] font-bold tabular-nums sm:text-xs',
              item.growth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
            )}
          >
            {formatGrowthPct(item.growth)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function StartupGrowthTicker() {
  const items = useTickerItems();

  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[35] hidden overflow-hidden border-b border-border/50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 lg:block"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 3.5rem)' }}
      role="region"
      aria-label="Top startup growth"
    >
      <div className="flex h-9 items-center">
        <div className="growth-ticker-marquee flex w-max">
          <TickerStrip items={items} />
          <TickerStrip items={items} ariaHidden />
        </div>
      </div>
    </div>
  );
}

