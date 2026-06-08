import type { AdminAppSlug } from "@/lib/admin/analytics";

export type AdminAppConfig = {
  slug: AdminAppSlug;
  label: string;
  description: string;
  basePath: string;
  dashboardPath: string;
  nav: { label: string; path: string }[];
};

export const ADMIN_PLATFORM_NAV: { label: string; path: string }[] = [
  { label: "Platform Intelligence", path: "/admin" },
  { label: "Operations & Governance", path: "/admin/operations" },
  { label: "System Health", path: "/admin/system" },
];

export const ADMIN_APPS: AdminAppConfig[] = [
  {
    slug: "ownerr_network",
    label: "Ownerr Network",
    description: "Members, wallet activity, and referrals",
    basePath: "/admin/ownerr-network",
    dashboardPath: "/admin/ownerr-network/dashboard",
    nav: [
      { label: "Dashboard", path: "/admin/ownerr-network/dashboard" },
      { label: "Members", path: "/admin/ownerr-network/members" },
      { label: "Wallet activity", path: "/admin/ownerr-network/ledger" },
      { label: "Referrals", path: "/admin/ownerr-network/referrals" },
    ],
  },
  {
    slug: "marketplace",
    label: "Marketplace",
    description: "Startup listings and acquisition submissions",
    basePath: "/admin/marketplace",
    dashboardPath: "/admin/marketplace/dashboard",
    nav: [
      { label: "Dashboard", path: "/admin/marketplace/dashboard" },
      { label: "Buyers", path: "/admin/marketplace/buyers" },
      { label: "Sellers", path: "/admin/marketplace/sellers" },
      { label: "Listings", path: "/admin/marketplace/listings" },
      { label: "Verification", path: "/admin/marketplace/verification" },
      { label: "Submissions", path: "/admin/marketplace/submissions" },
    ],
  },
  {
    slug: "ownerr_os",
    label: "Ownerr OS",
    description: "Founders (viral join), catalog listings, and funnel metrics",
    basePath: "/admin/ownerr-os",
    dashboardPath: "/admin/ownerr-os/dashboard",
    nav: [
      { label: "Dashboard", path: "/admin/ownerr-os/dashboard" },
      { label: "Founders", path: "/admin/ownerr-os/founders" },
      { label: "Listings", path: "/admin/ownerr-os/listings" },
    ],
  },
];

/** Sidebar grouping — platform pages vs product consoles. */
export const ADMIN_SIDEBAR_PLATFORM_SECTION = {
  title: "Platform",
  items: ADMIN_PLATFORM_NAV,
} as const;

export const ADMIN_SIDEBAR_PRODUCT_SECTION = {
  title: "Product consoles",
  items: ADMIN_APPS.map((app) => ({
    label: app.label,
    path: app.dashboardPath,
  })),
} as const;

export function isAdminPlatformPath(path: string): boolean {
  return (
    path === "/admin" ||
    path === "/admin/" ||
    path.startsWith("/admin/operations") ||
    path.startsWith("/admin/system")
  );
}

export function getAdminAppFromPath(path: string): AdminAppConfig | null {
  return ADMIN_APPS.find((app) => path.startsWith(app.basePath)) ?? null;
}

export function getAdminAppBySlug(slug: AdminAppSlug): AdminAppConfig {
  const app = ADMIN_APPS.find((a) => a.slug === slug);
  if (!app) throw new Error(`Unknown admin app: ${slug}`);
  return app;
}
