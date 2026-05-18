/** Shared footprint for intro (`loading animation.lottie`) + analysis (`Valuation.lottie`). */
export const VALUATION_HERO_LOTTIE_CLASS =
  'h-[min(52dvh,440px)] w-[min(88vw,440px)] sm:h-[min(72dvh,640px)] sm:w-[min(92vw,640px)]';

/** Same dimensions as intro loading Lottie. */
export const VALUATION_ANALYSIS_LOTTIE_CLASS = VALUATION_HERO_LOTTIE_CLASS;

/** Analysis counter — scales with hero Lottie via `.valuation-analysis-stage` CSS variables. */
export const VALUATION_ANALYSIS_COUNTER_CLASS =
  'text-[1em] leading-[1.12] tracking-tight';

/** Intelligence line — typography token; slot height from CSS variable. */
export const VALUATION_ANALYSIS_INTEL_CLASS =
  'text-[length:var(--analysis-intel-size)] font-medium leading-snug tracking-tight text-[color:var(--terminal-muted)]';
