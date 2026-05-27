import { lazy } from 'react';

/** Marketing / tools — large framer-motion + valuation stacks */
export const LazyValuationPage = lazy(() => import('@/pages/valuation'));
export const LazyMarketIntelligencePage = lazy(() => import('@/pages/market-intelligence'));
export const LazyAdminFounderStatsPage = lazy(() => import('@/pages/admin-founder-stats'));

/** Marketplace — recharts / heavy panels */
export const LazyStatsPage = lazy(() => import('@/pages/stats'));
export const LazyAcquirePage = lazy(() => import('@/pages/acquire'));
export const LazyStartupDetailPage = lazy(() => import('@/pages/startup-detail'));

/** Founder OS modal (framer-motion flow) — loaded after shell */
export const LazyFounderOsFlowDialog = lazy(() =>
  import('@/components/founder-os/FounderOsFlowDialog').then((m) => ({
    default: m.FounderOsFlowDialog,
  })),
);
