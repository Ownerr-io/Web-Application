/** Logo palette for Recharts (CSS vars resolve in any branded shell). */
export const BRAND_CHART_FILLS = [
  "var(--brand-lime)",
  "var(--brand-orange)",
  "var(--brand-red)",
  "color-mix(in srgb, var(--brand-lime) 55%, var(--terminal-muted))",
  "color-mix(in srgb, var(--brand-orange) 55%, var(--terminal-muted))",
] as const;

export const BRAND_CHART_HSL = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
] as const;
