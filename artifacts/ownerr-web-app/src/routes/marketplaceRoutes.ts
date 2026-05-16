import { MARKETPLACE_BASE, marketplacePath } from '@/lib/appPaths';

/** Canonical marketplace segments (single source for path shape). */
export const marketplaceRoutes = {
  root: MARKETPLACE_BASE,
  acquire: marketplacePath('/acquire'),
  feed: marketplacePath('/feed'),
  stats: marketplacePath('/stats'),
  cofounders: marketplacePath('/cofounders'),
  claim: marketplacePath('/claim'),
  startup: (slug: string) => marketplacePath(`/startup/${slug}`),
  founder: (handle: string) => marketplacePath(`/founder/${handle}`),
} as const;

export type MarketplaceRouteKey = keyof typeof marketplaceRoutes;
