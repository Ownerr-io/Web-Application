export type ValuationPhase = 'intro' | 'questions' | 'analyzing' | 'results';

export type OnboardingMeta = {
  startupName: string;
  foundingYear: string;
  teamSize: string;
  customerCount: string;
  marketCategory: string;
  founderName: string;
  workEmail: string;
  companyWebsite: string;
  linkedIn: string;
  phone: string;
};

export const EMPTY_ONBOARDING_META: OnboardingMeta = {
  startupName: '',
  foundingYear: '',
  teamSize: '',
  customerCount: '',
  marketCategory: '',
  founderName: '',
  workEmail: '',
  companyWebsite: '',
  linkedIn: '',
  phone: '',
};

/** Prefilled questionnaire demo — user can change any answer before running analysis. */
export const DEFAULT_OWNERR_ONBOARDING_META: OnboardingMeta = {
  startupName: 'Ownerr',
  foundingYear: '2022',
  teamSize: '28',
  customerCount: '1240',
  marketCategory: 'Marketplace',
  founderName: 'Ownerr Team',
  workEmail: 'hello@ownerr.com',
  companyWebsite: 'https://ownerr.com',
  linkedIn: 'https://www.linkedin.com/company/ownerr',
  phone: '',
};

export const ONBOARDING_STEP_COUNT = 5;

export const STEP_PROGRESS: Record<number, number> = {
  0: 12,
  1: 38,
  2: 67,
  3: 91,
  4: 91,
};

export const STEP_HELPER: Record<number, string> = {
  0: 'Building valuation confidence…',
  1: 'Analyzing revenue quality…',
  2: 'Evaluating investor attractiveness…',
  3: 'Comparing sector benchmarks…',
  4: 'Preparing intelligence report…',
};

export type StepFieldErrors = Partial<Record<string, string>>;

export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
