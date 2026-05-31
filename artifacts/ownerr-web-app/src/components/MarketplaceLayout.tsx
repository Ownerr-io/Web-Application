import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronRight, Megaphone, Plus } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { Startup } from "@/lib/marketplace/types";
import { usePublicStartups } from "@/hooks/marketplace/usePublicStartups";
import { CLAIM_SPOTS_TOTAL } from "@/lib/marketplace/claimService";
import { useClaimStats } from "@/hooks/marketplace/useClaims";
import { applyTheme } from "./ThemeToggle";
import { ProductNav } from "@/components/ProductNav";
import { useAddStartup } from "@/context/AddStartupContext";
import { useAuth } from "@/context/AuthContext";
import { useRequireAuth } from "@/lib/platform/requireAuth";
import { AddStartupDialog } from "@/components/AddStartupDialog";
import { HeaderStartupSearch } from "@/components/HeaderStartupSearch";
import { AdvertiseDialog } from "@/components/AdvertiseDialog";
import { SiteFooter } from "@/components/SiteFooter";
import { marketplacePath, MARKETPLACE_BASE } from "@/lib/appPaths";
import { PageBackRow } from "@/components/PageBackRow";
import { MoreStartupsForSaleSection } from "@/components/MoreStartupsForSaleSection";
import { StartupGrowthTicker } from "@/components/StartupGrowthTicker";
import { cn } from "@/lib/utils";

const ROTATING_WITH_AD_SLOT = 4;
const ROTATING_LEFT_SLOTS = 5;
const STARTUP_ROTATE_MS = 7200;

/** Same shell + side gutters for fixed header, scroll main, and side rails: 170px rail | 1.5rem gap (gap-6) | center | … */
const LAYOUT_SHELL = "mx-auto box-border w-full max-w-[1400px] px-4";
const LAYOUT_CENTER_GUTTER =
  "min-w-0 w-full box-border lg:pl-[calc(170px+1.5rem)] lg:pr-[calc(170px+1.5rem)]";
const LAYOUT_RAIL_ROW = "flex w-full min-h-0 min-w-0 flex-1 gap-6";

/** Below fixed header + banner + same top inset as LAYOUT_SHELL `pt-4` in the scroll column (nav row ~3.75rem with py-3). */
const LAYOUT_FIXED_TOP_INSET =
  "pt-[calc(env(safe-area-inset-top,0px)+3.75rem+2.25rem+1rem)]";

function sliceWrap<T>(items: T[], start: number, count: number): T[] {
  if (items.length === 0) return [];
  const result: T[] = [];
  for (let i = 0; i < count; i++) {
    result.push(items[(start + i) % items.length]);
  }
  return result;
}

function expandPool<T>(pool: T[], minCount: number): T[] {
  if (pool.length === 0) return [];
  if (pool.length >= minCount) return pool;
  const out = [...pool];
  let i = 0;
  while (out.length < minCount) {
    out.push(pool[i % pool.length]);
    i++;
  }
  return out;
}

function StartupRailCard({ startup }: { startup: Startup }) {
  const logoColor = startup.logoColor ?? "#E6EAFF";

  return (
    <div className="group relative flex min-h-0 min-w-0 flex-1 flex-col">
      <Link
        href={marketplacePath(`/startup/${startup.slug}`)}
        className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col no-underline"
      >
        <div className="box-border flex h-full min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center rounded-[10px] border border-border bg-card px-2 py-3 text-center shadow-sm transition-transform hover:-translate-y-0.5 sm:px-2.5 sm:py-3 border-border bg-card">
          <div className="flex w-full max-w-full flex-col items-center justify-center gap-1.5 text-center">
            <div
              className="mx-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md sm:h-9 sm:w-9"
              style={{ backgroundColor: logoColor }}
            >
              <img
                src={`https://api.dicebear.com/7.x/shapes/svg?seed=${startup.name}`}
                alt={`${startup.name} avatar`}
                className="h-5 w-5 sm:h-6 sm:w-6"
              />
            </div>
            <div className="w-full shrink-0 truncate px-0.5 text-[12px] font-bold leading-tight text-foreground/90 sm:text-[13px]">
              {startup.name}
            </div>
            <div className="line-clamp-3 w-full max-w-[14ch] shrink-0 text-[9px] leading-snug text-muted-foreground sm:max-w-[16ch] sm:text-[10px]">
              {startup.category}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

function FlipStartupRailCard({
  startup,
  index,
}: {
  startup: Startup;
  index: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col [perspective:1100px]">
      <motion.div
        key={`${startup.name}|${startup.slug}`}
        initial={reduceMotion ? undefined : { rotateY: 92, opacity: 0.75 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{
          duration: reduceMotion ? 0 : 0.48,
          delay: reduceMotion ? 0 : index * 0.065,
          ease: [0.22, 0.61, 0.36, 1],
        }}
        className="flex min-h-0 min-w-0 flex-1 flex-col"
        style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
      >
        <StartupRailCard startup={startup} />
      </motion.div>
    </div>
  );
}

function AdvertiseSidebarSlot({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="box-border flex h-full min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center rounded-[10px] border border-dashed border-zinc-500/60 bg-background px-2 py-3 text-center shadow-sm transition-transform hover:-translate-y-0.5 hover:border-zinc-400 dark:border-zinc-600 dark:hover:border-zinc-500 sm:px-2.5 sm:py-3"
    >
      <div className="flex w-full max-w-full flex-col items-center justify-center gap-1.5">
        <div className="mx-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/60 sm:h-9 sm:w-9">
          <Megaphone
            className="h-3.5 w-3.5 text-foreground sm:h-4 sm:w-4"
            aria-hidden
          />
        </div>
        <div className="shrink-0 text-[12px] font-bold text-foreground sm:text-[13px]">
          Advertise
        </div>
        <div className="line-clamp-3 max-w-[14ch] shrink-0 text-[9px] leading-snug text-muted-foreground sm:max-w-[16ch] sm:text-[10px]">
          1/20 spot left
        </div>
      </div>
    </button>
  );
}

function MobileStartupChipLink({ startup }: { startup: Startup }) {
  const logoColor = startup.logoColor ?? "#E6EAFF";
  return (
    <Link
      href={marketplacePath(`/startup/${startup.slug}`)}
      className="inline-flex shrink-0 items-center gap-2 py-1 pr-6 touch-manipulation"
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md"
        style={{ backgroundColor: logoColor }}
      >
        <img
          src={`https://api.dicebear.com/7.x/shapes/svg?seed=${startup.name}`}
          alt=""
          className="h-4 w-4"
        />
      </span>
      <span className="max-w-[10rem] truncate text-[11px] font-bold leading-tight text-[color:var(--terminal-fg)]">
        {startup.name}
      </span>
    </Link>
  );
}

function MobileRibbonMarquee({
  startups,
  variant,
  footer,
  pauseAnimation,
}: {
  startups: Startup[];
  variant: "default" | "alt";
  footer?: React.ReactNode;
  pauseAnimation?: boolean;
}) {
  const strip = (keyPrefix: string, ariaHidden?: boolean) => (
    <div
      className="flex shrink-0 items-center gap-x-1"
      aria-hidden={ariaHidden ? true : undefined}
    >
      {startups
        .filter((s): s is Startup => Boolean(s?.slug))
        .map((s, i) => (
          <MobileStartupChipLink
            key={`${keyPrefix}-${s.slug}-${i}`}
            startup={s}
          />
        ))}
      {footer ?? null}
    </div>
  );

  return (
    <div className="relative overflow-hidden">
      <div
        className={cn(
          variant === "alt"
            ? "mobile-ribbon-marquee mobile-ribbon-marquee--alt"
            : "mobile-ribbon-marquee",
          pauseAnimation && "[animation-play-state:paused]",
        )}
      >
        {strip("a", false)}
        {strip("b", true)}
      </div>
    </div>
  );
}

function MobileStartupChipRails({
  pool,
  onAdvertise,
  scrollIdle,
}: {
  pool: Startup[];
  onAdvertise: () => void;
  scrollIdle: boolean;
}) {
  const safePool = useMemo(
    () => pool.filter((s): s is Startup => Boolean(s?.slug)),
    [pool],
  );

  const base = useMemo(() => {
    const forSale = safePool.filter((s) => s.forSale);
    return forSale.length > 0 ? forSale : safePool;
  }, [safePool]);

  const coreForChips = useMemo(
    () =>
      base.length === 0
        ? []
        : expandPool(base, Math.min(20, Math.max(12, base.length))),
    [base],
  );

  const topSequence = useMemo(
    () => [...coreForChips, ...coreForChips],
    [coreForChips],
  );

  const bottomSequence = useMemo(() => {
    if (coreForChips.length === 0) return [];
    const start = Math.max(1, Math.floor(coreForChips.length / 3));
    const rotated = sliceWrap(coreForChips, start, coreForChips.length);
    return [...rotated, ...rotated];
  }, [coreForChips]);

  if (base.length === 0) return null;

  const advertiseChip = (
    <button
      type="button"
      onClick={onAdvertise}
      className="inline-flex shrink-0 items-center gap-1.5 py-1 pr-8 pl-1 text-[11px] font-bold text-muted-foreground transition-colors hover:text-foreground"
    >
      <Megaphone className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
      Advertise
    </button>
  );

  return (
    <>
      <div
        className={cn(
          "fixed inset-x-0 top-0 z-[45] border-b border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/95 backdrop-blur-sm supports-[backdrop-filter]:bg-[color:var(--terminal-surface)]/90 lg:hidden",
          "transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
          scrollIdle
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-full opacity-0",
        )}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        aria-hidden={!scrollIdle}
      >
        <div
          className="flex h-11 items-center"
          role="region"
          aria-label="Startups"
        >
          <MobileRibbonMarquee
            startups={topSequence}
            variant="default"
            pauseAnimation={!scrollIdle}
          />
        </div>
      </div>

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-[45] border-t border-border/60 bg-background/90 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 lg:hidden",
          "transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
          scrollIdle
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-full opacity-0",
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-hidden={!scrollIdle}
      >
        <div
          className="flex h-11 items-center"
          role="region"
          aria-label="More startups"
        >
          <MobileRibbonMarquee
            startups={bottomSequence}
            variant="alt"
            footer={advertiseChip}
            pauseAnimation={!scrollIdle}
          />
        </div>
      </div>
    </>
  );
}

function StartupRail({
  pool,
  railSide,
  showAdvertise = false,
  onAdvertise,
}: {
  pool: Startup[];
  railSide: "left" | "right";
  showAdvertise?: boolean;
  onAdvertise?: () => void;
}) {
  const rotatingCount = showAdvertise
    ? ROTATING_WITH_AD_SLOT
    : ROTATING_LEFT_SLOTS;
  /** Same floor for both rails so rotation stays in sync; long enough to stagger left vs right windows. */
  const minExpanded = Math.max(
    ROTATING_LEFT_SLOTS * 2,
    pool.length,
    ROTATING_LEFT_SLOTS,
  );
  const expanded = useMemo(
    () => expandPool(pool, minExpanded),
    [pool, minExpanded],
  );

  /** Stagger by the left rail window so row N on the right is not the same startup as row N on the left. */
  const rotationPhase = useMemo(() => {
    if (railSide === "left") return 0;
    const L = expanded.length;
    if (L <= 1) return 0;
    return ROTATING_LEFT_SLOTS % L;
  }, [railSide, expanded.length]);

  const [offset, setOffset] = useState(0);

  const visible = useMemo(
    () =>
      sliceWrap(
        expanded,
        (offset + rotationPhase) % expanded.length,
        rotatingCount,
      ),
    [expanded, offset, rotationPhase, rotatingCount],
  );

  useEffect(() => {
    if (expanded.length <= 1) return;
    const id = window.setInterval(() => {
      setOffset((o) => (o + 1) % expanded.length);
    }, STARTUP_ROTATE_MS);
    return () => window.clearInterval(id);
  }, [expanded.length]);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 max-h-full flex-col gap-2 overflow-hidden">
      {visible.map((s, i) => (
        <FlipStartupRailCard
          key={`${railSide}-${offset}-${i}-${s.slug}`}
          startup={s}
          index={i}
        />
      ))}
      {showAdvertise && onAdvertise ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <AdvertiseSidebarSlot onClick={onAdvertise} />
        </div>
      ) : null}
    </div>
  );
}

export function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  const { data: pool = [] } = usePublicStartups();
  const { data: claimStats } = useClaimStats();
  const claimSpotsClaimed = claimStats?.claimed ?? 0;
  const [location] = useLocation();
  const { addOpen, setAddOpen, openAddStartup } = useAddStartup();
  const { isAuthenticated } = useAuth();
  const { requireAuth } = useRequireAuth();
  const [advertiseOpen, setAdvertiseOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileScrollIdle, setMobileScrollIdle] = useState(true);
  const mobileScrollIdleTimerRef = useRef<number | null>(null);
  const isHome =
    location === MARKETPLACE_BASE || location === `${MARKETPLACE_BASE}/`;
  const isAcquire = location === marketplacePath("/acquire");
  const isStartupDetail = location.startsWith(`${MARKETPLACE_BASE}/startup/`);
  const isFounderProfile = location.startsWith(`${MARKETPLACE_BASE}/founder/`);
  const isSlimChrome = isAcquire || isStartupDetail || isFounderProfile;

  useEffect(() => {
    applyTheme();
  }, []);

  useEffect(() => {
    const isMobileLayout = () =>
      window.matchMedia("(max-width: 1023px)").matches;
    const clearTimer = () => {
      if (mobileScrollIdleTimerRef.current != null) {
        window.clearTimeout(mobileScrollIdleTimerRef.current);
        mobileScrollIdleTimerRef.current = null;
      }
    };
    const onScroll = () => {
      if (!isMobileLayout()) return;
      setMobileScrollIdle(false);
      clearTimer();
      mobileScrollIdleTimerRef.current = window.setTimeout(() => {
        setMobileScrollIdle(true);
        mobileScrollIdleTimerRef.current = null;
      }, 220);
    };
    const onScrollEnd = () => {
      if (!isMobileLayout()) return;
      clearTimer();
      setMobileScrollIdle(true);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scrollend", onScrollEnd, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scrollend", onScrollEnd);
      clearTimer();
    };
  }, []);

  return (
    <div className="acquire-terminal-palette min-h-screen selection:bg-[color:var(--terminal-ochre)] selection:text-[color:var(--brand-accent-ink)]">
      <MobileStartupChipRails
        pool={pool}
        onAdvertise={() => setAdvertiseOpen(true)}
        scrollIdle={mobileScrollIdle}
      />

      {/* Fixed navbar: mobile top follows ribbon (below chips when idle, flush under safe area when scrolling). */}
      <header
        className={cn(
          "fixed left-0 right-0 z-40 border-b border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/95 text-[color:var(--terminal-fg)] shadow-[0_1px_0_0_rgba(0,0,0,0.35)] backdrop-blur-md supports-[backdrop-filter]:bg-[color:var(--terminal-surface)]/90",
          "transition-[top] duration-200 ease-out motion-reduce:transition-none",
          "pt-0 lg:top-0 lg:pt-[env(safe-area-inset-top,0px)]",
          mobileScrollIdle
            ? "top-[calc(env(safe-area-inset-top,0px)+2.75rem)]"
            : "top-[env(safe-area-inset-top,0px)]",
        )}
      >
        {/* Same bar + inner shell as marketing pages — do not wrap in LAYOUT_CENTER_GUTTER or the nav shrinks between side rails. */}
        <ProductNav
          terminalChrome
          onNavigate={() => setMobileNavOpen(false)}
          mobileSheetOpen={mobileNavOpen}
          onMobileSheetOpenChange={setMobileNavOpen}
        />
      </header>

      <StartupGrowthTicker />

      {/* z-30: shell/gutter use pointer-events-none so fixed side rails (z-20) stay clickable; only
          <main> re-enables hits for center content (otherwise the wide shell would steal clicks over the rails). */}
      <div
        className={cn(
          "pointer-events-none relative z-30 box-border transition-[padding-top] duration-200 ease-out motion-reduce:transition-none",
          mobileScrollIdle
            ? "pt-[calc(env(safe-area-inset-top,0px)+2.75rem+3.75rem)] lg:pt-[calc(env(safe-area-inset-top,0px)+3.75rem+2.25rem)]"
            : "pt-[calc(env(safe-area-inset-top,0px)+3.75rem)] lg:pt-[calc(env(safe-area-inset-top,0px)+3.75rem+2.25rem)]",
        )}
      >
        <div
          className={cn(
            `${LAYOUT_SHELL} pointer-events-none pt-4 transition-[padding-bottom] duration-200 ease-out motion-reduce:transition-none`,
            mobileScrollIdle
              ? "pb-[calc(env(safe-area-inset-bottom,0px)+3.25rem)] lg:pb-10"
              : "pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] lg:pb-10",
          )}
        >
          <div className={`${LAYOUT_CENTER_GUTTER} pointer-events-none`}>
            <main
              data-scroll-reset
              className="pointer-events-auto brand-app-page w-full min-w-0 max-w-full box-border"
            >
              {!isHome ? <PageBackRow className="mb-6 hidden lg:flex" /> : null}
              {isSlimChrome ? null : (
                <div
                  className={`flex flex-col ${
                    isHome
                      ? "mb-3 gap-3 text-left sm:text-center"
                      : "mb-5 gap-3 text-center sm:gap-4"
                  }`}
                >
                  <h1
                    className={`w-full max-w-[min(100%,1200px)] font-bold tracking-tighter text-balance text-[color:var(--terminal-fg)] leading-[1.08] sm:leading-none ${
                      isHome
                        ? "mx-0 text-2xl sm:mx-auto sm:text-3xl md:text-4xl lg:text-[clamp(1.75rem,2.35vw+0.45rem,3.75rem)]"
                        : "mx-auto px-2 text-2xl sm:text-3xl md:text-4xl lg:text-[clamp(1.75rem,2.35vw+0.45rem,3.75rem)]"
                    }`}
                  >
                    The database of verified startup revenues
                  </h1>

                  <div className="mx-0 flex w-full max-w-xl flex-col gap-2 sm:mx-auto sm:flex-row sm:items-stretch">
                    <HeaderStartupSearch className="min-w-0 w-full sm:flex-1" />
                    <button
                      type="button"
                      onClick={() =>
                        isAuthenticated
                          ? openAddStartup()
                          : requireAuth({
                              action: "add_startup",
                              onAllowed: openAddStartup,
                            })
                      }
                      className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-1 rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)] px-5 font-bold text-[color:var(--terminal-fg)] shadow-sm transition-transform hover:-translate-y-0.5 sm:w-auto sm:justify-center"
                    >
                      <Plus className="h-4 w-4 shrink-0" /> Add startup
                    </button>
                  </div>

                  <AddStartupDialog open={addOpen} onOpenChange={setAddOpen} />
                </div>
              )}

              {!isSlimChrome && (
                <Link
                  href={marketplacePath("/claim")}
                  className={`group promo-strip flex w-full cursor-pointer flex-col items-stretch gap-3 rounded-[10px] border border-dashed border-[color:var(--terminal-border)] p-3 text-inherit no-underline shadow-sm transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--terminal-ochre)] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4 transform -rotate-[0.5deg] hover:rotate-0 ${isHome ? "mb-4" : "mb-6"}`}
                >
                  <div className="flex min-w-0 items-start gap-2.5 sm:items-center sm:gap-3">
                    <div className="platform-gradient-bg mt-1.5 h-2 w-2 shrink-0 animate-pulse rounded-full sm:mt-0" />
                    <span className="mp-body min-w-0 text-left text-xs font-bold leading-snug sm:text-sm">
                      First {CLAIM_SPOTS_TOTAL} Founders / Investors get a FREE
                      listing + FREE explore for life
                    </span>
                  </div>
                  <div className="flex w-full min-w-0 flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex w-full min-w-0 flex-col gap-1 sm:w-36">
                      <div className="mp-label flex justify-between text-xs font-bold">
                        <span>
                          {claimSpotsClaimed} / {CLAIM_SPOTS_TOTAL}
                        </span>
                        <span>claimed</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[color:var(--terminal-surface-2)]">
                        <div
                          className="mp-progress-fill h-full rounded-full"
                          style={{
                            width: `${Math.round((claimSpotsClaimed / CLAIM_SPOTS_TOTAL) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="mp-link inline-flex shrink-0 items-center justify-center gap-0.5 self-center text-sm font-bold group-hover:underline sm:self-auto">
                      Claim spot
                      <ChevronRight
                        className="h-3.5 w-3.5 shrink-0 opacity-90"
                        aria-hidden
                      />
                    </span>
                  </div>
                </Link>
              )}

              <div className="pointer-events-auto animate-in fade-in duration-500">
                {children}
              </div>
              {!isHome ? (
                <div className="pointer-events-auto relative z-[1]">
                  <MoreStartupsForSaleSection />
                </div>
              ) : null}
              <SiteFooter />
            </main>
          </div>
        </div>
      </div>

      {/* Fixed side rails: same 1400px + px-4 + 170|gap-6|center|gap-6|170 as header/main */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 hidden h-full min-h-0 lg:block">
        <div
          className={`${LAYOUT_SHELL} pointer-events-none flex h-full min-h-0 flex-col ${LAYOUT_FIXED_TOP_INSET}`}
        >
          <div className={`${LAYOUT_RAIL_ROW} pointer-events-none`}>
            <div className="pointer-events-auto flex w-[170px] shrink-0 flex-col min-h-0">
              <StartupRail pool={pool} railSide="left" />
            </div>
            <div className="pointer-events-none min-h-0 min-w-0 flex-1" />
            <div className="pointer-events-auto flex w-[170px] shrink-0 flex-col min-h-0">
              <StartupRail
                pool={pool}
                railSide="right"
                showAdvertise
                onAdvertise={() => setAdvertiseOpen(true)}
              />
            </div>
          </div>
        </div>
      </div>

      <AdvertiseDialog open={advertiseOpen} onOpenChange={setAdvertiseOpen} />
    </div>
  );
}
