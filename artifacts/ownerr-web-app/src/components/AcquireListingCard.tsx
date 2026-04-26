import { Link } from 'wouter';
import { Eye, Heart } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Startup } from '@/lib/mockData';
import { cn, formatShortCurrency } from '@/lib/utils';
import { StartupTripleScores } from '@/components/StartupTripleScores';

const SCORE_STRIP_CLASS =
  'text-center [&>div:nth-child(2)]:border-l [&>div:nth-child(2)]:border-border/60 [&>div:nth-child(2)]:pl-1 [&>div:nth-child(3)]:border-l [&>div:nth-child(3)]:border-border/60 [&>div:nth-child(3)]:pl-1 dark:[&>div:nth-child(2)]:border-[#2f3336] dark:[&>div:nth-child(3)]:border-[#2f3336] sm:[&>div:nth-child(2)]:pl-2 sm:[&>div:nth-child(3)]:pl-2';

function formatGrowthPct(n: number | null | undefined): string | null {
  if (n == null) return null;
  const sign = n > 0 ? '↑' : '↓';
  return `${sign}${Math.abs(n).toLocaleString('en-US')}%`;
}

function MetricCell({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0 px-0.5 text-center', className)}>
      <div className="mx-auto max-w-[28ch] font-mono text-[9px] font-bold leading-snug text-muted-foreground dark:text-[#71767b] sm:text-[10px]">
        {label}
      </div>
      <div className="mt-1.5 min-w-0 font-mono text-sm font-bold tabular-nums leading-tight text-foreground dark:text-white sm:text-[15px]">
        {children}
      </div>
    </div>
  );
}

export function AcquireListingCard({ startup, footer }: { startup: Startup; footer?: ReactNode }) {
  const views = startup.listingViews ?? Math.round(startup.customers * 1.2);
  const favs = startup.listingFavorites ?? Math.round(views / 400);
  const growth = formatGrowthPct(startup.revenueGrowth30dPct ?? null);
  const strike = startup.askingPriceStrike;

  return (
    <div className="shine-effect flex h-full flex-col overflow-hidden rounded-[14px] border border-border bg-card text-card-foreground transition-colors hover:border-muted-foreground/30 dark:border-[#2f3336] dark:bg-[#121212] dark:text-white dark:hover:border-[#536471]">
      <Link
        href={`/startup/${startup.slug}`}
        className="group flex min-h-[260px] flex-1 flex-col px-3 pb-3 pt-3.5 sm:min-h-[300px] sm:px-4 sm:pt-4"
      >
        <article className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="shrink-0">
            <div className="flex items-start gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-black/5 dark:ring-white/10"
                style={{ backgroundColor: startup.logoColor }}
              >
                <img
                  src={`https://api.dicebear.com/7.x/shapes/svg?seed=${startup.name}`}
                  alt={`${startup.name} avatar`}
                  className="h-7 w-7"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-mono text-[15px] font-bold leading-tight group-hover:underline">
                      {startup.name}
                    </h3>
                    <p className="mt-0.5 truncate font-mono text-[12px] text-muted-foreground dark:text-[#71767b]">
                      {startup.category}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5 text-[10px] tabular-nums text-muted-foreground dark:text-[#71767b]">
                    <span className="inline-flex items-center gap-0.5 font-mono font-bold">
                      <Eye className="h-3 w-3" strokeWidth={2} aria-hidden />
                      {views >= 1000 ? `${(views / 1000).toFixed(1)}k` : views}
                    </span>
                    <span className="inline-flex items-center gap-0.5 font-mono font-bold">
                      <Heart className="h-3 w-3" strokeWidth={2} aria-hidden />
                      {favs}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 py-1">
            <div className="rounded-lg border border-border/80 bg-muted/15 px-2 py-3 dark:border-[#2f3336] dark:bg-zinc-900/35 sm:px-3">
              <div className="grid grid-cols-3 gap-x-1 gap-y-2 sm:gap-x-2">
                <MetricCell label="Revenue (30 D)">
                  <span className="block truncate" title={formatShortCurrency(startup.revenue)}>
                    {formatShortCurrency(startup.revenue)}
                  </span>
                  {growth != null ? (
                    <div className="mt-1 truncate font-mono text-[10px] font-semibold text-emerald-500 dark:text-emerald-400">
                      {growth}
                    </div>
                  ) : null}
                </MetricCell>
                <MetricCell label="Asking price" className="border-l border-border/60 dark:border-[#2f3336]">
                  <div className="mx-auto min-w-0 max-w-full space-y-0.5 text-center">
                    {strike != null ? (
                      <div
                        className="truncate font-mono text-[11px] font-semibold text-muted-foreground line-through dark:text-[#71767b]"
                        title={formatShortCurrency(strike)}
                      >
                        {formatShortCurrency(strike)}
                      </div>
                    ) : null}
                    <span
                      className="block truncate"
                      title={startup.price != null ? formatShortCurrency(startup.price) : undefined}
                    >
                      {startup.price != null ? formatShortCurrency(startup.price) : '—'}
                    </span>
                  </div>
                </MetricCell>
                <MetricCell label="Revenue multiple" className="border-l border-border/60 dark:border-[#2f3336]">
                  <span className="block truncate">{startup.multiple != null ? `${startup.multiple.toFixed(1)}x` : '—'}</span>
                </MetricCell>
              </div>
            </div>

            <StartupTripleScores
              startup={startup}
              layout="grid"
              compact
              fullScoreLabels
              className={SCORE_STRIP_CLASS}
            />
          </div>

          <p className="line-clamp-2 shrink-0 font-mono text-[11px] leading-snug text-foreground/90 dark:text-[#e7e9ea]">
            {startup.description}
          </p>
        </article>
      </Link>
      {footer ? (
        <div
          className="border-t border-border bg-muted/10 px-3 pb-3 pt-2.5 dark:border-[#2f3336] dark:bg-black/25"
          onClick={(e) => e.stopPropagation()}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}
