import { productAuthPath } from "@/lib/auth/productAuthRoutes";
import { PRODUCT_ROUTES, PUBLIC_ROUTES } from "@/routing/routeRegistry";

/** @deprecated Prefer `@/routing/routeRegistry` PUBLIC_ROUTES / PRODUCT_ROUTES */
export const marketingRoutes = {
  home: PUBLIC_ROUTES.home,
  products: PUBLIC_ROUTES.products,
  marketIntelligence: PUBLIC_ROUTES.marketIntelligence,
  valuation: PUBLIC_ROUTES.valuation,
  howItWorks: PUBLIC_ROUTES.howItWorks,
  contact: PUBLIC_ROUTES.contact,
  ownerrOs: PRODUCT_ROUTES.ownerrOsLanding,
  join: PRODUCT_ROUTES.ownerrOsJoin,
  adminFounderStats: PUBLIC_ROUTES.adminFounderStats,
  ownerrNetwork: PRODUCT_ROUTES.ownerrNetworkLanding,
  ownerrNetworkLogin: productAuthPath("ownerr_network", "login"),
  authLogin: productAuthPath("ownerr_os", "login"),
  authRegister: productAuthPath("ownerr_os", "register"),
  ownerrNetworkDashboard: PRODUCT_ROUTES.ownerrNetworkDashboard,
  ownerrNetworkLeaderboard: PRODUCT_ROUTES.ownerrNetworkLeaderboard,
  ownerrNetworkOnboarding: PRODUCT_ROUTES.ownerrNetworkOnboarding,
  getStarted: PUBLIC_ROUTES.products,
} as const;

export type MarketingRouteKey = keyof typeof marketingRoutes;
