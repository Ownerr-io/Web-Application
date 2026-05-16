export type FounderGoal = 'exit' | 'raise' | 'hold' | 'unsure';

export type ValuationInputs = {
  mrr: number;
  arr: number;
  profitMarginPct: number;
  operatingExpensesMonthly: number;
  monthlyGrowthPct: number;
  churnPctMonthly: number;
  cac: number;
  ltv: number;
  burnMultiple: number;
  runwayMonths: number;
  industry: string;
  stage: string;
  geography: string;
  founderGoal: FounderGoal;
};

export type ValuationOutputs = {
  estimatedValuation: number;
  investorInterest: number;
  acquisitionHeat: number;
  marketTiming: string;
  growthQuality: number;
  revenueStability: number;
  liquiditySignal: string;
  strategicRecommendation: string;
  confidencePct: number;
  suggestedTimeline: string;
};

const INDUSTRY_MULT: Record<string, number> = {
  SaaS: 7.5,
  AI: 11,
  Fintech: 5.5,
  Consumer: 4,
  DevTools: 8,
  Healthcare: 5,
  Other: 5,
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function roundMoney(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  const mag = n >= 1e9 ? 1e8 : n >= 1e8 ? 1e7 : n >= 1e7 ? 1e6 : 1e5;
  return Math.round(n / mag) * mag;
}

export function computeValuationIntel(i: ValuationInputs): ValuationOutputs {
  const arr = i.arr > 0 ? i.arr : Math.max(0, i.mrr) * 12;
  const baseMult = INDUSTRY_MULT[i.industry] ?? INDUSTRY_MULT.Other;

  const growthFactor = 1 + clamp(i.monthlyGrowthPct, -15, 40) / 100;
  const marginAdj = 0.85 + (clamp(i.profitMarginPct, -30, 60) / 100) * 0.35;
  const churnPenalty = 1 - clamp(i.churnPctMonthly, 0, 15) / 100 * 1.2;
  const ltvCac =
    i.cac > 0 && i.ltv > 0 ? clamp(i.ltv / i.cac / 4, 0.6, 1.35) : 1;
  const burnAdj =
    i.burnMultiple > 0 ? clamp(1.35 - (i.burnMultiple - 1) * 0.08, 0.75, 1.2) : 1;
  const runwayAdj = clamp(0.85 + i.runwayMonths / 48, 0.85, 1.1);

  const rawVal = arr * baseMult * growthFactor * marginAdj * churnPenalty * ltvCac * burnAdj * runwayAdj;
  const estimatedValuation = roundMoney(rawVal);

  const growthQuality = clamp(
    42 + i.monthlyGrowthPct * 1.8 - i.churnPctMonthly * 2.2 + (i.profitMarginPct > 0 ? 8 : -4),
    12,
    96,
  );
  const revenueStability = clamp(
    55 - i.churnPctMonthly * 3 + (i.profitMarginPct > 15 ? 12 : 0) + (arr > 0 ? 10 : 0),
    18,
    94,
  );

  const investorInterest = clamp(
    38 +
      growthQuality * 0.28 +
      revenueStability * 0.22 +
      (i.stage.toLowerCase().includes('series') ? 8 : 0) -
      (i.burnMultiple > 2.5 ? 10 : 0),
    14,
    94,
  );

  const acquisitionHeat = clamp(
    32 +
      acquisitionMultipleSignal(arr, baseMult) * 18 +
      investorInterest * 0.25 -
      (i.founderGoal === 'raise' ? 8 : 0),
    12,
    96,
  );

  let marketTiming = 'Neutral';
  if (growthFactor > 1.12 && churnPenalty > 0.92) marketTiming = 'Constructive';
  if (growthFactor < 0.98 || churnPenalty < 0.88) marketTiming = 'Cautious';
  if (investorInterest > 78 && acquisitionHeat > 72) marketTiming = 'Favorable exit window';

  const liquiditySignal =
    acquisitionHeat > 72 && investorInterest > 68
      ? 'Elevated strategic demand'
      : acquisitionHeat < 40
        ? 'Thin strategic bid depth'
        : 'Balanced secondary interest';

  let strategicRecommendation =
    'Maintain operating discipline while monitoring comparable transaction velocity.';
  if (i.founderGoal === 'exit' && acquisitionHeat > investorInterest - 5) {
    strategicRecommendation =
      'Acquisition heat outruns incremental capital cost — prioritize structured exit outreach.';
  } else if (i.founderGoal === 'raise' && investorInterest > acquisitionHeat) {
    strategicRecommendation =
      'Investor appetite supports a priced round — sequence data room before broad outreach.';
  } else if (i.founderGoal === 'hold' && growthQuality > 72) {
    strategicRecommendation = 'Compounding economics favor duration over near-term liquidity.';
  } else if (i.monthlyGrowthPct < 2 && i.churnPctMonthly > 6) {
    strategicRecommendation = 'Stabilize net retention before optimizing for valuation step-ups.';
  }

  const confidencePct = clamp(
    58 +
      (arr > 500_000 ? 12 : arr > 100_000 ? 6 : 0) +
      (i.operatingExpensesMonthly > 0 ? 4 : -2) +
      (i.cac > 0 && i.ltv > 0 ? 6 : -4),
    41,
    91,
  );

  const suggestedTimeline =
    i.founderGoal === 'exit'
      ? '90–180d exit prep · 45d buyer shortlist'
      : i.founderGoal === 'raise'
        ? '6–10w data room · 8–14w process'
        : 'Rolling 12w intelligence refresh';

  return {
    estimatedValuation,
    investorInterest: Math.round(investorInterest),
    acquisitionHeat: Math.round(acquisitionHeat),
    marketTiming,
    growthQuality: Math.round(growthQuality),
    revenueStability: Math.round(revenueStability),
    liquiditySignal,
    strategicRecommendation,
    confidencePct: Math.round(confidencePct),
    suggestedTimeline,
  };
}

function acquisitionMultipleSignal(arr: number, baseMult: number): number {
  const implied = arr > 0 ? baseMult * (arr > 2_000_000 ? 1.05 : 0.95) : 3;
  return clamp(implied / 10, 0.4, 1.1);
}

export type StrategicInsightCard = {
  id: string;
  title: string;
  explanation: string;
  confidence: number;
  metrics: string[];
  reasoning: string;
};

function fmtEnterprise(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '—';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${Math.round(n / 1000)}k`;
}

export function buildStrategicInsights(
  i: ValuationInputs,
  o: ValuationOutputs,
): StrategicInsightCard[] {
  const cards: StrategicInsightCard[] = [];
  const seen = new Set<string>();

  const add = (c: StrategicInsightCard) => {
    if (seen.has(c.id)) return;
    seen.add(c.id);
    cards.push(c);
  };

  const arrEquiv = i.arr > 0 ? i.arr : Math.max(0, i.mrr) * 12;

  if (o.growthQuality > 70 && i.founderGoal === 'hold') {
    add({
      id: 'compound',
      title: 'Compounding beats premature exit',
      explanation:
        'Efficient growth and margin structure imply higher terminal value if reinvestment cadence holds.',
      confidence: clamp(o.confidencePct - 4, 44, 88),
      metrics: ['Growth quality', 'Revenue stability', 'Burn multiple'],
      reasoning:
        'Cross-check against late-stage SaaS benchmarks suggests holding through two more reporting cycles.',
    });
  }

  if (o.investorInterest < 52) {
    add({
      id: 'soft',
      title: 'Investor appetite remains soft',
      explanation:
        'Risk capital is prioritizing durable margins over headline growth in this vertical window.',
      confidence: clamp(62 + (o.investorInterest - 50) * 0.5, 48, 82),
      metrics: ['Investor interest', 'Market timing'],
      reasoning: 'Comparable rounds show elongated diligence and smaller step-ups at this ARR band.',
    });
  }

  if (o.growthQuality > 64 && o.estimatedValuation > 0) {
    add({
      id: 'efficiency',
      title: 'Growth efficiency supports higher multiples',
      explanation:
        'Unit economics and LTV/CAC spread widen the defensible multiple band versus category median.',
      confidence: clamp(o.confidencePct - 2, 50, 90),
      metrics: ['LTV / CAC', 'Monthly growth', 'Churn'],
      reasoning: 'Implied revenue multiple tracks above rolling 4-quarter acquisition comps.',
    });
  }

  if (o.estimatedValuation > 0) {
    add({
      id: 'valuation-anchor',
      title: 'Implied enterprise anchor',
      explanation: `Desk model brackets implied value near ${fmtEnterprise(o.estimatedValuation)} on ~${fmtEnterprise(arrEquiv)} ARR equivalent, ${i.industry} comps, and your stated ${i.stage} posture.`,
      confidence: clamp(o.confidencePct - 6, 44, 90),
      metrics: ['ARR band', 'Industry multiple', 'Confidence'],
      reasoning: `Tape read: ${o.marketTiming.toLowerCase()} — tighten band with verified revenue artifacts before buyer outreach.`,
    });
  }

  add({
    id: 'acquisition-lane',
    title: 'Strategic vs. capital bid',
    explanation: `Acquisition heat ${o.acquisitionHeat}/100 vs. investor interest ${o.investorInterest}/100. ${
      o.acquisitionHeat > o.investorInterest + 6
        ? 'Corporate development lanes are relatively warm versus incremental venture demand.'
        : 'Investor formation and M&A interest are closer in-band — sequencing matters more than headline scores.'
    }`,
    confidence: clamp(55 + Math.abs(o.acquisitionHeat - o.investorInterest) * 0.25, 50, 86),
    metrics: ['Acquisition heat', 'Investor interest'],
    reasoning: o.liquiditySignal,
  });

  add({
    id: 'timing-gate',
    title: 'Market timing gate',
    explanation: `Composite tape reads “${o.marketTiming}” for ${i.industry} in ${i.geography}. Use this as the macro prior before company-specific overlays.`,
    confidence: clamp(o.confidencePct - 10, 42, 84),
    metrics: ['Market timing', 'Growth quality'],
    reasoning: o.strategicRecommendation,
  });

  add({
    id: 'liquidity-read',
    title: 'Liquidity & bid depth',
    explanation: `${o.liquiditySignal}. Pair with marketplace verified listings to sense real bid count at your ARR slice.`,
    confidence: clamp(52 + o.acquisitionHeat * 0.22, 48, 82),
    metrics: ['Liquidity signal', 'Acquisition heat'],
    reasoning:
      'When depth thins, prioritize fewer strategic conversations with sharper data hygiene over broad outreach.',
  });

  if (i.runwayMonths >= 8) {
    add({
      id: 'runway-buffer',
      title: 'Runway buffer & burn cadence',
      explanation: `${i.runwayMonths} months runway at burn multiple ${i.burnMultiple.toFixed(1)}x gives ${i.runwayMonths >= 18 ? 'comfortable' : 'workable'} room to run a process or a priced round without forced corners.`,
      confidence: clamp(58 + (i.runwayMonths >= 18 ? 8 : 0) - (i.burnMultiple > 2.2 ? 10 : 0), 44, 88),
      metrics: ['Runway', 'Burn multiple', 'OpEx'],
      reasoning: 'If burn ticks up, refresh this card monthly — runway interacts non-linearly with investor heat.',
    });
  }

  if (i.cac > 0 && i.ltv > 0) {
    const ratio = i.ltv / i.cac;
    add({
      id: 'unit-economics',
      title: 'Unit economics spread',
      explanation: `LTV/CAC ~${ratio.toFixed(1)}× with ${i.monthlyGrowthPct.toFixed(1)}% MoM growth and ${i.churnPctMonthly.toFixed(1)}% monthly churn — ${
        ratio >= 4 ? 'healthy' : ratio >= 2.5 ? 'acceptable' : 'pressure'
      } headroom versus category guardrails.`,
      confidence: clamp(50 + ratio * 4 - i.churnPctMonthly * 1.5, 46, 90),
      metrics: ['LTV', 'CAC', 'Churn'],
      reasoning: 'Stress-test with cohort retention curves; headline ratio hides vintage skew in diligence.',
    });
  }

  add({
    id: 'retention-vector',
    title: 'Growth vs. retention vector',
    explanation: `Net growth ${i.monthlyGrowthPct.toFixed(1)}% MoM against ${i.churnPctMonthly.toFixed(1)}% gross churn implies ${
      i.monthlyGrowthPct > i.churnPctMonthly * 1.5 ? 'positive' : 'tight'
    } expansion headroom before valuation step-ups.`,
    confidence: clamp(48 + o.revenueStability * 0.35, 45, 86),
    metrics: ['Monthly growth', 'Churn', 'Revenue stability'],
    reasoning: 'If churn flattens NRR, fix retention before leaning on multiple expansion narratives.',
  });

  if (i.profitMarginPct !== 0) {
    add({
      id: 'margin-posture',
      title: 'Operating margin posture',
      explanation: `${i.profitMarginPct.toFixed(0)}% profit margin on ~${fmtEnterprise(arrEquiv)} revenue scale signals ${
        i.profitMarginPct >= 15 ? 'discipline' : 'investment-heavy'
      } economics relative to ${i.stage} peers.`,
      confidence: clamp(52 + (i.profitMarginPct > 12 ? 10 : -4), 44, 85),
      metrics: ['Profit margin', 'OpEx', 'ARR'],
      reasoning: 'Margins interact with buyer financing assumptions — keep bridge models export-ready.',
    });
  }

  add({
    id: 'process-clock',
    title: 'Suggested process clock',
    explanation: o.suggestedTimeline,
    confidence: clamp(o.confidencePct - 12, 40, 78),
    metrics: ['Founder goal', 'Market timing'],
    reasoning: 'Timeline compresses when data room quality is high and revenue verification is already in place.',
  });

  if (cards.length === 0) {
    add({
      id: 'baseline',
      title: 'Baseline strategic posture',
      explanation: o.strategicRecommendation,
      confidence: o.confidencePct,
      metrics: ['ARR band', 'Industry multiple', 'Runway'],
      reasoning:
        'Signals are mixed — refresh intelligence monthly and re-run scenario stress on churn and CAC.',
    });
  }

  return cards.slice(0, 9);
}

export const DEFAULT_VALUATION_INPUTS: ValuationInputs = {
  mrr: 85000,
  arr: 0,
  profitMarginPct: 22,
  operatingExpensesMonthly: 62000,
  monthlyGrowthPct: 6.2,
  churnPctMonthly: 2.1,
  cac: 4200,
  ltv: 38000,
  burnMultiple: 1.4,
  runwayMonths: 21,
  industry: 'SaaS',
  stage: 'Series A',
  geography: 'United States',
  founderGoal: 'unsure',
};
