import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Flame, Plus } from 'lucide-react';

import { mockStartups, type Startup } from '@/lib/mockData';
import { mergeWithUserStartups } from '@/lib/userStartups';
import { useAddStartup } from '@/context/AddStartupContext';
import { FEED_BONUS_DEAL, FEED_POSTING_STREAKS, FEED_TOP_STARTUPS } from '@/lib/feedSidebarData';
import { cn, dicebearShapesSvg, formatShortCurrency, founderAvatarUrl } from '@/lib/utils';
import { FounderLink, StartupLink } from '@/components/EntityLink';

type RotatingItem =
  | { kind: 'startup'; startup: Startup }
  | { kind: 'bonus'; deal: typeof FEED_BONUS_DEAL };

export function FeedSidebar() {
  const { openAddStartup } = useAddStartup();

  const rotation = useMemo<RotatingItem[]>(() => {
    const forSale = mergeWithUserStartups(mockStartups).filter((s) => s.forSale && s.price != null);
    const fromStartups = forSale.map((s) => ({ kind: 'startup' as const, startup: s }));
    return [...fromStartups, { kind: 'bonus' as const, deal: FEED_BONUS_DEAL }];
  }, []);

  const [dealIdx, setDealIdx] = useState(0);

  useEffect(() => {
    if (rotation.length <= 1) return;
    const id = window.setInterval(() => {
      setDealIdx((i) => (i + 1) % rotation.length);
    }, 6500);
    return () => window.clearInterval(id);
  }, [rotation.length]);

  const current = rotation[dealIdx] ?? rotation[0];
  const currentKey = current
    ? current.kind === 'startup'
      ? `s-${current.startup.slug}`
      : 'bonus-deal'
    : 'empty';

  return (
    <aside
      className="hidden w-full min-w-0 max-w-[380px] shrink-0 self-stretch min-h-0 lg:block"
      aria-label="Feed sidebar"
    >
      <div className="sticky top-6 z-30 w-full">
        <div className="flex max-h-[calc(100dvh-2rem)] min-h-0 w-full flex-col gap-5 overflow-y-auto overflow-x-hidden overscroll-y-contain pb-2 [scrollbar-gutter:stable]">
          <div className="shrink-0 rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-bold">List your startup</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-snug">
              Share updates with the TrustMRR community.
            </p>
            <button
              type="button"
              onClick={openAddStartup}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-[10px] bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" />
              Add your startup
            </button>
          </div>

          <div className="shrink-0 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold">Top startups</h3>
              <Link
                href="/#leaderboard"
                className="inline-flex items-center gap-0.5 text-[10px] font-bold text-muted-foreground hover:text-foreground"
              >
                View all
                <ChevronRight className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
              </Link>
            </div>
            <ol className="max-h-[min(200px,28vh)] space-y-3 overflow-y-auto pr-1 text-sm [scrollbar-gutter:stable]">
              {FEED_TOP_STARTUPS.map((row, i) => (
                <li key={`${row.slug}-${i}`}>
                  <Link
                    href={`/startup/${row.slug}`}
                    className="flex items-start gap-2 rounded-lg p-1.5 -m-1.5 transition-colors hover:bg-muted/50"
                  >
                    <span className="w-5 shrink-0 text-right text-xs font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted text-[10px] font-bold">
                      {row.letter ? (
                        row.letter
                      ) : (
                        <img
                          src={dicebearShapesSvg(row.name)}
                          alt=""
                          width={24}
                          height={24}
                          className="h-6 w-6"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-xs font-bold leading-tight">{row.name}</div>
                      <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-[11px]">
                        <span className="font-bold tabular-nums">{row.mrr}</span>
                        <span className="font-bold text-emerald-500 tabular-nums">
                          +{row.growthPct.toLocaleString()}%
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          </div>

          <div className="shrink-0 rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-bold">Posting streaks</h3>
            <ol className="max-h-[min(200px,28vh)] space-y-2 overflow-y-auto pr-1 text-sm [scrollbar-gutter:stable]">
              {FEED_POSTING_STREAKS.map((row, i) => {
                const rowInner = (
                  <>
                    <span className="w-5 shrink-0 text-right text-xs font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                    <img
                      src={founderAvatarUrl(row.seed)}
                      alt=""
                      width={28}
                      height={28}
                      className="h-7 w-7 shrink-0 rounded-full border border-border bg-muted"
                    />
                    <span className="min-w-0 flex-1 truncate text-xs font-bold hover:underline">
                      {row.name}
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-bold text-rose-500">
                      <Flame className="h-3.5 w-3.5" />
                      {row.streak}
                    </span>
                  </>
                );
                return (
                <li key={row.seed + i}>
                  {row.founderHandle ? (
                    <FounderLink
                      handle={row.founderHandle}
                      className="flex items-center gap-2 rounded-md py-1 text-foreground"
                    >
                      {rowInner}
                    </FounderLink>
                  ) : (
                    <div className="flex items-center gap-2 rounded-md py-1">
                      {rowInner}
                    </div>
                  )}
                </li>
                );
              })}
            </ol>
          </div>

          <div className="shrink-0 overflow-hidden rounded-xl border border-border bg-card p-0 shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-bold">Deals of the week</h3>
              <Link
                href="/acquire"
                className="inline-flex items-center gap-0.5 text-[10px] font-bold text-muted-foreground transition-colors hover:text-foreground"
              >
                View all
                <ChevronRight className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
              </Link>
            </div>
            <div className="relative p-4">
              {rotation.length > 1 && (
                <div className="mb-3 flex justify-center gap-1.5" role="tablist" aria-label="Deal carousel">
                  {rotation.map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        'h-1.5 w-1.5 rounded-full transition-colors',
                        i === dealIdx ? 'bg-foreground' : 'bg-muted-foreground/30',
                      )}
                    />
                  ))}
                </div>
              )}
              <div className="relative min-h-[188px]">
                <AnimatePresence mode="wait" initial={false}>
                  {current && (
                    <motion.div
                      key={currentKey}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                    >
                      {current.kind === 'startup' ? (
                        <FeedDealFromStartup s={current.startup} />
                      ) : (
                        <FeedBonusDealCard />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function FeedBonusDealCard() {
  const b = FEED_BONUS_DEAL;
  return (
    <div>
      <div className="mb-1 flex items-start justify-between gap-2">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border text-base font-bold shadow-inner"
          style={{ backgroundColor: b.logoColor, color: 'rgba(255,255,255,0.95)' }}
        >
          {b.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 text-right">
          <StartupLink slug={b.slug} className="block text-right text-sm font-bold leading-tight line-clamp-2">
            {b.name}
          </StartupLink>
          <span className="mt-0.5 inline-block rounded border border-border bg-secondary px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-secondary-foreground">
            FOR SALE
          </span>
        </div>
      </div>
      <p className="mt-2 line-clamp-3 text-xs text-muted-foreground leading-relaxed">{b.description}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-dotted border-border/80 bg-background/50 py-2 text-center text-[10px]">
        <div>
          <div className="text-muted-foreground">Price</div>
          <div className="mt-0.5 font-bold tabular-nums">{formatShortCurrency(b.price)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">MRR</div>
          <div className="mt-0.5 font-bold tabular-nums">{formatShortCurrency(b.mrr)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Multiple</div>
          <div className="mt-0.5 font-bold tabular-nums">{b.multiple.toFixed(1)}x</div>
        </div>
      </div>
      <Link
        href="/acquire"
        className="mt-3 flex w-full items-center justify-center rounded-lg border border-border bg-card py-2 text-center text-xs font-bold text-foreground transition-colors hover:bg-muted"
      >
        See listing
      </Link>
    </div>
  );
}

function FeedDealFromStartup({ s }: { s: Startup }) {
  return (
    <div>
      <div className="mb-1 flex items-start justify-between gap-2">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border shadow-inner"
          style={{ backgroundColor: s.logoColor }}
        >
          <img
            src={dicebearShapesSvg(s.name)}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9"
          />
        </div>
        <div className="min-w-0 flex-1 text-right">
          <Link
            href={`/startup/${s.slug}`}
            className="text-sm font-bold leading-tight line-clamp-2 hover:underline"
          >
            {s.name}
          </Link>
          {s.forSale && (
            <span className="mt-0.5 inline-block rounded border border-border bg-secondary px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-secondary-foreground">
              FOR SALE
            </span>
          )}
        </div>
      </div>
      <p className="mt-2 line-clamp-3 text-xs text-muted-foreground leading-relaxed">{s.description}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-dotted border-border/80 bg-background/50 py-2 text-center text-[10px]">
        <div>
          <div className="text-muted-foreground">Price</div>
          <div className="mt-0.5 font-bold tabular-nums">
            {s.price != null ? formatShortCurrency(s.price) : '—'}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">MRR</div>
          <div className="mt-0.5 font-bold tabular-nums">{formatShortCurrency(s.revenue)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Multiple</div>
          <div className="mt-0.5 font-bold tabular-nums">
            {s.multiple != null ? `${s.multiple.toFixed(1)}x` : '—'}
          </div>
        </div>
      </div>
      <Link
        href={`/startup/${s.slug}`}
        className="mt-3 flex w-full items-center justify-center rounded-lg border border-border bg-card py-2 text-center text-xs font-bold text-foreground transition-colors hover:bg-muted"
      >
        View deal
      </Link>
    </div>
  );
}
