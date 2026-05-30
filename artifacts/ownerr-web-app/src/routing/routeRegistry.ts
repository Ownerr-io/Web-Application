import type { AuthRole } from "@/lib/auth/types";
import type { AuthProduct } from "@/lib/auth/routes";

/** Platform layer — not a product. */
export type RouteLayer =
  | "platform"
  | "marketplace"
  | "product"
  | "auth"
  | "account";

export type RouteProduct = "ownerr-os" | "ownerr-network" | null;

export type RouteRole = AuthRole | "network_member" | "admin";

export type LayoutShell =
  | "marketing"
  | "marketplace-public"
  | "authenticated-app"
  | "auth"
  | "none";

export function isAuthenticatedAppShell(layoutShell: LayoutShell): boolean {
  return layoutShell === "authenticated-app";
}

/** Product / surface ownership for guards and nav. */
export type RouteApp =
  | "public"
  | "shared"
  | "ownerr"
  | "marketplace"
  | "ownerr-network";

export type RouteDefinition = {
  id: string;
  pathname: string;
  layer: RouteLayer;
  product: RouteProduct;
  app: RouteApp;
  authRequired: boolean;
  publicAccess: boolean;
  /** Marketing / public marketplace browse (not product app shell). */
  publicWebsiteRoute: boolean;
  /** Authenticated product desk (per-product app prefix). */
  appInternalRoute: boolean;
  allowWhenAuthenticated: boolean;
  onboardingRequired: boolean;
  requiredRoles: RouteRole[] | null;
  authProduct: AuthProduct | null;
  postLoginDefault: string;
  layoutShell: LayoutShell;
  fallbackRoute: string;
  parentRoute: string | null;
  successRedirect: string | null;
  cancelRedirect: string | null;
  deepLinkAllowed: boolean;
};

/** Canonical path constants — single source of truth. */
export const AUTH_ROUTES = {
  start: "/auth/start",
  forbidden: "/forbidden",
} as const;

export const PUBLIC_ROUTES = {
  home: "/",
  products: "/products",
  howItWorks: "/how-it-works",
  contact: "/contact",
  valuation: "/valuation",
  marketIntelligence: "/market-intelligence",
  adminFounderStats: "/admin/founder-stats"
} as const;

export const ADMIN_ROUTES = {
  hub: "/admin",
  ownerrNetworkDashboard: "/admin/ownerr-network/dashboard",
  ownerrNetworkUsers: "/admin/ownerr-network/users",
  ownerrNetworkProfiles: "/admin/ownerr-network/profiles",
  ownerrNetworkLedger: "/admin/ownerr-network/ledger",
  ownerrNetworkReferrals: "/admin/ownerr-network/referrals",
  marketplaceDashboard: "/admin/marketplace/dashboard",
  marketplaceListings: "/admin/marketplace/listings",
  marketplaceSubmissions: "/admin/marketplace/submissions",
  ownerrOsDashboard: "/admin/ownerr-os/dashboard",
  ownerrOsListings: "/admin/ownerr-os/listings",
  ownerrOsAnalytics: "/admin/ownerr-os/analytics",
  /** @deprecated use ownerrNetworkDashboard */
  adminDashboard: "/admin/dashboard",
  /** @deprecated use ownerrNetworkUsers */
  adminUsers: "/admin/users",
  /** @deprecated use ownerrNetworkProfiles */
  adminProfiles: "/admin/profiles",
  /** @deprecated use ownerrNetworkLedger */
  adminLedger: "/admin/ledger",
  /** @deprecated use ownerrNetworkReferrals */
  adminReferrals: "/admin/referrals",
} as const;

export const PRODUCT_ROUTES = {
  ownerrOsLanding: "/products/ownerr-os",
  ownerrOsJoin: "/ownerr-os/join",
  marketplaceLanding: "/products/marketplace",
  ownerrNetworkLanding: "/products/ownerr-network",
  ownerrOsApp: "/ownerr-os/app",
  ownerrOsDashboard: "/ownerr-os/app/dashboard",
  ownerrOsAnalytics: "/ownerr-os/app/analytics",
  ownerrOsReferrals: "/ownerr-os/app/referrals",
  ownerrOsListings: "/ownerr-os/app/listings",
  ownerrOsListingNew: "/ownerr-os/app/listings/new",
  ownerrOsProfile: "/ownerr-os/app/profile",
  /** Redirects to {@link PRODUCT_ROUTES.ownerrOsProfile}. */
  ownerrOsSettings: "/ownerr-os/app/settings",
  ownerrNetworkApp: "/ownerr-network/app",
  ownerrNetworkDashboard: "/ownerr-network/app/dashboard",
  ownerrNetworkProfile: "/ownerr-network/app/profile",
  ownerrNetworkDiscover: "/ownerr-network/app/discover",
  ownerrNetworkReferrals: "/ownerr-network/app/referrals",
  ownerrNetworkWallet: "/ownerr-network/app/wallet",
  /** Redirects to {@link PRODUCT_ROUTES.ownerrNetworkProfile}. */
  ownerrNetworkSettings: "/ownerr-network/app/settings",
  ownerrNetworkOnboarding: "/ownerr-network/app/onboarding",
  ownerrNetworkLeaderboard: "/ownerr-network/app/leaderboard",
  ownerrNetworkMember: (username: string) =>
    `/ownerr-network/app/member/${encodeURIComponent(username)}`,
  ownerrNetworkShare: (username: string) =>
    `/share/network/${encodeURIComponent(username)}`,
} as const;

export const MARKETPLACE_ROUTES = {
  root: "/marketplace",
  startups: "/marketplace/startups",
  acquire: "/marketplace/acquire",
  portalLogin: "/marketplace/login",
  portalRegister: "/marketplace/register",
  portalCallback: "/marketplace/callback",
  portalForgotPassword: "/marketplace/forgot-password",
  feed: "/marketplace/feed",
  stats: "/marketplace/stats",
  cofounders: "/marketplace/cofounders",
  claim: "/marketplace/claim",
  startup: (slug: string) => `/marketplace/startup/${encodeURIComponent(slug)}`,
  founder: (handle: string) =>
    `/marketplace/founder/${encodeURIComponent(handle)}`,
  app: "/marketplace/app",
  dashboard: "/marketplace/app/buyer/dashboard",
  /** Redirects to buyer or seller profile. */
  settings: "/marketplace/app/settings",
  buyerProfile: "/marketplace/app/buyer/profile",
  buyer: "/marketplace/app/buyer",
  buyerDashboard: "/marketplace/app/buyer/dashboard",
  buyerBrowse: "/marketplace/app/buyer/browse",
  buyerStartup: (slug: string) =>
    `/marketplace/app/buyer/startup/${encodeURIComponent(slug)}`,
  buyerFounder: (handle: string) =>
    `/marketplace/app/buyer/founder/${encodeURIComponent(handle)}`,
  buyerBids: "/marketplace/app/buyer/bids",
  buyerInterests: "/marketplace/app/buyer/interests",
  buyerAcquire: "/marketplace/app/buyer/browse",
  seller: "/marketplace/app/seller",
  sellerDashboard: "/marketplace/app/seller/dashboard",
  sellerListings: "/marketplace/app/seller/listings",
  sellerInbox: "/marketplace/app/seller/inbox",
  sellerVerification: "/marketplace/app/seller/verification",
  sellerProfile: "/marketplace/app/seller/profile",
  /** Legacy aliases → seller workspace */
  founderHub: "/marketplace/app/seller/dashboard",
  founderListings: "/marketplace/app/seller/listings",
  founderInbox: "/marketplace/app/seller/inbox",
  founderProfile: "/marketplace/app/seller/profile",
  founderVerification: "/marketplace/app/seller/verification",
} as const;

/** Product-scoped auth paths (runtime routes in App.tsx). */
export const PRODUCT_AUTH_ROUTES = {
  ownerrOsLogin: "/products/ownerr-os/login",
  ownerrOsRegister: "/products/ownerr-os/register",
  ownerrOsCallback: "/products/ownerr-os/callback",
  marketplaceLogin: "/products/marketplace/login",
  marketplaceCallback: "/products/marketplace/callback",
  ownerrNetworkLogin: "/products/ownerr-network/login",
  ownerrNetworkCallback: "/products/ownerr-network/callback",
} as const;

/** Canonical authenticated product app roots. */
export const AUTHENTICATED_APP_ROOTS = {
  marketplace: MARKETPLACE_ROUTES.app,
  "ownerr-os": PRODUCT_ROUTES.ownerrOsApp,
  "ownerr-network": PRODUCT_ROUTES.ownerrNetworkApp,
} as const;

export type AuthenticatedWorkspace = keyof typeof AUTHENTICATED_APP_ROOTS;

type DefInput = Pick<
  RouteDefinition,
  | "id"
  | "pathname"
  | "layer"
  | "postLoginDefault"
  | "fallbackRoute"
  | "layoutShell"
> &
  Partial<
    Omit<
      RouteDefinition,
      | "id"
      | "pathname"
      | "layer"
      | "postLoginDefault"
      | "fallbackRoute"
      | "layoutShell"
    >
  >;

function inferApp(partial: DefInput): RouteApp {
  if (partial.app) return partial.app;
  if (partial.product === "ownerr-os") return "ownerr";
  if (partial.product === "ownerr-network") return "ownerr-network";
  if (partial.layer === "marketplace") return "marketplace";
  if (partial.layoutShell === "authenticated-app") {
    if (partial.pathname.startsWith("/ownerr-os")) return "ownerr";
    if (partial.pathname.startsWith("/ownerr-network")) return "ownerr-network";
    if (partial.pathname.startsWith("/marketplace/app")) return "marketplace";
  }
  return "public";
}

function def(partial: DefInput): RouteDefinition {
  const authRequired = partial.authRequired ?? false;
  const layoutShell = partial.layoutShell ?? "marketing";
  const publicWebsiteRoute =
    partial.publicWebsiteRoute ??
    (layoutShell === "marketing" || layoutShell === "marketplace-public");
  const appInternalRoute =
    partial.appInternalRoute ?? layoutShell === "authenticated-app";
  return {
    id: partial.id,
    pathname: partial.pathname,
    layer: partial.layer,
    postLoginDefault: partial.postLoginDefault,
    fallbackRoute: partial.fallbackRoute,
    layoutShell,
    product: partial.product ?? null,
    app: partial.app ?? inferApp(partial),
    authProduct: partial.authProduct ?? null,
    authRequired,
    publicAccess: partial.publicAccess ?? !authRequired,
    publicWebsiteRoute,
    appInternalRoute,
    allowWhenAuthenticated:
      partial.allowWhenAuthenticated ?? publicWebsiteRoute,
    onboardingRequired: partial.onboardingRequired ?? false,
    requiredRoles: partial.requiredRoles ?? null,
    parentRoute: partial.parentRoute ?? null,
    successRedirect: partial.successRedirect ?? null,
    cancelRedirect: partial.cancelRedirect ?? null,
    deepLinkAllowed: partial.deepLinkAllowed ?? true,
  };
}

/** Longest-prefix match — sorted by pathname length descending at build time. */
export const ROUTE_REGISTRY: readonly RouteDefinition[] = [
  def({
    id: "products.hub",
    pathname: PUBLIC_ROUTES.products,
    layer: "platform",
    product: null,
    authRequired: false,
    layoutShell: "marketing",
    postLoginDefault: PUBLIC_ROUTES.products,
    fallbackRoute: PUBLIC_ROUTES.home,
  }),
  def({
    id: "products.marketplace.landing",
    pathname: PRODUCT_ROUTES.marketplaceLanding,
    layer: "product",
    product: null,
    authRequired: false,
    layoutShell: "marketing",
    postLoginDefault: MARKETPLACE_ROUTES.root,
    fallbackRoute: PUBLIC_ROUTES.products,
  }),
  def({
    id: "products.ownerr-os.landing",
    pathname: PRODUCT_ROUTES.ownerrOsLanding,
    layer: "product",
    product: "ownerr-os",
    authProduct: "ownerr-os",
    authRequired: false,
    allowWhenAuthenticated: true,
    layoutShell: "marketing",
    postLoginDefault: PRODUCT_ROUTES.ownerrOsDashboard,
    fallbackRoute: PUBLIC_ROUTES.products,
  }),
  def({
    id: "ownerr-os.join",
    pathname: PRODUCT_ROUTES.ownerrOsJoin,
    layer: "product",
    product: "ownerr-os",
    authRequired: false,
    allowWhenAuthenticated: true,
    layoutShell: "marketing",
    postLoginDefault: PRODUCT_ROUTES.ownerrOsDashboard,
    fallbackRoute: PRODUCT_ROUTES.ownerrOsLanding,
  }),
  def({
    id: "admin.founder-stats",
    pathname: PUBLIC_ROUTES.adminFounderStats,
    layer: "platform",
    product: null,
    authRequired: true,
    requiredRoles: ["admin"],
    allowWhenAuthenticated: true,
    layoutShell: "marketing",
    postLoginDefault: PUBLIC_ROUTES.adminFounderStats,
    fallbackRoute: PUBLIC_ROUTES.home,
  }),
  def({
    id: "admin.hub",
    pathname: ADMIN_ROUTES.hub,
    layer: "platform",
    product: null,
    authRequired: true,
    requiredRoles: ["admin"],
    allowWhenAuthenticated: true,
    layoutShell: "marketing",
    postLoginDefault: ADMIN_ROUTES.hub,
    fallbackRoute: PUBLIC_ROUTES.home,
  }),
  def({
    id: "admin.ownerr-network.dashboard",
    pathname: ADMIN_ROUTES.ownerrNetworkDashboard,
    layer: "platform",
    product: null,
    authRequired: true,
    requiredRoles: ["admin"],
    allowWhenAuthenticated: true,
    layoutShell: "marketing",
    postLoginDefault: ADMIN_ROUTES.ownerrNetworkDashboard,
    fallbackRoute: PUBLIC_ROUTES.home,
  }),
  def({
    id: "admin.marketplace.dashboard",
    pathname: ADMIN_ROUTES.marketplaceDashboard,
    layer: "platform",
    product: null,
    authRequired: true,
    requiredRoles: ["admin"],
    allowWhenAuthenticated: true,
    layoutShell: "marketing",
    postLoginDefault: ADMIN_ROUTES.marketplaceDashboard,
    fallbackRoute: PUBLIC_ROUTES.home,
  }),
  def({
    id: "admin.ownerr-os.dashboard",
    pathname: ADMIN_ROUTES.ownerrOsDashboard,
    layer: "platform",
    product: null,
    authRequired: true,
    requiredRoles: ["admin"],
    allowWhenAuthenticated: true,
    layoutShell: "marketing",
    postLoginDefault: ADMIN_ROUTES.ownerrOsDashboard,
    fallbackRoute: PUBLIC_ROUTES.home,
  }),
  def({
    id: "admin.dashboard",
    pathname: ADMIN_ROUTES.adminDashboard,
    layer: "platform",
    product: null,
    authRequired: true,
    requiredRoles: ["admin"],
    allowWhenAuthenticated: true,
    layoutShell: "marketing",
    postLoginDefault: ADMIN_ROUTES.ownerrNetworkDashboard,
    fallbackRoute: PUBLIC_ROUTES.home,
  }),
  def({
    id: "admin.index",
    pathname: ADMIN_ROUTES.hub,
    layer: "platform",
    product: null,
    authRequired: true,
    requiredRoles: ["admin"],
    allowWhenAuthenticated: true,
    layoutShell: "marketing",
    postLoginDefault: ADMIN_ROUTES.hub,
    fallbackRoute: PUBLIC_ROUTES.home,
  }),
  def({
    id: "admin.users",
    pathname: ADMIN_ROUTES.adminUsers,
    layer: "platform",
    product: null,
    authRequired: true,
    requiredRoles: ["admin"],
    allowWhenAuthenticated: true,
    layoutShell: "marketing",
    postLoginDefault: ADMIN_ROUTES.adminUsers,
    fallbackRoute: PUBLIC_ROUTES.home,
  }),
  def({
    id: "admin.profiles",
    pathname: ADMIN_ROUTES.adminProfiles,
    layer: "platform",
    product: null,
    authRequired: true,
    requiredRoles: ["admin"],
    allowWhenAuthenticated: true,
    layoutShell: "marketing",
    postLoginDefault: ADMIN_ROUTES.adminUsers,
    fallbackRoute: PUBLIC_ROUTES.home,
  }),
  def({
    id: "admin.ledger",
    pathname: ADMIN_ROUTES.adminLedger,
    layer: "platform",
    product: null,
    authRequired: true,
    requiredRoles: ["admin"],
    allowWhenAuthenticated: true,
    layoutShell: "marketing",
    postLoginDefault: ADMIN_ROUTES.adminUsers,
    fallbackRoute: PUBLIC_ROUTES.home,
  }),
  def({
    id: "admin.referrals",
    pathname: ADMIN_ROUTES.adminReferrals,
    layer: "platform",
    product: null,
    authRequired: true,
    requiredRoles: ["admin"],
    allowWhenAuthenticated: true,
    layoutShell: "marketing",
    postLoginDefault: ADMIN_ROUTES.adminUsers,
    fallbackRoute: PUBLIC_ROUTES.home,
  }),
  def({
    id: "products.ownerrNetwork.landing",
    pathname: PRODUCT_ROUTES.ownerrNetworkLanding,
    layer: "product",
    product: "ownerr-network",
    authProduct: "ownerr-network",
    authRequired: false,
    layoutShell: "marketing",
    postLoginDefault: PRODUCT_ROUTES.ownerrNetworkDashboard,
    fallbackRoute: PUBLIC_ROUTES.products,
  }),
  def({
    id: "auth.forbidden",
    pathname: AUTH_ROUTES.forbidden,
    layer: "auth",
    product: null,
    authRequired: false,
    layoutShell: "marketing",
    allowWhenAuthenticated: true,
    postLoginDefault: PUBLIC_ROUTES.home,
    fallbackRoute: PUBLIC_ROUTES.home,
  }),
  def({
    id: "auth.start",
    pathname: AUTH_ROUTES.start,
    layer: "auth",
    product: null,
    authRequired: false,
    layoutShell: "auth",
    allowWhenAuthenticated: true,
    postLoginDefault: PUBLIC_ROUTES.products,
    fallbackRoute: PUBLIC_ROUTES.home,
  }),
  def({
    id: "marketplace.app.buyer.dashboard",
    pathname: MARKETPLACE_ROUTES.buyerDashboard,
    layer: "marketplace",
    product: null,
    authRequired: true,
    requiredRoles: ["buyer"],
    layoutShell: "authenticated-app",
    postLoginDefault: MARKETPLACE_ROUTES.buyerDashboard,
    fallbackRoute: MARKETPLACE_ROUTES.root,
  }),
  def({
    id: "marketplace.app.buyer.browse",
    pathname: MARKETPLACE_ROUTES.buyerBrowse,
    layer: "marketplace",
    product: null,
    authRequired: true,
    requiredRoles: ["buyer"],
    layoutShell: "authenticated-app",
    postLoginDefault: MARKETPLACE_ROUTES.buyerDashboard,
    fallbackRoute: MARKETPLACE_ROUTES.root,
  }),
  def({
    id: "marketplace.app.buyer.startup",
    pathname: "/marketplace/app/buyer/startup",
    layer: "marketplace",
    product: null,
    authRequired: true,
    requiredRoles: ["buyer"],
    layoutShell: "authenticated-app",
    postLoginDefault: MARKETPLACE_ROUTES.buyerDashboard,
    fallbackRoute: MARKETPLACE_ROUTES.buyerBrowse,
  }),
  def({
    id: "marketplace.app.buyer.founder",
    pathname: "/marketplace/app/buyer/founder",
    layer: "marketplace",
    product: null,
    authRequired: true,
    requiredRoles: ["buyer"],
    layoutShell: "authenticated-app",
    postLoginDefault: MARKETPLACE_ROUTES.buyerDashboard,
    fallbackRoute: MARKETPLACE_ROUTES.buyerBrowse,
  }),
  def({
    id: "marketplace.app.seller.dashboard",
    pathname: MARKETPLACE_ROUTES.sellerDashboard,
    layer: "marketplace",
    product: null,
    authRequired: true,
    requiredRoles: ["founder"],
    layoutShell: "authenticated-app",
    postLoginDefault: MARKETPLACE_ROUTES.sellerDashboard,
    fallbackRoute: MARKETPLACE_ROUTES.root,
  }),
  def({
    id: "marketplace.app.seller.listings",
    pathname: MARKETPLACE_ROUTES.sellerListings,
    layer: "marketplace",
    product: null,
    authRequired: true,
    requiredRoles: ["founder"],
    layoutShell: "authenticated-app",
    postLoginDefault: MARKETPLACE_ROUTES.sellerDashboard,
    fallbackRoute: MARKETPLACE_ROUTES.root,
  }),
  def({
    id: "marketplace.app.seller.inbox",
    pathname: MARKETPLACE_ROUTES.sellerInbox,
    layer: "marketplace",
    product: null,
    authRequired: true,
    requiredRoles: ["founder"],
    layoutShell: "authenticated-app",
    postLoginDefault: MARKETPLACE_ROUTES.sellerDashboard,
    fallbackRoute: MARKETPLACE_ROUTES.root,
  }),
  def({
    id: "marketplace.app.seller.verification",
    pathname: MARKETPLACE_ROUTES.sellerVerification,
    layer: "marketplace",
    product: null,
    authRequired: true,
    requiredRoles: ["founder"],
    layoutShell: "authenticated-app",
    postLoginDefault: MARKETPLACE_ROUTES.sellerDashboard,
    fallbackRoute: MARKETPLACE_ROUTES.root,
  }),
  def({
    id: "marketplace.app.settings",
    pathname: MARKETPLACE_ROUTES.settings,
    layer: "marketplace",
    product: null,
    authRequired: true,
    layoutShell: "authenticated-app",
    postLoginDefault: MARKETPLACE_ROUTES.app,
    fallbackRoute: MARKETPLACE_ROUTES.root,
  }),
  def({
    id: "marketplace.app.buyer.profile",
    pathname: MARKETPLACE_ROUTES.buyerProfile,
    layer: "marketplace",
    product: null,
    authRequired: true,
    requiredRoles: ["buyer"],
    layoutShell: "authenticated-app",
    postLoginDefault: MARKETPLACE_ROUTES.buyerDashboard,
    fallbackRoute: MARKETPLACE_ROUTES.root,
  }),
  def({
    id: "marketplace.app.buyer.interests",
    pathname: MARKETPLACE_ROUTES.buyerInterests,
    layer: "marketplace",
    product: null,
    authRequired: true,
    requiredRoles: ["buyer"],
    layoutShell: "authenticated-app",
    postLoginDefault: MARKETPLACE_ROUTES.buyerDashboard,
    fallbackRoute: MARKETPLACE_ROUTES.root,
  }),
  def({
    id: "marketplace.app.buyer.bids",
    pathname: MARKETPLACE_ROUTES.buyerBids,
    layer: "marketplace",
    product: null,
    authRequired: true,
    requiredRoles: ["buyer"],
    layoutShell: "authenticated-app",
    postLoginDefault: MARKETPLACE_ROUTES.buyerDashboard,
    fallbackRoute: MARKETPLACE_ROUTES.root,
  }),
  def({
    id: "marketplace.app.buyer.acquire",
    pathname: MARKETPLACE_ROUTES.buyerAcquire,
    layer: "marketplace",
    product: null,
    authRequired: true,
    requiredRoles: ["buyer"],
    layoutShell: "authenticated-app",
    postLoginDefault: MARKETPLACE_ROUTES.buyer,
    fallbackRoute: MARKETPLACE_ROUTES.root,
  }),
  def({
    id: "marketplace.app.buyer",
    pathname: MARKETPLACE_ROUTES.buyer,
    layer: "marketplace",
    product: null,
    authRequired: true,
    requiredRoles: ["buyer"],
    layoutShell: "authenticated-app",
    postLoginDefault: MARKETPLACE_ROUTES.buyer,
    fallbackRoute: MARKETPLACE_ROUTES.root,
  }),
  def({
    id: "marketplace.app.founder.listings",
    pathname: MARKETPLACE_ROUTES.founderListings,
    layer: "marketplace",
    product: null,
    authRequired: true,
    requiredRoles: ["founder"],
    layoutShell: "authenticated-app",
    postLoginDefault: MARKETPLACE_ROUTES.founderHub,
    fallbackRoute: MARKETPLACE_ROUTES.root,
  }),
  def({
    id: "marketplace.app.founder.inbox",
    pathname: MARKETPLACE_ROUTES.founderInbox,
    layer: "marketplace",
    product: null,
    authRequired: true,
    requiredRoles: ["founder"],
    layoutShell: "authenticated-app",
    postLoginDefault: MARKETPLACE_ROUTES.founderHub,
    fallbackRoute: MARKETPLACE_ROUTES.root,
  }),
  def({
    id: "marketplace.app.founder.verification",
    pathname: MARKETPLACE_ROUTES.founderVerification,
    layer: "marketplace",
    product: null,
    authRequired: true,
    requiredRoles: ["founder"],
    layoutShell: "authenticated-app",
    postLoginDefault: MARKETPLACE_ROUTES.founderHub,
    fallbackRoute: MARKETPLACE_ROUTES.root,
  }),
  def({
    id: "marketplace.app.seller.profile",
    pathname: MARKETPLACE_ROUTES.sellerProfile,
    layer: "marketplace",
    product: null,
    authRequired: true,
    requiredRoles: ["founder"],
    layoutShell: "authenticated-app",
    postLoginDefault: MARKETPLACE_ROUTES.founderHub,
    fallbackRoute: MARKETPLACE_ROUTES.root,
  }),
  def({
    id: "marketplace.app.founder",
    pathname: MARKETPLACE_ROUTES.founderHub,
    layer: "marketplace",
    product: null,
    authRequired: true,
    requiredRoles: ["founder"],
    layoutShell: "authenticated-app",
    postLoginDefault: MARKETPLACE_ROUTES.founderHub,
    fallbackRoute: MARKETPLACE_ROUTES.root,
  }),
  def({
    id: "marketplace.app.dashboard",
    pathname: MARKETPLACE_ROUTES.dashboard,
    layer: "marketplace",
    product: null,
    authRequired: true,
    layoutShell: "authenticated-app",
    postLoginDefault: MARKETPLACE_ROUTES.dashboard,
    fallbackRoute: MARKETPLACE_ROUTES.root,
  }),
  def({
    id: "marketplace.app",
    pathname: MARKETPLACE_ROUTES.app,
    layer: "marketplace",
    product: null,
    authRequired: true,
    layoutShell: "authenticated-app",
    postLoginDefault: MARKETPLACE_ROUTES.dashboard,
    fallbackRoute: MARKETPLACE_ROUTES.root,
  }),
  def({
    id: "ownerr-os.app.analytics",
    pathname: PRODUCT_ROUTES.ownerrOsAnalytics,
    layer: "product",
    product: "ownerr-os",
    authRequired: true,
    authProduct: "ownerr-os",
    requiredRoles: ["founder"],
    layoutShell: "authenticated-app",
    postLoginDefault: PRODUCT_ROUTES.ownerrOsAnalytics,
    fallbackRoute: PRODUCT_ROUTES.ownerrOsLanding,
  }),
  def({
    id: "ownerr-os.app.profile",
    pathname: PRODUCT_ROUTES.ownerrOsProfile,
    layer: "product",
    product: "ownerr-os",
    authRequired: true,
    authProduct: "ownerr-os",
    requiredRoles: ["founder"],
    layoutShell: "authenticated-app",
    postLoginDefault: PRODUCT_ROUTES.ownerrOsDashboard,
    fallbackRoute: PRODUCT_ROUTES.ownerrOsLanding,
  }),
  def({
    id: "ownerr-os.app.settings",
    pathname: PRODUCT_ROUTES.ownerrOsSettings,
    layer: "product",
    product: "ownerr-os",
    authRequired: true,
    authProduct: "ownerr-os",
    requiredRoles: ["founder"],
    layoutShell: "authenticated-app",
    postLoginDefault: PRODUCT_ROUTES.ownerrOsProfile,
    fallbackRoute: PRODUCT_ROUTES.ownerrOsLanding,
  }),
  def({
    id: "ownerr-os.app.listings.new",
    pathname: PRODUCT_ROUTES.ownerrOsListingNew,
    layer: "product",
    product: "ownerr-os",
    authRequired: true,
    authProduct: "ownerr-os",
    requiredRoles: ["founder"],
    layoutShell: "authenticated-app",
    postLoginDefault: PRODUCT_ROUTES.ownerrOsDashboard,
    fallbackRoute: PRODUCT_ROUTES.ownerrOsLanding,
  }),
  def({
    id: "ownerr-os.app.listings",
    pathname: PRODUCT_ROUTES.ownerrOsListings,
    layer: "product",
    product: "ownerr-os",
    authRequired: true,
    authProduct: "ownerr-os",
    requiredRoles: ["founder"],
    layoutShell: "authenticated-app",
    postLoginDefault: PRODUCT_ROUTES.ownerrOsDashboard,
    fallbackRoute: PRODUCT_ROUTES.ownerrOsLanding,
  }),
  def({
    id: "ownerr-os.app.dashboard",
    pathname: PRODUCT_ROUTES.ownerrOsDashboard,
    layer: "product",
    product: "ownerr-os",
    authRequired: true,
    authProduct: "ownerr-os",
    requiredRoles: ["founder"],
    layoutShell: "authenticated-app",
    postLoginDefault: PRODUCT_ROUTES.ownerrOsDashboard,
    fallbackRoute: PRODUCT_ROUTES.ownerrOsLanding,
  }),
  def({
    id: "ownerr-os.app",
    pathname: PRODUCT_ROUTES.ownerrOsApp,
    layer: "product",
    product: "ownerr-os",
    authRequired: true,
    authProduct: "ownerr-os",
    requiredRoles: ["founder"],
    layoutShell: "authenticated-app",
    postLoginDefault: PRODUCT_ROUTES.ownerrOsDashboard,
    fallbackRoute: PRODUCT_ROUTES.ownerrOsLanding,
  }),
  def({
    id: "ownerrNetwork.app.profile",
    pathname: PRODUCT_ROUTES.ownerrNetworkProfile,
    layer: "product",
    product: "ownerr-network",
    authRequired: true,
    authProduct: "ownerr-network",
    requiredRoles: ["network_member"],
    layoutShell: "authenticated-app",
    postLoginDefault: PRODUCT_ROUTES.ownerrNetworkDashboard,
    fallbackRoute: PRODUCT_ROUTES.ownerrNetworkLanding,
  }),
  def({
    id: "ownerrNetwork.app.discover",
    pathname: PRODUCT_ROUTES.ownerrNetworkDiscover,
    layer: "product",
    product: "ownerr-network",
    authRequired: true,
    authProduct: "ownerr-network",
    requiredRoles: ["network_member"],
    layoutShell: "authenticated-app",
    postLoginDefault: PRODUCT_ROUTES.ownerrNetworkDashboard,
    fallbackRoute: PRODUCT_ROUTES.ownerrNetworkLanding,
  }),
  def({
    id: "ownerrNetwork.app.onboarding",
    pathname: PRODUCT_ROUTES.ownerrNetworkOnboarding,
    layer: "product",
    product: "ownerr-network",
    authRequired: true,
    authProduct: "ownerr-network",
    requiredRoles: ["network_member"],
    layoutShell: "authenticated-app",
    postLoginDefault: PRODUCT_ROUTES.ownerrNetworkOnboarding,
    fallbackRoute: PRODUCT_ROUTES.ownerrNetworkLanding,
  }),
  def({
    id: "ownerrNetwork.app.leaderboard",
    pathname: PRODUCT_ROUTES.ownerrNetworkLeaderboard,
    layer: "product",
    product: "ownerr-network",
    authRequired: true,
    authProduct: "ownerr-network",
    requiredRoles: ["network_member"],
    layoutShell: "authenticated-app",
    postLoginDefault: PRODUCT_ROUTES.ownerrNetworkDashboard,
    fallbackRoute: PRODUCT_ROUTES.ownerrNetworkLanding,
  }),
  def({
    id: "ownerrNetwork.app.settings",
    pathname: PRODUCT_ROUTES.ownerrNetworkSettings,
    layer: "product",
    product: "ownerr-network",
    authRequired: true,
    authProduct: "ownerr-network",
    requiredRoles: ["network_member"],
    layoutShell: "authenticated-app",
    postLoginDefault: PRODUCT_ROUTES.ownerrNetworkProfile,
    fallbackRoute: PRODUCT_ROUTES.ownerrNetworkLanding,
  }),
  def({
    id: "ownerrNetwork.app.wallet",
    pathname: PRODUCT_ROUTES.ownerrNetworkWallet,
    layer: "product",
    product: "ownerr-network",
    authRequired: true,
    authProduct: "ownerr-network",
    requiredRoles: ["network_member"],
    layoutShell: "authenticated-app",
    postLoginDefault: PRODUCT_ROUTES.ownerrNetworkDashboard,
    fallbackRoute: PRODUCT_ROUTES.ownerrNetworkLanding,
  }),
  def({
    id: "ownerrNetwork.app.referrals",
    pathname: PRODUCT_ROUTES.ownerrNetworkReferrals,
    layer: "product",
    product: "ownerr-network",
    authRequired: true,
    authProduct: "ownerr-network",
    requiredRoles: ["network_member"],
    layoutShell: "authenticated-app",
    postLoginDefault: PRODUCT_ROUTES.ownerrNetworkDashboard,
    fallbackRoute: PRODUCT_ROUTES.ownerrNetworkLanding,
  }),
  def({
    id: "ownerrNetwork.app.dashboard",
    pathname: PRODUCT_ROUTES.ownerrNetworkDashboard,
    layer: "product",
    product: "ownerr-network",
    authRequired: true,
    authProduct: "ownerr-network",
    requiredRoles: ["network_member"],
    layoutShell: "authenticated-app",
    postLoginDefault: PRODUCT_ROUTES.ownerrNetworkDashboard,
    fallbackRoute: PRODUCT_ROUTES.ownerrNetworkLanding,
  }),
  def({
    id: "ownerrNetwork.app",
    pathname: PRODUCT_ROUTES.ownerrNetworkApp,
    layer: "product",
    product: "ownerr-network",
    authRequired: true,
    authProduct: "ownerr-network",
    requiredRoles: ["network_member"],
    layoutShell: "authenticated-app",
    postLoginDefault: PRODUCT_ROUTES.ownerrNetworkDashboard,
    fallbackRoute: PRODUCT_ROUTES.ownerrNetworkLanding,
  }),
  def({
    id: "products.ownerrNetwork",
    pathname: PRODUCT_ROUTES.ownerrNetworkLanding,
    layer: "product",
    product: "ownerr-network",
    authRequired: false,
    authProduct: "ownerr-network",
    layoutShell: "marketing",
    postLoginDefault: PRODUCT_ROUTES.ownerrNetworkOnboarding,
    fallbackRoute: PUBLIC_ROUTES.home,
  }),
  def({
    id: "products.ownerr-os",
    pathname: PRODUCT_ROUTES.ownerrOsLanding,
    layer: "product",
    product: "ownerr-os",
    authRequired: false,
    authProduct: "ownerr-os",
    layoutShell: "marketing",
    postLoginDefault: PRODUCT_ROUTES.ownerrOsDashboard,
    fallbackRoute: PUBLIC_ROUTES.home,
  }),
  def({
    id: "marketplace.acquire",
    pathname: MARKETPLACE_ROUTES.acquire,
    layer: "marketplace",
    product: null,
    authRequired: false,
    layoutShell: "marketplace-public",
    postLoginDefault: MARKETPLACE_ROUTES.root,
    fallbackRoute: MARKETPLACE_ROUTES.root,
  }),
  def({
    id: "marketplace.startups",
    pathname: MARKETPLACE_ROUTES.startups,
    layer: "marketplace",
    product: null,
    authRequired: false,
    layoutShell: "marketplace-public",
    postLoginDefault: MARKETPLACE_ROUTES.acquire,
    fallbackRoute: MARKETPLACE_ROUTES.root,
  }),
  def({
    id: "marketplace.portal.login",
    pathname: MARKETPLACE_ROUTES.portalLogin,
    layer: "marketplace",
    product: null,
    authRequired: false,
    layoutShell: "marketing",
    postLoginDefault: MARKETPLACE_ROUTES.app,
    fallbackRoute: MARKETPLACE_ROUTES.root,
  }),
  def({
    id: "marketplace.portal.register",
    pathname: MARKETPLACE_ROUTES.portalRegister,
    layer: "marketplace",
    product: null,
    authRequired: false,
    layoutShell: "marketing",
    postLoginDefault: MARKETPLACE_ROUTES.app,
    fallbackRoute: MARKETPLACE_ROUTES.root,
  }),
  def({
    id: "marketplace.feed",
    pathname: MARKETPLACE_ROUTES.feed,
    layer: "marketplace",
    product: null,
    authRequired: false,
    layoutShell: "marketplace-public",
    postLoginDefault: MARKETPLACE_ROUTES.root,
    fallbackRoute: MARKETPLACE_ROUTES.root,
  }),
  def({
    id: "marketplace.stats",
    pathname: MARKETPLACE_ROUTES.stats,
    layer: "marketplace",
    product: null,
    authRequired: false,
    layoutShell: "marketplace-public",
    postLoginDefault: MARKETPLACE_ROUTES.root,
    fallbackRoute: MARKETPLACE_ROUTES.root,
  }),
  def({
    id: "marketplace.cofounders",
    pathname: MARKETPLACE_ROUTES.cofounders,
    layer: "marketplace",
    product: null,
    authRequired: false,
    layoutShell: "marketplace-public",
    postLoginDefault: MARKETPLACE_ROUTES.root,
    fallbackRoute: MARKETPLACE_ROUTES.root,
  }),
  def({
    id: "marketplace.claim",
    pathname: MARKETPLACE_ROUTES.claim,
    layer: "marketplace",
    product: null,
    authRequired: false,
    layoutShell: "marketplace-public",
    postLoginDefault: MARKETPLACE_ROUTES.root,
    fallbackRoute: MARKETPLACE_ROUTES.root,
  }),
  def({
    id: "marketplace.startup",
    pathname: "/marketplace/startup",
    layer: "marketplace",
    product: null,
    authRequired: false,
    layoutShell: "marketplace-public",
    postLoginDefault: MARKETPLACE_ROUTES.root,
    fallbackRoute: MARKETPLACE_ROUTES.root,
  }),
  def({
    id: "marketplace.founder",
    pathname: "/marketplace/founder",
    layer: "marketplace",
    product: null,
    authRequired: false,
    layoutShell: "marketplace-public",
    postLoginDefault: MARKETPLACE_ROUTES.root,
    fallbackRoute: MARKETPLACE_ROUTES.root,
  }),
  def({
    id: "marketplace.root",
    pathname: MARKETPLACE_ROUTES.root,
    layer: "marketplace",
    product: null,
    authRequired: false,
    layoutShell: "marketplace-public",
    postLoginDefault: MARKETPLACE_ROUTES.root,
    fallbackRoute: PUBLIC_ROUTES.home,
  }),
  def({
    id: "platform.products",
    pathname: PUBLIC_ROUTES.products,
    layer: "platform",
    product: null,
    authRequired: false,
    layoutShell: "marketing",
    postLoginDefault: PUBLIC_ROUTES.products,
    fallbackRoute: PUBLIC_ROUTES.home,
  }),
  def({
    id: "platform.valuation",
    pathname: PUBLIC_ROUTES.valuation,
    layer: "platform",
    product: null,
    authRequired: false,
    layoutShell: "marketing",
    postLoginDefault: PUBLIC_ROUTES.valuation,
    fallbackRoute: PUBLIC_ROUTES.home,
  }),
  def({
    id: "platform.intelligence",
    pathname: PUBLIC_ROUTES.marketIntelligence,
    layer: "platform",
    product: null,
    authRequired: false,
    layoutShell: "marketing",
    postLoginDefault: PUBLIC_ROUTES.marketIntelligence,
    fallbackRoute: PUBLIC_ROUTES.home,
  }),
  def({
    id: "platform.how-it-works",
    pathname: PUBLIC_ROUTES.howItWorks,
    layer: "platform",
    product: null,
    authRequired: false,
    layoutShell: "marketing",
    postLoginDefault: PUBLIC_ROUTES.howItWorks,
    fallbackRoute: PUBLIC_ROUTES.home,
  }),
  def({
    id: "platform.contact",
    pathname: PUBLIC_ROUTES.contact,
    layer: "platform",
    product: null,
    authRequired: false,
    layoutShell: "marketing",
    postLoginDefault: PUBLIC_ROUTES.contact,
    fallbackRoute: PUBLIC_ROUTES.home,
  }),
  def({
    id: "share.founder",
    pathname: "/share/founder",
    layer: "product",
    product: "ownerr-os",
    authRequired: false,
    allowWhenAuthenticated: true,
    layoutShell: "marketing",
    postLoginDefault: PRODUCT_ROUTES.ownerrOsDashboard,
    fallbackRoute: PUBLIC_ROUTES.home,
  }),
  def({
    id: "share.ownerrNetwork",
    pathname: "/share/network",
    layer: "product",
    product: "ownerr-network",
    authRequired: false,
    authProduct: "ownerr-network",
    layoutShell: "marketing",
    postLoginDefault: PRODUCT_ROUTES.ownerrNetworkDashboard,
    fallbackRoute: PUBLIC_ROUTES.home,
  }),
  def({
    id: "platform.home",
    pathname: PUBLIC_ROUTES.home,
    layer: "platform",
    product: null,
    authRequired: false,
    layoutShell: "marketing",
    postLoginDefault: PUBLIC_ROUTES.home,
    fallbackRoute: PUBLIC_ROUTES.home,
  }),
].sort((a, b) => b.pathname.length - a.pathname.length);

export const DEFAULT_ROUTE = ROUTE_REGISTRY.find(
  (r) => r.id === "platform.home",
)!;

export const PROTECTED_ROUTES = ROUTE_REGISTRY.filter((r) => r.authRequired);
