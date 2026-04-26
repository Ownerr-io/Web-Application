import type { Startup } from '@/lib/mockData';

/** Inputs used to derive 0–100 Business, Lend, and Acquisition power scores. */
export type StartupScoreInput = {
  slug: string;
  revenue: number;
  momGrowth: number;
  forSale: boolean;
  customers: number;
  multiple?: number;
  ttmProfit?: number;
  price?: number;
};

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Deterministic 0–8 jitter from slug so peers differ slightly. */
function slugJitter(slug: string, salt: number): number {
  let h = salt * 13;
  for (let i = 0; i < slug.length; i++) {
    h = (h * 33 + slug.charCodeAt(i) * (i + 1) + salt) % 97;
  }
  return h % 9;
}

/**
 * Business score: revenue quality, growth, scale.
 * Lend score: profitability proxy, stability.
 * Acquisition power: exit readiness, multiple, growth.
 */
export function computeStartupScores(s: StartupScoreInput): {
  businessScore: number;
  lendScore: number;
  acquisitionPower: number;
} {
  const rev = Math.max(0, s.revenue);
  const logRev = Math.log10(Math.max(1, rev));
  const mom = s.momGrowth ?? 0;
  const mult = s.multiple ?? 2.5;
  const arr = rev * 12;
  const profit = s.ttmProfit ?? rev * 5;
  const marginHint = arr > 0 ? Math.min(1.2, profit / Math.max(1, arr)) : 0;
  const j1 = slugJitter(s.slug, 1);
  const j2 = slugJitter(s.slug, 2);
  const j3 = slugJitter(s.slug, 3);

  const growthTerm = Math.max(-18, Math.min(22, mom * 0.55));
  const scaleBonus = s.customers > 5000 ? 10 : s.customers > 500 ? 5 : 0;
  const businessScore = clamp100(
    24 + logRev * 11.5 + growthTerm + scaleBonus * 0.5 + (marginHint > 0.15 ? 6 : 0) + j1,
  );

  const stability = mom >= -2 && mom <= 35 ? 6 : mom < -2 ? -4 : 2;
  const lendScore = clamp100(
    30 + marginHint * 34 + logRev * 7 + (profit > rev * 3 ? 8 : 0) + stability + j2,
  );

  const saleBoost = s.forSale ? 14 : 0;
  const multipleAttract = mult > 0 && mult < 2 ? 12 : mult < 3.5 ? 7 : 3;
  const acquisitionPower = clamp100(
    20 + saleBoost + multipleAttract + logRev * 8 + growthTerm * 0.35 + (s.price && s.forSale ? 4 : 0) + j3,
  );

  return { businessScore, lendScore, acquisitionPower };
}

export function ensureStartupScores(s: Startup): Startup {
  if (
    typeof s.businessScore === 'number' &&
    !Number.isNaN(s.businessScore) &&
    typeof s.lendScore === 'number' &&
    !Number.isNaN(s.lendScore) &&
    typeof s.acquisitionPower === 'number' &&
    !Number.isNaN(s.acquisitionPower)
  ) {
    return s;
  }
  return { ...s, ...computeStartupScores(s) };
}
