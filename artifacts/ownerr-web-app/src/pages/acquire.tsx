import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { ChevronRight, Info, SlidersHorizontal } from 'lucide-react';
import { mockStartups, type Category, Startup } from '@/lib/mockData';
import { mergeWithUserStartups, USER_STARTUPS_CHANGED_EVENT } from '@/lib/userStartups';
import { getUserStartupsDB } from '@/lib/db';
import { ACQUIRE_GRID_ROWS, ACQUIRE_MARKETPLACE_TOTAL } from '@/lib/acquireMarketplaceData';
import { AcquireListingCard } from '@/components/AcquireListingCard';
import { MockAcquireBidPanel } from '@/components/mock-bidding/MockAcquireBidPanel';
import { FoundersSoldSection } from '@/components/FoundersSoldSection';
import { useAddStartup } from '@/context/AddStartupContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const acquireOrder = new Map(ACQUIRE_GRID_ROWS.map((r, i) => [r.slug, i]));

/** Light: semantic; dark: X-style panels */
const FILTER_PANEL =
  'max-h-[calc(100dvh-10.5rem)] overflow-y-auto overscroll-contain rounded-[14px] border border-border bg-muted/50 p-4 font-mono text-foreground dark:border-[#2f3336] dark:bg-[#0a0a0a] dark:text-white';
const FILTER_LABEL = 'text-[10px] font-bold uppercase tracking-wide text-muted-foreground dark:text-[#71767b]';
const FILTER_SELECT_TRIGGER =
  'h-10 border-border bg-background font-mono text-sm text-foreground dark:border-[#2f3336] dark:bg-[#16181c] dark:text-white';
const FILTER_SELECT_TRIGGER_SPACED = `mb-4 ${FILTER_SELECT_TRIGGER}`;
const FILTER_SELECT_CONTENT =
  'border-border bg-popover font-mono text-popover-foreground dark:border-[#2f3336] dark:bg-[#16181c] dark:text-white';
const FILTER_INPUT =
  'h-9 w-full min-w-0 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary dark:border-[#2f3336] dark:bg-[#16181c] dark:text-white dark:placeholder:text-[#536471] dark:focus:ring-[#1d9bf0]';
const FILTER_MUTED = 'text-muted-foreground dark:text-[#71767b]';
const FILTER_DISABLED =
  'h-9 w-full cursor-not-allowed rounded-md border border-border bg-muted/60 px-2 text-xs text-muted-foreground dark:border-[#2f3336] dark:bg-[#16181c]/40';
const SELECT_ITEM =
  'cursor-pointer focus:bg-accent focus:text-accent-foreground dark:focus:bg-[#2f3336] dark:focus:text-white';

const PAYMENT_PROVIDERS = [
  'Stripe',
  'LemonSqueezy',
  'Polar',
  'DodoPayment',
  'Paddle',
  'RevenueCat',
  'Superwall',
  'Creem',
] as const;

const FILTER_CATEGORIES: (Category | 'All')[] = [
  'All',
  'SaaS',
  'Marketing',
  'Artificial Intelligence',
  'Content Creation',
  'Developer Tools',
  'Customer Support',
  'Social Media',
  'Mobile Apps',
  'Health',
  'Education',
  'Crypto & Web3',
];

type SortMode = 'best_deals' | 'revenue_desc' | 'price_asc';

const FILTER_SET = new Set(FILTER_CATEGORIES as readonly (Category | 'All')[]);

function categoryFromQueryString(wouterSearch: string): Category | 'All' {
  const q = wouterSearch.startsWith('?') ? wouterSearch.slice(1) : wouterSearch;
  const raw = new URLSearchParams(q).get('category');
  if (raw == null || raw === '' || raw === 'All') return 'All';
  if (FILTER_SET.has(raw as Category | 'All')) return raw as Category;
  return 'All';
}

function FilterMinMax({
  label,
  min,
  max,
  onMin,
  onMax,
  prefix,
  suffix,
}: {
  label: string;
  min: string;
  max: string;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
  prefix?: boolean;
  suffix?: string;
}) {
  return (
    <div>
      <span className={`mb-1 block ${FILTER_LABEL}`}>{label}</span>
      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="relative min-w-0">
          {prefix ? (
            <span className={`pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 ${FILTER_MUTED}`}>$</span>
          ) : null}
          <input
            value={min}
            onChange={(e) => onMin(e.target.value)}
            placeholder="Min"
            className={cn(FILTER_INPUT, prefix ? 'pl-5' : '', suffix ? 'pr-6' : '')}
          />
          {suffix ? (
            <span className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 ${FILTER_MUTED}`}>{suffix}</span>
          ) : null}
        </div>
        <div className="relative min-w-0">
          {prefix ? (
            <span className={`pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 ${FILTER_MUTED}`}>$</span>
          ) : null}
          <input
            value={max}
            onChange={(e) => onMax(e.target.value)}
            placeholder="Max"
            className={cn(FILTER_INPUT, prefix ? 'pl-5' : '', suffix ? 'pr-6' : '')}
          />
          {suffix ? (
            <span className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 ${FILTER_MUTED}`}>{suffix}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type AcquireFiltersBodyProps = {
  /** When true, shows sort at top (mobile sheet). Desktop sidebar omits. */
  includeSort?: boolean;
  sort: SortMode;
  setSort: (v: SortMode) => void;
  category: Category | 'All';
  setCategoryWithUrl: (v: Category | 'All') => void;
  revMin: string;
  revMax: string;
  setRevMin: (v: string) => void;
  setRevMax: (v: string) => void;
  mrrMin: string;
  mrrMax: string;
  setMrrMin: (v: string) => void;
  setMrrMax: (v: string) => void;
  growthMin: string;
  growthMax: string;
  setGrowthMin: (v: string) => void;
  setGrowthMax: (v: string) => void;
  askMin: string;
  askMax: string;
  setAskMin: (v: string) => void;
  setAskMax: (v: string) => void;
};

function AcquireMarketplaceFiltersBody({
  includeSort = false,
  sort,
  setSort,
  category,
  setCategoryWithUrl,
  revMin,
  revMax,
  setRevMin,
  setRevMax,
  mrrMin,
  mrrMax,
  setMrrMin,
  setMrrMax,
  growthMin,
  growthMax,
  setGrowthMin,
  setGrowthMax,
  askMin,
  askMax,
  setAskMin,
  setAskMax,
}: AcquireFiltersBodyProps) {
  return (
    <>
      {includeSort ? (
        <>
          <label className={`mb-1 block ${FILTER_LABEL}`}>Sort</label>
          <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
            <SelectTrigger className={FILTER_SELECT_TRIGGER_SPACED}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={FILTER_SELECT_CONTENT}>
              <SelectItem value="best_deals" className={SELECT_ITEM}>
                Best deals (default)
              </SelectItem>
              <SelectItem value="revenue_desc" className={SELECT_ITEM}>
                <span className="inline-flex items-center gap-1 font-mono">
                  <span>Revenue (high</span>
                  <ChevronRight className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                  <span>low)</span>
                </span>
              </SelectItem>
              <SelectItem value="price_asc" className={SELECT_ITEM}>
                <span className="inline-flex items-center gap-1 font-mono">
                  <span>Asking price (low</span>
                  <ChevronRight className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                  <span>high)</span>
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </>
      ) : null}

      <label className={`mb-1 block ${FILTER_LABEL}`}>Categories</label>
      <Select value={category} onValueChange={(v) => setCategoryWithUrl(v as Category | 'All')}>
        <SelectTrigger className={FILTER_SELECT_TRIGGER_SPACED}>
          <SelectValue placeholder="Select categories..." />
        </SelectTrigger>
        <SelectContent className={FILTER_SELECT_CONTENT}>
          {FILTER_CATEGORIES.map((c) => (
            <SelectItem key={c} value={c} className={SELECT_ITEM}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="space-y-4">
        <FilterMinMax
          label="Revenue (last 30 days)"
          min={revMin}
          max={revMax}
          onMin={setRevMin}
          onMax={setRevMax}
          prefix
        />
        <FilterMinMax label="MRR" min={mrrMin} max={mrrMax} onMin={setMrrMin} onMax={setMrrMax} prefix />
        <FilterMinMax
          label="Growth (last 30 days)"
          min={growthMin}
          max={growthMax}
          onMin={setGrowthMin}
          onMax={setGrowthMax}
          suffix="%"
        />
        <FilterMinMax
          label="Asking Price"
          min={askMin}
          max={askMax}
          onMin={setAskMin}
          onMax={setAskMax}
          prefix
        />
      </div>

      <label className={`mb-1 mt-4 block ${FILTER_LABEL}`}>Max multiple</label>
      <Select defaultValue="any">
        <SelectTrigger className={FILTER_SELECT_TRIGGER_SPACED}>
          <SelectValue placeholder="Any multiple" />
        </SelectTrigger>
        <SelectContent className={FILTER_SELECT_CONTENT}>
          <SelectItem value="any" className={SELECT_ITEM}>
            Any multiple
          </SelectItem>
          <SelectItem value="1" className={SELECT_ITEM}>
            Under 1x
          </SelectItem>
          <SelectItem value="2" className={SELECT_ITEM}>
            Under 2x
          </SelectItem>
        </SelectContent>
      </Select>

      <div className={`mb-1 flex items-center gap-1 ${FILTER_LABEL}`}>
        Profit margin
        <Info className={`h-3 w-3 ${FILTER_MUTED}`} aria-hidden />
      </div>
      <div className="mb-4 flex gap-2">
        <input disabled placeholder="Min %" className={FILTER_DISABLED} />
        <input disabled placeholder="Max %" className={FILTER_DISABLED} />
      </div>

      <label className={`mb-1 block ${FILTER_LABEL}`}>Audience</label>
      <Select defaultValue="any-aud">
        <SelectTrigger className={FILTER_SELECT_TRIGGER_SPACED}>
          <SelectValue placeholder="Any" />
        </SelectTrigger>
        <SelectContent className={FILTER_SELECT_CONTENT}>
          <SelectItem value="any-aud" className={SELECT_ITEM}>
            Any
          </SelectItem>
        </SelectContent>
      </Select>

      <label className={`mb-1 block ${FILTER_LABEL}`}>Mobile app</label>
      <Select defaultValue="any-mob">
        <SelectTrigger className={FILTER_SELECT_TRIGGER}>
          <SelectValue placeholder="Any" />
        </SelectTrigger>
        <SelectContent className={FILTER_SELECT_CONTENT}>
          <SelectItem value="any-mob" className={SELECT_ITEM}>
            Any
          </SelectItem>
        </SelectContent>
      </Select>
    </>
  );
}

export default function Acquire() {
  const wouterSearch = useSearch();
  const [, setLocation] = useLocation();
  const [isMounted, setIsMounted] = useState(false);
  const [userTick, setUserTick] = useState(0);
  const [dbStartups, setDbStartups] = useState<Startup[]>([]);
  const { openAddStartup } = useAddStartup();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category | 'All'>('All');
  const [sort, setSort] = useState<SortMode>('best_deals');
  const [revMin, setRevMin] = useState('');
  const [revMax, setRevMax] = useState('');
  const [mrrMin, setMrrMin] = useState('');
  const [mrrMax, setMrrMax] = useState('');
  const [growthMin, setGrowthMin] = useState('');
  const [growthMax, setGrowthMax] = useState('');
  const [askMin, setAskMin] = useState('');
  const [askMax, setAskMax] = useState('');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  useLayoutEffect(() => {
    setCategory(categoryFromQueryString(wouterSearch));
  }, [wouterSearch]);

  useEffect(() => {
    setIsMounted(true);
    getUserStartupsDB().then(setDbStartups);
  }, []);

  useEffect(() => {
    const b = () => {
      setUserTick((t) => t + 1);
      getUserStartupsDB().then(setDbStartups);
    };
    window.addEventListener(USER_STARTUPS_CHANGED_EVENT, b);
    window.addEventListener('storage', b);
    return () => {
      window.removeEventListener(USER_STARTUPS_CHANGED_EVENT, b);
      window.removeEventListener('storage', b);
    };
  }, []);

  const merged = useMemo(() => {
    const fromLocalStorage = mergeWithUserStartups(mockStartups);
    const allStartups = [...fromLocalStorage];
    const existingSlugs = new Set(fromLocalStorage.map(s => s.slug));

    for (const dbStartup of dbStartups) {
      if (!existingSlugs.has(dbStartup.slug)) {
        allStartups.push(dbStartup);
        existingSlugs.add(dbStartup.slug);
      }
    }
    
    return allStartups;
  }, [userTick, dbStartups]);

  const filtered = useMemo(() => {
    const n = (s: string) => (s === '' ? null : Number(s.replace(/[^0-9.]/g, '')));
    const rMin = n(revMin);
    const rMax = n(revMax);
    const mMin = n(mrrMin);
    const mMax = n(mrrMax);
    const gMin = n(growthMin);
    const gMax = n(growthMax);
    const aMin = n(askMin);
    const aMax = n(askMax);
    const q = search.trim().toLowerCase();

    let rows = merged.filter((s) => s.forSale);
    if (category !== 'All') rows = rows.filter((s) => s.category === category);
    if (q)
      rows = rows.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q),
      );
    if (rMin != null) rows = rows.filter((s) => s.revenue >= rMin);
    if (rMax != null) rows = rows.filter((s) => s.revenue <= rMax);
    if (mMin != null) rows = rows.filter((s) => s.revenue >= mMin);
    if (mMax != null) rows = rows.filter((s) => s.revenue <= mMax);
    if (gMin != null)
      rows = rows.filter((s) => (s.revenueGrowth30dPct ?? s.momGrowth) >= gMin);
    if (gMax != null)
      rows = rows.filter((s) => (s.revenueGrowth30dPct ?? s.momGrowth) <= gMax);
    if (aMin != null) rows = rows.filter((s) => (s.price ?? 0) >= aMin);
    if (aMax != null) rows = rows.filter((s) => (s.price ?? 0) <= aMax);

    const scored = rows.map((r) => ({ r, ord: acquireOrder.get(r.slug) ?? 9999 }));
    scored.sort((a, b) => {
      const af = a.ord < 9999;
      const bf = b.ord < 9999;
      if (af && bf) return a.ord - b.ord;
      if (af !== bf) return af ? -1 : 1;
      if (sort === 'revenue_desc') return b.r.revenue - a.r.revenue;
      if (sort === 'price_asc') return (a.r.price ?? 1e15) - (b.r.price ?? 1e15);
      return (a.r.multiple ?? 99) - (b.r.multiple ?? 99);
    });
    return scored.map((x) => x.r);
  }, [
    merged,
    category,
    search,
    sort,
    revMin,
    revMax,
    mrrMin,
    mrrMax,
    growthMin,
    growthMax,
    askMin,
    askMax,
  ]);

  const setCategoryWithUrl = (val: Category | 'All') => {
    setCategory(val);
    if (val === 'All') setLocation('/acquire');
    else setLocation(`/acquire?category=${encodeURIComponent(val)}`);
  };

  const clearFilters = () => {
    setLocation('/acquire');
    setCategory('All');
    setSearch('');
    setRevMin('');
    setRevMax('');
    setMrrMin('');
    setMrrMax('');
    setGrowthMin('');
    setGrowthMax('');
    setAskMin('');
    setAskMax('');
  };

  const listingFocusSlug = useMemo(() => {
    const q = wouterSearch.startsWith('?') ? wouterSearch.slice(1) : wouterSearch;
    return new URLSearchParams(q).get('listing');
  }, [wouterSearch]);

  const listingPresentInGrid = useMemo(
    () => !!(listingFocusSlug && filtered.some((x) => x.slug === listingFocusSlug)),
    [listingFocusSlug, filtered],
  );

  const [listingSpotlightSlug, setListingSpotlightSlug] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (!isMounted || !listingFocusSlug) return;
    const el = document.getElementById(`acquire-listing-${listingFocusSlug}`);
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [isMounted, listingFocusSlug, filtered]);

  useEffect(() => {
    if (!isMounted) return;
    if (!listingFocusSlug || !listingPresentInGrid) {
      setListingSpotlightSlug(null);
      return;
    }
    setListingSpotlightSlug(listingFocusSlug);
    const tid = window.setTimeout(() => {
      setListingSpotlightSlug(null);
      const raw = window.location.search.startsWith('?')
        ? window.location.search.slice(1)
        : window.location.search;
      const p = new URLSearchParams(raw);
      if (!p.has('listing')) return;
      p.delete('listing');
      const next = p.toString() ? `/acquire?${p.toString()}` : '/acquire';
      setLocation(next);
    }, 3800);
    return () => window.clearTimeout(tid);
  }, [isMounted, listingFocusSlug, listingPresentInGrid, setLocation]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (category !== 'All') n++;
    if (search.trim()) n++;
    if (revMin || revMax) n++;
    if (mrrMin || mrrMax) n++;
    if (growthMin || growthMax) n++;
    if (askMin || askMax) n++;
    if (sort !== 'best_deals') n++;
    return n;
  }, [category, search, revMin, revMax, mrrMin, mrrMax, growthMin, growthMax, askMin, askMax, sort]);

  const filterBodyProps: Omit<AcquireFiltersBodyProps, 'includeSort'> = {
    sort,
    setSort,
    category,
    setCategoryWithUrl,
    revMin,
    revMax,
    setRevMin,
    setRevMax,
    mrrMin,
    mrrMax,
    setMrrMin,
    setMrrMax,
    growthMin,
    growthMax,
    setGrowthMin,
    setGrowthMax,
    askMin,
    askMax,
    setAskMin,
    setAskMax,
  };

  if (!isMounted) return <div className="min-h-[500px]" />;

  return (
    <div className="flex flex-col gap-6 pb-16 sm:pb-20 lg:gap-12 lg:pb-24">
      <header className="flex flex-col gap-4 sm:gap-5">
        <h1 className="px-1 text-center font-mono text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl lg:text-5xl">
          Acquire Profitable Startups
        </h1>
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-sm text-muted-foreground md:text-base">
            Browse verified startups looking for a buyer. All revenue metrics are verified by these payment
            providers:
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {PAYMENT_PROVIDERS.map((x) => (
              <span
                key={x}
                className="rounded-md border border-border bg-card px-2.5 py-1 font-mono text-[11px] font-bold text-foreground"
              >
                {x}
              </span>
            ))}
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="SaaS over $10K/mo"
            className="h-11 min-h-11 flex-1 rounded-[10px] border border-border bg-card px-3 font-mono text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-foreground/20 sm:h-12 sm:min-h-12 sm:px-4"
          />
          <Button
            type="button"
            onClick={openAddStartup}
            className="h-11 min-h-11 shrink-0 rounded-[10px] px-5 font-mono font-bold sm:h-12 sm:min-h-12 sm:px-6"
          >
            Sell startup
          </Button>
        </div>
      </header>

      {/* Filters: desktop sidebar; mobile = single filter sheet */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch lg:gap-6">
        <aside className="hidden w-full shrink-0 lg:block lg:w-[260px]">
          <div className="lg:sticky lg:top-28 lg:z-10">
            <div className="mb-4 flex h-10 items-center">
              <h2 className="font-mono text-sm font-bold text-muted-foreground">Filters</h2>
            </div>
            <div className={FILTER_PANEL}>
              <AcquireMarketplaceFiltersBody {...filterBodyProps} />
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-3 flex min-w-0 items-center justify-between gap-2 lg:hidden">
            <p className="min-w-0 truncate font-mono text-xs font-bold text-muted-foreground sm:text-sm">
              {ACQUIRE_MARKETPLACE_TOTAL.toLocaleString()} startups found
            </p>
            <Dialog open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 shrink-0 gap-2 px-3 font-mono font-bold"
                  aria-label="Open filters"
                >
                  <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
                  <span>Filters</span>
                  {activeFilterCount > 0 ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-black text-background">
                      {activeFilterCount > 9 ? '9+' : activeFilterCount}
                    </span>
                  ) : null}
                </Button>
              </DialogTrigger>
              <DialogContent
                className="flex h-[min(92dvh,42rem)] w-[calc(100vw-1.25rem)] max-w-[24rem] flex-col gap-0 overflow-hidden p-0 sm:h-[min(90dvh,46rem)] sm:max-w-md"
              >
                <DialogHeader className="border-b border-border px-4 py-3 text-left">
                  <DialogTitle className="font-mono text-base">Filters & sort</DialogTitle>
                </DialogHeader>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-6 [scrollbar-gutter:stable]">
                  <div className={cn(FILTER_PANEL, 'max-h-none overflow-visible border-0 bg-transparent p-0 dark:bg-transparent')}>
                    <AcquireMarketplaceFiltersBody
                      {...filterBodyProps}
                      includeSort
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2 border-t border-border p-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full font-mono"
                    onClick={() => {
                      clearFilters();
                      setFilterSheetOpen(false);
                    }}
                  >
                    Clear filters
                  </Button>
                  <Button type="button" className="w-full font-mono font-bold" onClick={() => setFilterSheetOpen(false)}>
                    Show results
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="mb-4 hidden flex-col gap-3 lg:flex lg:flex-row lg:items-center lg:justify-between">
            <p className="font-mono text-sm font-bold text-muted-foreground">
              {ACQUIRE_MARKETPLACE_TOTAL.toLocaleString()} startups found
            </p>
            <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
              <SelectTrigger className="h-10 w-full border-border bg-card font-mono text-sm lg:w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="best_deals">Best deals (default)</SelectItem>
                <SelectItem value="revenue_desc">
                  <span className="inline-flex items-center gap-1 font-mono">
                    <span>Revenue (high</span>
                    <ChevronRight className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                    <span>low)</span>
                  </span>
                </SelectItem>
                <SelectItem value="price_asc">
                  <span className="inline-flex items-center gap-1 font-mono">
                    <span>Asking price (low</span>
                    <ChevronRight className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                    <span>high)</span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            {filtered.map((s) => {
              const isSpotlight = listingSpotlightSlug === s.slug;
              return (
                <div
                  key={s.slug}
                  id={`acquire-listing-${s.slug}`}
                  className={cn(
                    'scroll-mt-28 overflow-visible rounded-2xl',
                    isSpotlight && 'acquire-listing-spotlight',
                  )}
                >
                  {isSpotlight ? (
                    <p
                      className="pointer-events-none absolute -top-2 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-sky-500 px-2.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-wide text-white shadow-md dark:bg-sky-400 dark:text-slate-950"
                      aria-live="polite"
                    >
                      Your listing
                    </p>
                  ) : null}
                  <AcquireListingCard startup={s} footer={<MockAcquireBidPanel startup={s} compact />} />
                </div>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <div className="mt-8 rounded-[14px] border border-dashed border-border p-12 text-center font-mono">
              <p className="text-muted-foreground">No startups match these filters.</p>
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          ) : null}

          <div className="mt-12">
            <FoundersSoldSection />
          </div>
        </div>
      </div>
    </div>
  );
}