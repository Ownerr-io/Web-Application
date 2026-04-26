import type { Startup } from '@/lib/mockData';
import { mockFounders } from '@/lib/mockData';

export type CountryIso2 =
  | 'US' | 'GB' | 'DE' | 'FR' | 'CA' | 'AU' | 'IN' | 'NL' | 'SE' | 'BR' | 'JP' | 'ES' | 'IT' | 'PL' | 'IE';

const COUNTRY_LIST: { iso2: CountryIso2; name: string }[] = [
  { iso2: 'US', name: 'United States' },
  { iso2: 'GB', name: 'United Kingdom' },
  { iso2: 'DE', name: 'Germany' },
  { iso2: 'FR', name: 'France' },
  { iso2: 'CA', name: 'Canada' },
  { iso2: 'AU', name: 'Australia' },
  { iso2: 'IN', name: 'India' },
  { iso2: 'NL', name: 'Netherlands' },
  { iso2: 'SE', name: 'Sweden' },
  { iso2: 'BR', name: 'Brazil' },
  { iso2: 'JP', name: 'Japan' },
  { iso2: 'ES', name: 'Spain' },
  { iso2: 'IT', name: 'Italy' },
  { iso2: 'PL', name: 'Poland' },
  { iso2: 'IE', name: 'Ireland' },
];

const TECH_BY_CAT: Record<string, string[]> = {
  'Artificial Intelligence': ['Python', 'Next.js', 'OpenAI', 'Vercel'],
  SaaS: ['Next.js', 'Postgres', 'Ruby on Rails', 'React'],
  'Mobile Apps': ['Swift', 'Kotlin', 'React Native', 'Flutter'],
  'Developer Tools': ['Go', 'Rust', 'TypeScript', 'Node.js'],
  Marketing: ['Node.js', 'Next.js', 'Postgres', 'Supabase'],
  'Content Creation': ['Next.js', 'Remix', 'Postgres', 'Svelte'],
  'Crypto & Web3': ['Solidity', 'TypeScript', 'Next.js', 'Node.js'],
  Education: ['Next.js', 'Python', 'Django', 'Postgres'],
  Health: ['Node.js', 'Postgres', 'React', 'Python'],
  'Customer Support': ['Next.js', 'Ruby', 'Postgres', 'Node.js'],
  'Social Media': ['Node.js', 'Next.js', 'Postgres', 'Go'],
};

const ALL_TECH = ['Next.js', 'Node.js', 'Python', 'React', 'Postgres', 'Go', 'Ruby on Rails', 'TypeScript', 'Swift', 'Svelte', 'Django', 'OpenAI', 'Vercel', 'Remix', 'Supabase', 'Flutter', 'Kotlin', 'Solidity', 'Rust', 'Vue'];

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function u01(s: string, salt: string): number {
  return (hashStr(s + salt) % 1_000_000) / 1_000_000;
}

/** Deterministic 1..max inclusive */
function randInt(s: string, salt: string, max: number): number {
  return 1 + (hashStr(s + salt) % max);
}

/**
 * X followers: log-like distribution 1..200k
 */
function xFollowersFor(slug: string, founderHandle: string): number {
  const u = u01(slug, 'xf');
  const f = u01(founderHandle, 'xf2');
  const t = (u * 0.6 + f * 0.4) ** 1.6;
  return Math.max(1, Math.min(200_000, Math.round(1 + t * 199_999)));
}

/**
 * Growth % for scatter (0.1 - 200), log-friendly
 */
function growthPct(s: string, salt: string): number {
  const t = u01(s, salt) ** 0.55;
  return Math.max(0.1, Math.min(200, 0.1 + t * 199.9));
}

function countryFor(slug: string, founderHandle: string): { iso2: CountryIso2; name: string } {
  const idx = hashStr(slug + founderHandle) % COUNTRY_LIST.length;
  return COUNTRY_LIST[idx]!;
}

function techFor(s: Startup): string {
  const pool = TECH_BY_CAT[s.category] ?? ALL_TECH;
  const i = hashStr(s.slug) % pool.length;
  return pool[i] ?? 'Next.js';
}

/** Days in business (approx) from founded year, fixed ref year 2026 */
export function daysInBusiness(s: Startup): number {
  const y = 2026 - s.foundedYear;
  const extra = (hashStr(s.slug) % 330) - 100;
  return Math.max(5, y * 365 + extra);
}

/**
 * Synthetic “months to reach MRR milestone” (model curve from current revenue and age)
 */
function monthsToMilestones(s: Startup): { m1k: number; m10k: number; m100k: number } {
  const monthsOld = Math.max(1, daysInBusiness(s) / 30);
  const r = s.revenue;
  const t = (x: number) => Math.max(1, Math.min(120, Math.round((monthsOld * (x / Math.max(r, 1))) * (0.4 + u01(s.slug, 'm' + x) * 0.6))));
  return {
    m1k: t(1000),
    m10k: t(10_000),
    m100k: t(100_000),
  };
}

export interface EnrichedStatsStartup extends Startup {
  xFollowers: number;
  xFollowerGrowthPct: number;
  /** Past-period revenue growth % for y-axis on growth vs growth */
  revGrowthComparePct: number;
  countryIso2: CountryIso2;
  countryName: string;
  techStack: string;
  daysInBusiness: number;
  monthsTo1k: number;
  monthsTo10k: number;
  monthsTo100k: number;
  /** ARR = revenue * 12 for some charts */
  arr: number;
}

export function enrichStartup(s: Startup): EnrichedStatsStartup {
  const { iso2, name: countryName } = countryFor(s.slug, s.founderHandle);
  const m = monthsToMilestones(s);
  return {
    ...s,
    xFollowers: xFollowersFor(s.slug, s.founderHandle),
    xFollowerGrowthPct: growthPct(s.slug, 'xfg'),
    revGrowthComparePct: growthPct(s.slug, 'rvg'),
    countryIso2: iso2,
    countryName,
    techStack: techFor(s),
    daysInBusiness: daysInBusiness(s),
    monthsTo1k: m.m1k,
    monthsTo10k: m.m10k,
    monthsTo100k: m.m100k,
    arr: s.revenue * 12,
  };
}

export function getFounderByHandle(handle: string) {
  return mockFounders.find((f) => f.handle === handle);
}

export function buildStatsDataset(startups: Startup[]): EnrichedStatsStartup[] {
  return startups.map(enrichStartup);
}

export function aggregateMrrByTech(rows: EnrichedStatsStartup[]) {
  const by = new Map<string, number>();
  for (const r of rows) {
    by.set(r.techStack, (by.get(r.techStack) ?? 0) + r.revenue);
  }
  return [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
}

export interface CategoryAggregateRow {
  category: string;
  totalRevenue: number;
  mrr: number;
  growth30d: number;
  n: number;
}

export function aggregateByCategory(rows: EnrichedStatsStartup[]): CategoryAggregateRow[] {
  const map = new Map<string, { total: number; sumGrowth: number; n: number }>();
  for (const r of rows) {
    const prev = map.get(r.category) ?? { total: 0, sumGrowth: 0, n: 0 };
    prev.total += r.revenue;
    prev.n += 1;
    const g = r.revenueGrowth30dPct ?? r.momGrowth;
    prev.sumGrowth += g;
    map.set(r.category, prev);
  }
  return [...map.entries()]
    .map(([category, v]) => ({
      category,
      totalRevenue: v.total * 12,
      mrr: v.total,
      growth30d: v.n > 0 ? v.sumGrowth / v.n : 0,
      n: v.n,
    }))
    .sort((a, b) => b.mrr - a.mrr);
}

export function olympicsByCountry(rows: EnrichedStatsStartup[]) {
  const map = new Map<CountryIso2, { mrr: number; count: number; name: string }>();
  for (const r of rows) {
    const prev = map.get(r.countryIso2) ?? { mrr: 0, count: 0, name: r.countryName };
    prev.mrr += r.revenue;
    prev.count += 1;
    map.set(r.countryIso2, prev);
  }
  return [...map.entries()]
    .map(([iso, v]) => ({ iso, name: v.name, totalMrr: v.mrr, count: v.count, arr: v.mrr * 12 }))
    .sort((a, b) => b.totalMrr - a.totalMrr);
}

export function highArrLowFollowers(rows: EnrichedStatsStartup[], limit = 10) {
  return [...rows]
    .filter((r) => r.arr >= 1_000_000)
    .sort((a, b) => a.xFollowers - b.xFollowers)
    .slice(0, limit);
}

export function countAboveGrowthDiagonal(rows: EnrichedStatsStartup[]) {
  let above = 0;
  for (const r of rows) {
    if (r.revGrowthComparePct > r.xFollowerGrowthPct) above++;
  }
  return { above, n: rows.length, pct: rows.length ? Math.round((100 * above) / rows.length) : 0 };
}

export function distributionBuckets(rows: EnrichedStatsStartup[], key: 'revenue' | 'xFollowers') {
  if (key === 'revenue') {
    const brackets = [
      { name: '< $5k', test: (r: number) => r < 5000 },
      { name: '$5k–$10k', test: (r: number) => r >= 5000 && r < 10_000 },
      { name: '$10k–$50k', test: (r: number) => r >= 10_000 && r < 50_000 },
      { name: '$50k–$100k', test: (r: number) => r >= 50_000 && r < 100_000 },
      { name: '≥ $100k', test: (r: number) => r >= 100_000 },
    ];
    return brackets.map((b) => ({
      name: b.name,
      count: rows.filter((r) => b.test(r.revenue)).length,
    }));
  }
  const brackets = [
    { name: '< 1k', test: (f: number) => f < 1000 },
    { name: '1k – 5k', test: (f: number) => f >= 1000 && f < 5000 },
    { name: '5k – 10k', test: (f: number) => f >= 5000 && f < 10_000 },
    { name: '10k – 50k', test: (f: number) => f >= 10_000 && f < 50_000 },
    { name: '≥ 50k', test: (f: number) => f >= 50_000 },
  ];
  return brackets.map((b) => ({
    name: b.name,
    count: rows.filter((r) => b.test(r.xFollowers)).length,
  }));
}

export function timeToMilestoneAverages(rows: EnrichedStatsStartup[]) {
  return [
    { milestone: 'To $1k MRR', months: mean(rows.map((r) => r.monthsTo1k)) },
    { milestone: 'To $10k MRR', months: mean(rows.map((r) => r.monthsTo10k)) },
    { milestone: 'To $100k MRR', months: mean(rows.map((r) => r.monthsTo100k)) },
  ];
}

function mean(a: number[]) {
  if (!a.length) return 0;
  return Math.round((a.reduce((s, v) => s + v, 0) / a.length) * 10) / 10;
}
