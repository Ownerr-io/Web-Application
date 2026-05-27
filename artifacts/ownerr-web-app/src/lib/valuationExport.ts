import type { StrategicInsightCard, ValuationInputs, ValuationOutputs } from '@/lib/valuationIntel';
import { formatEnterpriseValuation, formatShortCurrency } from '@/lib/utils';
import type { OnboardingMeta } from '@/components/valuation/types';
import { VALUATION_QUESTIONS, getQuestionValue, type ValuationQuestion } from '@/components/valuation/valuationQuestions';

export type ValuationExportBundle = {
  inputs: ValuationInputs;
  outputs: ValuationOutputs;
  insights: StrategicInsightCard[];
  meta: OnboardingMeta;
  startupName?: string;
};

type ReportRow = { label: string; value: string; context?: string };
type GaugeRow = { label: string; subtitle: string; score: number };
type InsightRow = {
  id: string;
  title: string;
  confidence_pct: number;
  explanation: string;
  referenced_metrics: string;
  market_reasoning: string;
};

export type ValuationExportDocument = {
  companyName: string;
  generatedAt: string;
  reportRef: string;
  enterpriseValue: ReportRow[];
  gauges: GaugeRow[];
  marketTiming: ReportRow[];
  narrative: { index: number; text: string }[];
  questionnaire: ReportRow[];
  modelEngineInputs: ReportRow[];
  insights: InsightRow[];
  executiveSummary: string;
  hasValuation: boolean;
  rangeLabel: string;
  midpointLabel: string;
};

function valuationBand(mid: number, confidencePct: number): { low: number; high: number } {
  const spread = 0.08 + (100 - confidencePct) / 1000;
  return { low: mid * (1 - spread), high: mid * (1 + spread) };
}

export function buildInvestorNarrative(inputs: ValuationInputs, o: ValuationOutputs): string[] {
  const lines: string[] = [];
  if (inputs.cac > 0 && inputs.ltv > 0 && inputs.ltv / inputs.cac >= 3) {
    lines.push(
      'Favorable unit economics with sound LTV/CAC ratios structurally anchor strategic M&A valuation multiples.',
    );
  }
  if (inputs.monthlyGrowthPct > 4 && inputs.burnMultiple <= 2) {
    lines.push(
      'Consistent revenue growth velocity outpaces capital burn multiple expansion, showing exceptional leverage.',
    );
  }
  if (o.investorInterest >= 65) {
    lines.push(
      'Venture appetite models indicate strong institutional likelihood for supporting structured primary equity rounds.',
    );
  }
  if (o.acquisitionHeat > o.investorInterest + 8) {
    lines.push(
      'Corporate buy-side M&A appetite exceeds incremental venture financing interest, favoring strategic acquisition sequences.',
    );
  }
  if (inputs.churnPctMonthly > 5) {
    lines.push(
      'Elevated churn indices compress overall valuation multiples; priority focus recommended on stabilizing net revenue retention.',
    );
  }
  if (lines.length === 0) {
    lines.push(o.strategicRecommendation);
  }
  return lines.slice(0, 4);
}

function questionFieldLabel(q: ValuationQuestion): string {
  return q.prompt.replace(/\?$/, '').trim();
}

function formatQuestionDisplay(q: ValuationQuestion, raw: string): string {
  const v = raw.trim();
  if (!v && q.optional) return '—';
  if (q.id === 'mrr' || q.id === 'arr' || q.id === 'cac' || q.id === 'ltv') {
    const n = Number(v.replace(/,/g, ''));
    if (Number.isFinite(n) && n > 0) return formatShortCurrency(n);
  }
  if (q.id === 'monthlyGrowthPct' || q.id === 'churnPctMonthly') return v ? `${v}%` : '—';
  return v || '—';
}

export function buildValuationExportDocument(bundle: ValuationExportBundle): ValuationExportDocument {
  const { inputs, outputs, insights, meta, startupName } = bundle;
  const band = valuationBand(outputs.estimatedValuation, outputs.confidencePct);
  const narrative = buildInvestorNarrative(inputs, outputs);
  const companyName = startupName || meta.startupName.trim() || 'Subject company';
  const generatedAtDisplay = new Date().toLocaleString(undefined, {
    dateStyle: 'long',
    timeStyle: 'short',
  });
  const reportRef = `OWNERR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const efficiencyLabel =
    inputs.burnMultiple > 0 ? `${inputs.burnMultiple.toFixed(1)}× burn multiple` : '—';
  const hasValuation = outputs.estimatedValuation > 0;

  const enterpriseValue: ReportRow[] = hasValuation
    ? [
        {
          label: 'Implied enterprise value (low)',
          value: formatEnterpriseValuation(band.low),
          context: 'USD · desk model band',
        },
        {
          label: 'Implied enterprise value (high)',
          value: formatEnterpriseValuation(band.high),
          context: 'USD · desk model band',
        },
        {
          label: 'Midpoint anchor valuation',
          value: formatEnterpriseValuation(outputs.estimatedValuation),
          context: 'USD · primary anchor',
        },
        {
          label: 'Model confidence',
          value: `${outputs.confidencePct} / 100`,
          context: 'Synthesis confidence index',
        },
      ]
    : [
        {
          label: 'Implied enterprise value',
          value: 'Not computed',
          context: 'Provide MRR or ARR in the verified data section to anchor the model.',
        },
      ];

  const gauges: GaugeRow[] = [
    {
      label: 'Acquisition Appetite',
      subtitle: 'Corporate M&A heat index',
      score: outputs.acquisitionHeat,
    },
    {
      label: 'Investor Demand',
      subtitle: 'Equity backing likelihood',
      score: outputs.investorInterest,
    },
    {
      label: 'Growth Integrity',
      subtitle: 'Revenue quality multiple',
      score: outputs.growthQuality,
    },
  ];

  const marketTiming: ReportRow[] = [
    {
      label: 'Market timing index',
      value: outputs.marketTiming,
      context:
        'Strategic liquidity events and private equity transaction volume shape this timing corridor.',
    },
    {
      label: 'Capital efficiency anchor',
      value: efficiencyLabel,
      context: 'Net ARR returns relative to operating capital burn rate.',
    },
    { label: 'Revenue stability (model)', value: `${outputs.revenueStability} / 100`, context: '' },
    { label: 'Liquidity signal', value: outputs.liquiditySignal, context: '' },
    { label: 'Suggested timeline', value: outputs.suggestedTimeline, context: '' },
  ];

  const questionnaire: ReportRow[] = VALUATION_QUESTIONS.map((q) => {
    const raw = getQuestionValue(q, inputs, meta).trim();
    if (!raw && q.optional) return null;
    return {
      label: questionFieldLabel(q),
      value: formatQuestionDisplay(q, raw),
      context: q.hint ?? '',
    };
  }).filter(Boolean) as ReportRow[];

  const founderGoalLabels: Record<ValuationInputs['founderGoal'], string> = {
    exit: 'Exit',
    raise: 'Raise',
    hold: 'Hold',
    unsure: 'Unsure',
  };

  const modelEngineInputs: ReportRow[] = [
    {
      label: 'Profit margin',
      value: `${inputs.profitMarginPct}%`,
      context: 'Model parameter',
    },
    {
      label: 'Operating expenses (monthly)',
      value: formatShortCurrency(inputs.operatingExpensesMonthly),
      context: 'USD / month',
    },
    { label: 'Runway', value: `${inputs.runwayMonths} months`, context: 'Model parameter' },
    { label: 'Founder goal', value: founderGoalLabels[inputs.founderGoal], context: 'Model parameter' },
  ];

  const insightRows: InsightRow[] = insights.map((card) => ({
    id: card.id,
    title: card.title,
    confidence_pct: Math.round(card.confidence),
    explanation: card.explanation,
    referenced_metrics: card.metrics.join(' · '),
    market_reasoning: card.reasoning,
  }));

  const rangeLabel = hasValuation
    ? `${formatEnterpriseValuation(band.low)} - ${formatEnterpriseValuation(band.high)}`
    : 'Pending revenue anchor';
  const midpointLabel = hasValuation
    ? formatEnterpriseValuation(outputs.estimatedValuation)
    : 'N/A';

  const executiveSummary = hasValuation
    ? `This venture synthesis appraisal presents an implied enterprise value range of ${rangeLabel}, with a midpoint anchor of ${midpointLabel} and model confidence of ${outputs.confidencePct}/100. Indices reflect ${outputs.marketTiming.toLowerCase()} market timing, acquisition heat of ${outputs.acquisitionHeat}/100, and investor demand of ${outputs.investorInterest}/100. The analysis is intended for institutional planning, diligence preparation, and strategic optionality assessment, not as a formal fairness opinion or audited valuation.`
    : `This report documents operating and corporate inputs for ${companyName}. A quantitative enterprise value band was not synthesized because recurring revenue anchors were incomplete. Complete verified MRR or ARR to generate an implied range in a subsequent run.`;

  return {
    companyName,
    generatedAt: generatedAtDisplay,
    reportRef,
    enterpriseValue,
    gauges,
    marketTiming,
    narrative: narrative.map((text, i) => ({ index: i + 1, text })),
    questionnaire,
    modelEngineInputs,
    insights: insightRows,
    executiveSummary,
    hasValuation,
    rangeLabel,
    midpointLabel,
  };
}

export function getValuationCaptureRows(
  inputs: ValuationInputs,
  meta: OnboardingMeta,
): { label: string; value: string }[] {
  return VALUATION_QUESTIONS.map((q) => {
    const raw = getQuestionValue(q, inputs, meta).trim();
    if (!raw && q.optional) return null;
    return {
      label: questionFieldLabel(q),
      value: formatQuestionDisplay(q, raw),
    };
  }).filter(Boolean) as { label: string; value: string }[];
}

export async function downloadValuationPdf(bundle: ValuationExportBundle): Promise<void> {
  const { downloadValuationPdfImpl } = await import('@/lib/valuationExportPdf');
  return downloadValuationPdfImpl(bundle);
}
