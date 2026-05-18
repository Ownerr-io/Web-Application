import type { ValuationInputs } from '@/lib/valuationIntel';
import { formatShortCurrency } from '@/lib/utils';

export type AnalysisSignal = {
  id: string;
  label: string;
  value: string;
};

export function buildAnalysisSignals(inputs: ValuationInputs): AnalysisSignal[] {
  const arr = inputs.arr > 0 ? inputs.arr : Math.max(0, inputs.mrr) * 12;
  const signals: AnalysisSignal[] = [
    { id: 'revenue', label: 'Revenue anchor', value: arr > 0 ? `${formatShortCurrency(arr)} ARR` : 'Deriving from MRR' },
    { id: 'growth', label: 'Growth velocity', value: `${inputs.monthlyGrowthPct.toFixed(1)}% MoM` },
    { id: 'unit', label: 'Unit economics', value: inputs.cac > 0 && inputs.ltv > 0 ? `LTV/CAC ${(inputs.ltv / inputs.cac).toFixed(1)}×` : 'Unit economics pending' },
    { id: 'churn', label: 'Retention curve', value: `${inputs.churnPctMonthly.toFixed(1)}% monthly churn` },
    { id: 'burn', label: 'Capital efficiency', value: inputs.burnMultiple > 0 ? `${inputs.burnMultiple.toFixed(1)}× burn multiple` : 'Burn profile' },
    { id: 'runway', label: 'Runway horizon', value: `${Math.round(inputs.runwayMonths)} months` },
    { id: 'market', label: 'Market context', value: `${inputs.industry} · ${inputs.geography}` },
    { id: 'stage', label: 'Funding posture', value: inputs.stage },
  ];
  return signals;
}
