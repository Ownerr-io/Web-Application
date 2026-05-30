import { lazy } from "react";

/** Marketing / tools — large framer-motion + valuation stacks */
export const LazyValuationPage = lazy(() => import("@/pages/valuation"));
export const LazyMarketIntelligencePage = lazy(
  () => import("@/pages/market-intelligence"),
);
export const LazyAdminFounderStatsPage = lazy(
  () => import("@/pages/admin-founder-stats"),
);

/** Platform admin hub + per-app consoles */
export const LazyAdminHubPage = lazy(() => import("@/pages/admin/hub"));

export const LazyOwnerrNetworkAdminDashboard = lazy(
  () => import("@/pages/admin/ownerr-network/dashboard"),
);
export const LazyAdminUsersPage = lazy(() => import("@/pages/admin/users"));
export const LazyAdminProfilesPage = lazy(
  () => import("@/pages/admin/profiles"),
);
export const LazyAdminLedgerPage = lazy(() => import("@/pages/admin/ledger"));
export const LazyAdminReferralsPage = lazy(
  () => import("@/pages/admin/referrals"),
);

export const LazyMarketplaceAdminDashboard = lazy(
  () => import("@/pages/admin/marketplace/dashboard"),
);
export const LazyMarketplaceAdminListingsPage = lazy(
  () => import("@/pages/admin/marketplace/listings"),
);
export const LazyMarketplaceAdminSubmissionsPage = lazy(
  () => import("@/pages/admin/marketplace/submissions"),
);

export const LazyOwnerrOsAdminDashboard = lazy(
  () => import("@/pages/admin/ownerr-os/dashboard"),
);
export const LazyOwnerrOsAdminListingsPage = lazy(
  () => import("@/pages/admin/ownerr-os/listings"),
);
export const LazyOwnerrOsAdminAnalyticsPage = lazy(
  () => import("@/pages/admin/ownerr-os/analytics"),
);

/** @deprecated — use LazyOwnerrNetworkAdminDashboard */
export const LazyAdminDashboardPage = LazyOwnerrNetworkAdminDashboard;

/** Marketplace — recharts / heavy panels */
export const LazyStatsPage = lazy(() => import("@/pages/stats"));
export const LazyAcquirePage = lazy(() => import("@/pages/acquire"));
export const LazyStartupDetailPage = lazy(
  () => import("@/pages/startup-detail"),
);

/** Founder OS modal (framer-motion flow) — loaded after shell */
export const LazyFounderOsFlowDialog = lazy(() =>
  import("@/components/founder-os/FounderOsFlowDialog").then((m) => ({
    default: m.FounderOsFlowDialog,
  })),
);
