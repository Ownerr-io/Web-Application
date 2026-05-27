import type { ValuationInputs } from '@/lib/valuationIntel';
import type { OnboardingMeta } from './types';
import { isValidEmail } from './types';

export type QuestionKind = 'text' | 'number' | 'select' | 'email' | 'url' | 'tel';

export type ValuationQuestion = {
  id: string;
  prompt: string;
  hint?: string;
  kind: QuestionKind;
  optional?: boolean;
  selectOptions?: readonly string[];
  placeholder?: string;
};

export const VALUATION_QUESTIONS: ValuationQuestion[] = [
  { id: 'startupName', prompt: "What's your startup called?", kind: 'text', placeholder: 'Acme Inc.' },
  {
    id: 'industry',
    prompt: 'Which industry best describes you?',
    kind: 'select',
    selectOptions: ['SaaS', 'AI', 'Fintech', 'Consumer', 'DevTools', 'Healthcare', 'Other'],
  },
  {
    id: 'stage',
    prompt: 'What funding stage are you at?',
    kind: 'select',
    selectOptions: ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Growth'],
  },
  {
    id: 'foundingYear',
    prompt: 'When was the company founded?',
    kind: 'number',
    placeholder: '2021',
  },
  {
    id: 'mrr',
    prompt: "What's your monthly recurring revenue (MRR)?",
    hint: 'USD per month',
    kind: 'number',
    placeholder: '85000',
  },
  {
    id: 'arr',
    prompt: 'Annual recurring revenue (ARR), if you track it separately',
    hint: 'Leave blank to derive from MRR',
    kind: 'number',
    optional: true,
    placeholder: '0',
  },
  {
    id: 'monthlyGrowthPct',
    prompt: 'Average monthly revenue growth?',
    hint: 'Percent MoM',
    kind: 'number',
    placeholder: '6.2',
  },
  { id: 'cac', prompt: 'Customer acquisition cost (CAC)?', kind: 'number', placeholder: '4200' },
  { id: 'ltv', prompt: 'Lifetime value (LTV) per customer?', kind: 'number', placeholder: '38000' },
  {
    id: 'churnPctMonthly',
    prompt: 'Monthly churn rate?',
    hint: 'Gross %',
    kind: 'number',
    placeholder: '2.1',
  },
  {
    id: 'burnMultiple',
    prompt: 'Burn multiple?',
    hint: 'Net burn ÷ net new ARR',
    kind: 'number',
    placeholder: '1.4',
  },
  { id: 'teamSize', prompt: 'How large is your team today?', kind: 'number', placeholder: '24' },
  {
    id: 'geography',
    prompt: 'Primary geography?',
    kind: 'select',
    selectOptions: ['United States', 'Europe', 'UK', 'Asia', 'LATAM', 'Global remote'],
  },
  {
    id: 'customerCount',
    prompt: 'How many paying customers?',
    kind: 'number',
    optional: true,
    placeholder: 'Optional',
  },
  {
    id: 'marketCategory',
    prompt: 'Market category?',
    kind: 'select',
    selectOptions: ['B2B SaaS', 'B2C', 'Marketplace', 'Infrastructure', 'Vertical SaaS', 'Other'],
  },
  { id: 'founderName', prompt: "What's your name?", kind: 'text', placeholder: 'Jane Founder' },
  {
    id: 'workEmail',
    prompt: 'Work email for your intelligence report',
    kind: 'email',
    placeholder: 'you@company.com',
  },
  {
    id: 'companyWebsite',
    prompt: 'Company website',
    kind: 'url',
    optional: true,
    placeholder: 'https://',
  },
  {
    id: 'linkedIn',
    prompt: 'LinkedIn profile',
    kind: 'text',
    optional: true,
    placeholder: 'linkedin.com/in/…',
  },
  {
    id: 'phone',
    prompt: 'Phone number',
    kind: 'tel',
    optional: true,
    placeholder: '+1 555 000 0000',
  },
];

function num(v: string, fallback: number): number {
  const s = String(v).trim().replace(/[$,\s]/g, '');
  if (!s) return fallback;
  const suffix = s.match(/^([\d.]+)\s*([kKmMbB])$/i);
  if (suffix) {
    const base = Number(suffix[1]);
    if (!Number.isFinite(base)) return fallback;
    const u = suffix[2].toLowerCase();
    const factor = u === 'k' ? 1_000 : u === 'm' ? 1_000_000 : 1_000_000_000;
    return base * factor;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

export function getQuestionValue(
  q: ValuationQuestion,
  inputs: ValuationInputs,
  meta: OnboardingMeta,
): string {
  const id = q.id;
  if (id in meta) return String(meta[id as keyof OnboardingMeta] ?? '');
  const key = id as keyof ValuationInputs;
  if (key in inputs) {
    const v = inputs[key];
    return v === 0 && (id === 'arr' || id === 'mrr') ? '' : String(v ?? '');
  }
  return '';
}

export function setQuestionValue(
  q: ValuationQuestion,
  raw: string,
  inputs: ValuationInputs,
  meta: OnboardingMeta,
): { inputs: ValuationInputs; meta: OnboardingMeta } {
  if (q.id in meta) {
    return { inputs, meta: { ...meta, [q.id]: raw } };
  }
  const key = q.id as keyof ValuationInputs;
  if (key === 'industry' || key === 'stage' || key === 'geography') {
    return { inputs: { ...inputs, [key]: raw }, meta };
  }
  if (typeof inputs[key] === 'number') {
    return { inputs: { ...inputs, [key]: num(raw, inputs[key] as number) }, meta };
  }
  return { inputs, meta };
}

export function validateQuestion(
  q: ValuationQuestion,
  inputs: ValuationInputs,
  meta: OnboardingMeta,
): string | undefined {
  if (q.optional) return undefined;
  const raw = getQuestionValue(q, inputs, meta).trim();

  switch (q.id) {
    case 'startupName':
      if (!raw) return 'Enter your startup name';
      break;
    case 'industry':
    case 'stage':
    case 'geography':
      if (!raw) return 'Choose an option';
      break;
    case 'foundingYear': {
      const y = Number(raw);
      if (!raw || !Number.isFinite(y) || y < 1990 || y > new Date().getFullYear()) {
        return 'Enter a valid year';
      }
      break;
    }
    case 'mrr': {
      const parsed = num(raw, 0);
      const revenueOk = inputs.mrr > 0 || inputs.arr > 0 || parsed > 0;
      if (!revenueOk) return 'Enter MRR (or ARR on the next step)';
      break;
    }
    case 'arr':
      break;
    case 'teamSize':
      if (!raw || Number(raw) < 1) return 'Enter team size';
      break;
    case 'founderName':
      if (!raw) return 'Enter your name';
      break;
    case 'workEmail':
      if (!isValidEmail(raw)) return 'Enter a valid work email';
      break;
    default:
      if (q.kind === 'number' && !raw) return 'Enter a value';
      if (q.kind === 'text' && !raw) return 'Required';
  }
  return undefined;
}

/** After all questions, ensure revenue exists. */
export function validateAllInputs(inputs: ValuationInputs): boolean {
  return inputs.mrr > 0 || inputs.arr > 0;
}

export function questionProgress(index: number): number {
  return Math.round(((index + 1) / VALUATION_QUESTIONS.length) * 100);
}
