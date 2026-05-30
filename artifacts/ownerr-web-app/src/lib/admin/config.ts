import type { AdminAppSlug } from "@/lib/admin/analytics";

export type AdminAppConfig = {
  slug: AdminAppSlug;
  label: string;
  description: string;
  basePath: string;
  dashboardPath: string;
  nav: { label: string; path: string }[];
};

export const ADMIN_APPS: AdminAppConfig[] = [
  {
    slug: "ownerr_network",
    label: "Ownerr Network",
    description: "Users, profiles, wallet ledger, and referrals",
    basePath: "/admin/ownerr-network",
    dashboardPath: "/admin/ownerr-network/dashboard",
    nav: [
      { label: "Dashboard", path: "/admin/ownerr-network/dashboard" },
      { label: "Users", path: "/admin/ownerr-network/users" },
      { label: "Profiles", path: "/admin/ownerr-network/profiles" },
      { label: "Transactions", path: "/admin/ownerr-network/ledger" },
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
      { label: "Listings", path: "/admin/marketplace/listings" },
      { label: "Submissions", path: "/admin/marketplace/submissions" },
    ],
  },
  {
    slug: "ownerr_os",
    label: "Ownerr OS",
    description: "Founder listings and viral analytics",
    basePath: "/admin/ownerr-os",
    dashboardPath: "/admin/ownerr-os/dashboard",
    nav: [
      { label: "Dashboard", path: "/admin/ownerr-os/dashboard" },
      { label: "Listings", path: "/admin/ownerr-os/listings" },
      { label: "Analytics", path: "/admin/ownerr-os/analytics" },
    ],
  },
];

export function getAdminAppFromPath(path: string): AdminAppConfig | null {
  return ADMIN_APPS.find((app) => path.startsWith(app.basePath)) ?? null;
}

export function getAdminAppBySlug(slug: AdminAppSlug): AdminAppConfig {
  const app = ADMIN_APPS.find((a) => a.slug === slug);
  if (!app) throw new Error(`Unknown admin app: ${slug}`);
  return app;
}
