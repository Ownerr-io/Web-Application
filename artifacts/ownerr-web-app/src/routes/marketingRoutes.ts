/** Public marketing funnel — no `/app` or `/marketplace` prefix. */
export const marketingRoutes = {
  home: '/',
  marketIntelligence: '/market-intelligence',
  valuation: '/valuation',
  howItWorks: '/how-it-works',
  pricing: '/pricing',
} as const;

export type MarketingRouteKey = keyof typeof marketingRoutes;
