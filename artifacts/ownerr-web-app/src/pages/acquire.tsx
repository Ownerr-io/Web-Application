import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { mockStartups, type Category } from '@/lib/mockData';
import { ACQUIRE_GRID_ROWS } from '@/lib/acquireMarketplaceData';
import { AcquireListingCard } from '@/components/AcquireListingCard';
import { MockAcquireBidPanel } from '@/components/mock-bidding/MockAcquireBidPanel';
import { bestDealScore, fetchMarketplaceListings } from '@/lib/mockMarketplaceService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

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
const FILTER_ROW_BLOCK = 'w-[200px] max-w-full';
const ACQUIRE_FILTERS_STORAGE_KEY = 'ownerr-acquire-filters-v1';
const BUYER_FILTER_SELECT_TRIGGER =
  'h-9 border-border bg-background font-mono text-xs text-foreground dark:border-[#2f3336] dark:bg-[#16181c] dark:text-white';

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

type SortMode = 'best_deals' | 'mrr_desc' | 'growth_desc' | 'traffic_desc' | 'newest' | 'price_asc';

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

type RangeOption = { value: string; label: string; min: string; max: string };

function rangeValueFromMinMax(min: string, max: string, options: RangeOption[]): string {
  const hit = options.find((opt) => opt.min === min && opt.max === max);
  return hit?.value ?? 'custom';
}

function RangeDropdown({
  label,
  min,
  max,
  options,
  onMin,
  onMax,
}: {
  label: string;
  min: string;
  max: string;
  options: RangeOption[];
  onMin: (v: string) => void;
  onMax: (v: string) => void;
}) {
  const selected = rangeValueFromMinMax(min, max, options);
  return (
    <div className="min-w-0">
      <label className={`mb-1 block ${FILTER_LABEL}`}>{label}</label>
      <Select
        value={selected}
        onValueChange={(value) => {
          const next = options.find((opt) => opt.value === value);
          if (!next) return;
          onMin(next.min);
          onMax(next.max);
        }}
      >
        <SelectTrigger className={BUYER_FILTER_SELECT_TRIGGER}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={FILTER_SELECT_CONTENT}>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className={SELECT_ITEM}>
              {opt.label}
            </SelectItem>
          ))}
          {selected === 'custom' ? (
            <SelectItem value="custom" className={SELECT_ITEM}>
              Custom range
            </SelectItem>
          ) : null}
        </SelectContent>
      </Select>
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
  trafficMin: string;
  trafficMax: string;
  setTrafficMin: (v: string) => void;
  setTrafficMax: (v: string) => void;
  verifiedRevenueOnly: boolean;
  setVerifiedRevenueOnly: (v: boolean) => void;
  verifiedDomainOnly: boolean;
  setVerifiedDomainOnly: (v: boolean) => void;
  verifiedOnly: boolean;
  setVerifiedOnly: (v: boolean) => void;
  revenueProvider: string;
  setRevenueProvider: (v: string) => void;
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
  trafficMin,
  trafficMax,
  setTrafficMin,
  setTrafficMax,
  verifiedRevenueOnly,
  setVerifiedRevenueOnly,
  verifiedDomainOnly,
  setVerifiedDomainOnly,
  verifiedOnly,
  setVerifiedOnly,
  revenueProvider,
  setRevenueProvider,
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
              <SelectItem value="mrr_desc" className={SELECT_ITEM}>
                MRR (high to low)
              </SelectItem>
              <SelectItem value="growth_desc" className={SELECT_ITEM}>
                Growth (high to low)
              </SelectItem>
              <SelectItem value="traffic_desc" className={SELECT_ITEM}>
                Traffic (high to low)
              </SelectItem>
              <SelectItem value="newest" className={SELECT_ITEM}>
                Newest listings
              </SelectItem>
              <SelectItem value="price_asc" className={SELECT_ITEM}>
                Asking price (low to high)
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

      <label className={`mb-1 block ${FILTER_LABEL}`}>Revenue provider</label>
      <Select value={revenueProvider} onValueChange={setRevenueProvider}>
        <SelectTrigger className={FILTER_SELECT_TRIGGER_SPACED}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={FILTER_SELECT_CONTENT}>
          <SelectItem value="all" className={SELECT_ITEM}>All providers</SelectItem>
          {PAYMENT_PROVIDERS.map((provider) => (
            <SelectItem key={provider} value={provider} className={SELECT_ITEM}>
              {provider}
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
        <FilterMinMax
          label="Traffic (visitors/mo)"
          min={trafficMin}
          max={trafficMax}
          onMin={setTrafficMin}
          onMax={setTrafficMax}
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

      <div className="mt-4 space-y-2">
        <label className={`block ${FILTER_LABEL}`}>Verification</label>
        <div className="flex items-start gap-2">
          <Checkbox
            id="filter-verified-only"
            checked={verifiedOnly}
            onCheckedChange={(v) => setVerifiedOnly(v === true)}
          />
          <label htmlFor="filter-verified-only" className="cursor-pointer text-xs font-medium text-foreground dark:text-white">
            Fully verified only
          </label>
        </div>
        <div className="flex items-start gap-2">
          <Checkbox
            id="filter-rev-verified"
            checked={verifiedRevenueOnly}
            onCheckedChange={(v) => setVerifiedRevenueOnly(v === true)}
          />
          <label htmlFor="filter-rev-verified" className="cursor-pointer text-xs font-medium text-foreground dark:text-white">
            Verified revenue only
          </label>
        </div>
        <div className="flex items-start gap-2">
          <Checkbox
            id="filter-domain-verified"
            checked={verifiedDomainOnly}
            onCheckedChange={(v) => setVerifiedDomainOnly(v === true)}
          />
          <label htmlFor="filter-domain-verified" className="cursor-pointer text-xs font-medium text-foreground dark:text-white">
            Verified domain only
          </label>
        </div>
      </div>
    </>
  );
}

export default function Acquire() {
  const wouterSearch = useSearch();
  const [location, setLocation] = useLocation();
  const isBuyerPage = location.startsWith('/buyer/acquire');
  const [isMounted, setIsMounted] = useState(false);

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
  const [trafficMin, setTrafficMin] = useState('');
  const [trafficMax, setTrafficMax] = useState('');
  const [verifiedRevenueOnly, setVerifiedRevenueOnly] = useState(false);
  const [verifiedDomainOnly, setVerifiedDomainOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [revenueProvider, setRevenueProvider] = useState('all');
  const listingsQuery = useQuery({
    queryKey: ['marketplace-listings'],
    queryFn: () => fetchMarketplaceListings(mockStartups),
  });

  useLayoutEffect(() => {
    setCategory(categoryFromQueryString(wouterSearch));
  }, [wouterSearch]);

  useEffect(() => {
    setIsMounted(true);
    try {
      const raw = window.localStorage.getItem(ACQUIRE_FILTERS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, string | boolean>;
      setSearch(String(parsed.search ?? ''));
      setSort((parsed.sort as SortMode) ?? 'best_deals');
      setRevMin(String(parsed.revMin ?? ''));
      setRevMax(String(parsed.revMax ?? ''));
      setMrrMin(String(parsed.mrrMin ?? ''));
      setMrrMax(String(parsed.mrrMax ?? ''));
      setGrowthMin(String(parsed.growthMin ?? ''));
      setGrowthMax(String(parsed.growthMax ?? ''));
      setAskMin(String(parsed.askMin ?? ''));
      setAskMax(String(parsed.askMax ?? ''));
      setTrafficMin(String(parsed.trafficMin ?? ''));
      setTrafficMax(String(parsed.trafficMax ?? ''));
      setVerifiedRevenueOnly(Boolean(parsed.verifiedRevenueOnly));
      setVerifiedDomainOnly(Boolean(parsed.verifiedDomainOnly));
      setVerifiedOnly(Boolean(parsed.verifiedOnly));
      setRevenueProvider(String(parsed.revenueProvider ?? 'all'));
    } catch {
      // ignore bad persisted filter state
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    window.localStorage.setItem(
      ACQUIRE_FILTERS_STORAGE_KEY,
      JSON.stringify({
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
        trafficMin,
        trafficMax,
        verifiedRevenueOnly,
        verifiedDomainOnly,
        verifiedOnly,
        revenueProvider,
      }),
    );
  }, [isMounted, search, sort, revMin, revMax, mrrMin, mrrMax, growthMin, growthMax, askMin, askMax, trafficMin, trafficMax, verifiedRevenueOnly, verifiedDomainOnly, verifiedOnly, revenueProvider]);

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
    const tMin = n(trafficMin);
    const tMax = n(trafficMax);
    const q = search.trim().toLowerCase();

    let rows = (listingsQuery.data ?? []).filter((s) => s.forSale);
    if (category !== 'All') rows = rows.filter((s) => s.category === category);
    if (q)
      rows = rows.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.nicheTags.some((tag) => tag.toLowerCase().includes(q)) ||
          s.keywords.some((keyword) => keyword.includes(q)),
      );
    if (rMin != null) rows = rows.filter((s) => s.revenue >= rMin);
    if (rMax != null) rows = rows.filter((s) => s.revenue <= rMax);
    if (mMin != null) rows = rows.filter((s) => s.revenue >= mMin);
    if (mMax != null) rows = rows.filter((s) => s.revenue <= mMax);
    if (gMin != null)
      rows = rows.filter((s) => (s.growthPct ?? s.revenueGrowth30dPct ?? s.momGrowth) >= gMin);
    if (gMax != null)
      rows = rows.filter((s) => (s.growthPct ?? s.revenueGrowth30dPct ?? s.momGrowth) <= gMax);
    if (aMin != null) rows = rows.filter((s) => (s.price ?? 0) >= aMin);
    if (aMax != null) rows = rows.filter((s) => (s.price ?? 0) <= aMax);
    if (tMin != null) rows = rows.filter((s) => (s.trafficMonthlyVisitors ?? 0) >= tMin);
    if (tMax != null) rows = rows.filter((s) => (s.trafficMonthlyVisitors ?? 0) <= tMax);
    if (revenueProvider !== 'all') rows = rows.filter((s) => s.revenueProvider === revenueProvider);
    if (verifiedOnly) rows = rows.filter((s) => s.revenueVerified && s.domainVerified && s.trafficVerified);
    if (verifiedRevenueOnly) rows = rows.filter((s) => s.revenueVerified);
    if (verifiedDomainOnly) rows = rows.filter((s) => s.domainVerified);

    const scored = rows.map((r) => ({ r, ord: acquireOrder.get(r.slug) ?? 9999 }));
    scored.sort((a, b) => {
      const af = a.ord < 9999;
      const bf = b.ord < 9999;
      if (sort === 'best_deals') {
        if (af && bf) return a.ord - b.ord;
        if (af !== bf) return af ? -1 : 1;
        return bestDealScore(b.r as never) - bestDealScore(a.r as never);
      }
      if (sort === 'mrr_desc') return b.r.revenue - a.r.revenue;
      if (sort === 'growth_desc') return (b.r.growthPct ?? 0) - (a.r.growthPct ?? 0);
      if (sort === 'traffic_desc') return (b.r.trafficMonthlyVisitors ?? 0) - (a.r.trafficMonthlyVisitors ?? 0);
      if (sort === 'newest') return new Date(b.r.createdAt).getTime() - new Date(a.r.createdAt).getTime();
      if (sort === 'price_asc') return (a.r.price ?? 1e15) - (b.r.price ?? 1e15);
      return (a.r.multiple ?? 99) - (b.r.multiple ?? 99);
    });
    return scored.map((x) => x.r);
  }, [
    listingsQuery.data,
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
    trafficMin,
    trafficMax,
    verifiedRevenueOnly,
    verifiedDomainOnly,
    verifiedOnly,
    revenueProvider,
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
    setTrafficMin('');
    setTrafficMax('');
    setVerifiedRevenueOnly(false);
    setVerifiedDomainOnly(false);
    setVerifiedOnly(false);
    setRevenueProvider('all');
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
    if (trafficMin || trafficMax) n++;
    if (sort !== 'best_deals') n++;
    if (verifiedRevenueOnly) n++;
    if (verifiedDomainOnly) n++;
    if (verifiedOnly) n++;
    if (revenueProvider !== 'all') n++;
    return n;
  }, [category, search, revMin, revMax, mrrMin, mrrMax, growthMin, growthMax, askMin, askMax, trafficMin, trafficMax, sort, verifiedRevenueOnly, verifiedDomainOnly, verifiedOnly, revenueProvider]);

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
    trafficMin,
    trafficMax,
    setTrafficMin,
    setTrafficMax,
    verifiedRevenueOnly,
    setVerifiedRevenueOnly,
    verifiedDomainOnly,
    setVerifiedDomainOnly,
    verifiedOnly,
    setVerifiedOnly,
    revenueProvider,
    setRevenueProvider,
  };

  if (!isMounted) return <div className="min-h-[500px]" />;

  const revenue30dOptions: RangeOption[] = [
    { value: 'any', label: 'Any revenue', min: '', max: '' },
    { value: '0-5k', label: '$0 - $5k', min: '0', max: '5000' },
    { value: '5k-10k', label: '$5k - $10k', min: '5000', max: '10000' },
    { value: '10k-25k', label: '$10k - $25k', min: '10000', max: '25000' },
    { value: '25k+', label: '$25k+', min: '25000', max: '' },
  ];
  const mrrOptions: RangeOption[] = [
    { value: 'any', label: 'Any MRR', min: '', max: '' },
    { value: '0-5k', label: '$0 - $5k', min: '0', max: '5000' },
    { value: '5k-10k', label: '$5k - $10k', min: '5000', max: '10000' },
    { value: '10k-25k', label: '$10k - $25k', min: '10000', max: '25000' },
    { value: '25k+', label: '$25k+', min: '25000', max: '' },
  ];
  const growthOptions: RangeOption[] = [
    { value: 'any', label: 'Any growth', min: '', max: '' },
    { value: '0-10', label: '0% - 10%', min: '0', max: '10' },
    { value: '10-25', label: '10% - 25%', min: '10', max: '25' },
    { value: '25-50', label: '25% - 50%', min: '25', max: '50' },
    { value: '50+', label: '50%+', min: '50', max: '' },
  ];
  const askingPriceOptions: RangeOption[] = [
    { value: 'any', label: 'Any price', min: '', max: '' },
    { value: '0-50k', label: '$0 - $50k', min: '0', max: '50000' },
    { value: '50k-150k', label: '$50k - $150k', min: '50000', max: '150000' },
    { value: '150k-500k', label: '$150k - $500k', min: '150000', max: '500000' },
    { value: '500k+', label: '$500k+', min: '500000', max: '' },
  ];
  const trafficOptions: RangeOption[] = [
    { value: 'any', label: 'Any traffic', min: '', max: '' },
    { value: '0-5k', label: '0 - 5k/mo', min: '0', max: '5000' },
    { value: '5k-20k', label: '5k - 20k/mo', min: '5000', max: '20000' },
    { value: '20k-100k', label: '20k - 100k/mo', min: '20000', max: '100000' },
    { value: '100k+', label: '100k+/mo', min: '100000', max: '' },
  ];

  const listingsContent = (
    <div className="min-w-0 flex-1">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="font-mono text-sm font-bold text-muted-foreground">
          {(listingsQuery.data?.filter((item) => item.forSale).length ?? 0).toLocaleString()} startups found
        </p>
        {activeFilterCount > 0 ? (
          <p className="font-mono text-xs text-muted-foreground">{activeFilterCount} active filters</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        {listingsQuery.isLoading
          ? Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-[14px] border border-border bg-card p-4">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="mt-3 h-24 w-full" />
              <Skeleton className="mt-3 h-16 w-full" />
            </div>
          ))
          : filtered.map((s) => {
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

      {!listingsQuery.isLoading && filtered.length === 0 ? (
        <div className="mt-8 rounded-[14px] border border-dashed border-border p-12 text-center font-mono">
          <p className="text-muted-foreground">
            {search.trim() ? `No startups match “${search.trim()}”.` : 'No startups match these filters.'}
          </p>
          <Button variant="outline" className="mt-4" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-col gap-6 pb-16 sm:pb-20 lg:gap-12 lg:pb-24">
      {isBuyerPage ? (
        <>
          <section className={cn(FILTER_PANEL, 'max-h-none overflow-visible p-3')}>
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <label className={`mb-1 block ${FILTER_LABEL}`}>Sort</label>
                <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
                  <SelectTrigger className={BUYER_FILTER_SELECT_TRIGGER}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={FILTER_SELECT_CONTENT}>
                    <SelectItem value="best_deals" className={SELECT_ITEM}>Best deals (default)</SelectItem>
                    <SelectItem value="mrr_desc" className={SELECT_ITEM}>MRR (high to low)</SelectItem>
                    <SelectItem value="growth_desc" className={SELECT_ITEM}>Growth (high to low)</SelectItem>
                    <SelectItem value="traffic_desc" className={SELECT_ITEM}>Traffic (high to low)</SelectItem>
                    <SelectItem value="newest" className={SELECT_ITEM}>Newest listings</SelectItem>
                    <SelectItem value="price_asc" className={SELECT_ITEM}>Asking price (low to high)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-0 flex-1">
                <label className={`mb-1 block ${FILTER_LABEL}`}>Categories</label>
                <Select value={category} onValueChange={(v) => setCategoryWithUrl(v as Category | 'All')}>
                  <SelectTrigger className={BUYER_FILTER_SELECT_TRIGGER}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={FILTER_SELECT_CONTENT}>
                    {FILTER_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className={SELECT_ITEM}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-0 flex-1">
                <label className={`mb-1 block ${FILTER_LABEL}`}>Revenue provider</label>
                <Select value={revenueProvider} onValueChange={setRevenueProvider}>
                  <SelectTrigger className={BUYER_FILTER_SELECT_TRIGGER}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={FILTER_SELECT_CONTENT}>
                    <SelectItem value="all" className={SELECT_ITEM}>All providers</SelectItem>
                    {PAYMENT_PROVIDERS.map((provider) => (
                      <SelectItem key={provider} value={provider} className={SELECT_ITEM}>
                        {provider}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-0 flex-1">
                <RangeDropdown
                  label="Revenue (last 30 days)"
                  min={revMin}
                  max={revMax}
                  options={revenue30dOptions}
                  onMin={setRevMin}
                  onMax={setRevMax}
                />
              </div>
              <div className="min-w-0 flex-1">
                <RangeDropdown label="MRR" min={mrrMin} max={mrrMax} options={mrrOptions} onMin={setMrrMin} onMax={setMrrMax} />
              </div>
              <div className="min-w-0 flex-1">
                <RangeDropdown
                  label="Growth (last 30 days)"
                  min={growthMin}
                  max={growthMax}
                  options={growthOptions}
                  onMin={setGrowthMin}
                  onMax={setGrowthMax}
                />
              </div>
              <div className="min-w-0 flex-1">
                <RangeDropdown
                  label="Asking Price"
                  min={askMin}
                  max={askMax}
                  options={askingPriceOptions}
                  onMin={setAskMin}
                  onMax={setAskMax}
                />
              </div>
              <div className="min-w-0 flex-1">
                <RangeDropdown
                  label="Traffic (visitors/mo)"
                  min={trafficMin}
                  max={trafficMax}
                  options={trafficOptions}
                  onMin={setTrafficMin}
                  onMax={setTrafficMax}
                />
              </div>

              <div className="min-w-0 flex-1">
                <label className={`mb-1 block ${FILTER_LABEL}`}>Verification</label>
                <Select
                  value={
                    verifiedOnly
                      ? 'fully'
                      : verifiedRevenueOnly
                        ? 'revenue'
                        : verifiedDomainOnly
                          ? 'domain'
                          : 'all'
                  }
                  onValueChange={(value) => {
                    if (value === 'fully') {
                      setVerifiedOnly(true);
                      setVerifiedRevenueOnly(false);
                      setVerifiedDomainOnly(false);
                      return;
                    }
                    if (value === 'revenue') {
                      setVerifiedOnly(false);
                      setVerifiedRevenueOnly(true);
                      setVerifiedDomainOnly(false);
                      return;
                    }
                    if (value === 'domain') {
                      setVerifiedOnly(false);
                      setVerifiedRevenueOnly(false);
                      setVerifiedDomainOnly(true);
                      return;
                    }
                    setVerifiedOnly(false);
                    setVerifiedRevenueOnly(false);
                    setVerifiedDomainOnly(false);
                  }}
                >
                  <SelectTrigger className={BUYER_FILTER_SELECT_TRIGGER}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={FILTER_SELECT_CONTENT}>
                    <SelectItem value="all" className={SELECT_ITEM}>All listings</SelectItem>
                    <SelectItem value="fully" className={SELECT_ITEM}>Fully verified only</SelectItem>
                    <SelectItem value="revenue" className={SELECT_ITEM}>Verified revenue only</SelectItem>
                    <SelectItem value="domain" className={SELECT_ITEM}>Verified domain only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>
          {listingsContent}
        </>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8">
          <aside className={cn(FILTER_PANEL, 'p-4 lg:mt-7')}>
            <AcquireMarketplaceFiltersBody includeSort {...filterBodyProps} />
            <Button type="button" variant="outline" className="mt-4 h-10 w-full font-mono" onClick={clearFilters}>
              Clear filters
            </Button>
          </aside>
          {listingsContent}
        </div>
      )}
    </div>
  );
}