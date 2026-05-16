import type { ValuationInputs, ValuationOutputs } from '@/lib/valuationIntel';
import { computeValuationIntel } from '@/lib/valuationIntel';

export type PreviewChip = {
  id: string;
  label: string;
  tone: 'positive' | 'neutral' | 'caution';
};

/** Lightweight engagement chips — never exposes dollar valuation. */
export function buildPreviewChips(inputs: ValuationInputs): PreviewChip[] {
  const o = computeValuationIntel(inputs);
  return buildPreviewChipsFromOutput(inputs, o);
}

export function buildPreviewChipsFromOutput(inputs: ValuationInputs, o: ValuationOutputs): PreviewChip[] {
  const chips: PreviewChip[] = [];
  const push = (c: PreviewChip) => {
    if (chips.length >= 4) return;
    if (chips.some((x) => x.id === c.id)) return;
    chips.push(c);
  };

  if (o.growthQuality >= 68 && inputs.monthlyGrowthPct >= 4) {
    push({
      id: 'growth-eff',
      label: 'Strong growth efficiency detected',
      tone: 'positive',
    });
  }

  if (o.investorInterest >= 62) {
    push({
      id: 'inv-up',
      label: 'Investor interest increasing',
      tone: 'positive',
    });
  } else if (o.investorInterest < 48) {
    push({
      id: 'inv-soft',
      label: 'Investor appetite still warming up',
      tone: 'neutral',
    });
  }

  if (inputs.burnMultiple > 0 && inputs.burnMultiple <= 1.8 && inputs.monthlyGrowthPct > 2) {
    push({
      id: 'cap-eff',
      label: 'Healthy capital efficiency',
      tone: 'positive',
    });
  }

  if (inputs.churnPctMonthly > 5) {
    push({
      id: 'churn',
      label: 'High churn slightly impacts valuation',
      tone: 'caution',
    });
  }

  if (inputs.cac > 0 && inputs.ltv > 0 && inputs.ltv / inputs.cac >= 3.5) {
    push({
      id: 'ltv',
      label: 'Unit economics support premium multiples',
      tone: 'positive',
    });
  }

  if (o.acquisitionHeat >= 65) {
    push({
      id: 'acq',
      label: 'Strategic acquirer interest building',
      tone: 'positive',
    });
  }

  if (o.revenueStability >= 70) {
    push({
      id: 'rev-stab',
      label: 'Revenue quality reads institutional',
      tone: 'positive',
    });
  }

  if (chips.length === 0) {
    push({
      id: 'baseline',
      label: 'Signals updating as you share metrics',
      tone: 'neutral',
    });
  }

  return chips;
}
