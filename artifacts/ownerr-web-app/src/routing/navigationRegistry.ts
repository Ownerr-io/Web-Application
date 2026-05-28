import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Briefcase,
  LayoutDashboard,
  MessageSquare,
  Search,
  Star,
  Trophy,
  User,
  Wallet,
  Compass,
  Shield,
  Link2,
} from "lucide-react";
import type { AuthRole } from "@/lib/auth/types";
import type { AccessSubject } from "@/routing/authorize";
import { canAccessPath } from "@/routing/authorize";
import {
  AUTH_ROUTES,
  MARKETPLACE_ROUTES,
  PRODUCT_ROUTES,
  PUBLIC_ROUTES,
  type AuthenticatedWorkspace,
  type RouteRole,
} from "@/routing/routeRegistry";
import { buildAuthStartRedirect } from "@/routing/authResolver";
import { normalizePathname } from "@/routing/routeResolver";

export type PublicNavLink = {
  id: string;
  label: string;
  href: string;
};

export type ProductNavItem = {
  id: string;
  label: string;
  description: string;
  href: string;
  appHref: string;
  openLabel: string;
  learnMoreHref: string;
};

export type PublicNavCta = {
  id: string;
  label: string;
  href: string;
  variant: "ghost" | "primary";
};

export const NAV_ITEMS: PublicNavLink[] = [
  { id: "marketplace", label: "Marketplace", href: MARKETPLACE_ROUTES.root },
  { id: "howItWorks", label: "How It Works", href: PUBLIC_ROUTES.howItWorks },
  { id: "contact", label: "Contact", href: PUBLIC_ROUTES.contact },
];

export const PRODUCT_ITEMS: ProductNavItem[] = [
  {
    id: "marketplace",
    label: "Marketplace",
    description:
      "Acquire startups, manage deals, and run buyer or founder desk workflows.",
    href: PRODUCT_ROUTES.marketplaceLanding,
    appHref: MARKETPLACE_ROUTES.app,
    openLabel: "Open Marketplace",
    learnMoreHref: MARKETPLACE_ROUTES.root,
  },
  {
    id: "ownerr-os",
    label: "OWNERR OS",
    description:
      "Founder viral loop, share cards, and referral growth for startups.",
    href: PRODUCT_ROUTES.ownerrOsLanding,
    appHref: PRODUCT_ROUTES.ownerrOsApp,
    openLabel: "Open OWNERR OS",
    learnMoreHref: `${PRODUCT_ROUTES.ownerrOsLanding}#product-overview`,
  },
  {
    id: "ownerr-network",
    label: "Ownerr Network",
    description:
      "Profile-first discovery, reputation, referrals, and platform credits.",
    href: PRODUCT_ROUTES.ownerrNetworkLanding,
    appHref: PRODUCT_ROUTES.ownerrNetworkApp,
    openLabel: "Open Ownerr Network",
    learnMoreHref: `${PRODUCT_ROUTES.ownerrNetworkLanding}#product-overview`,
  },
];

export type ProductsMenuLink = {
  id: string;
  label: string;
  description: string;
  href: string;
};

export type ProductsDropdownSection = {
  id: string;
  title: string | null;
  items: ProductsMenuLink[];
};

export const PRODUCTS_HUB_LINK: ProductsMenuLink = {
  id: "all-products",
  label: "All products",
  description: "Browse every OWNERR product app in one place.",
  href: PUBLIC_ROUTES.products,
};

const productAppMenuLinks: ProductsMenuLink[] = PRODUCT_ITEMS.filter(
  (p) => p.id !== "marketplace",
).map((p) => ({
  id: p.id,
  label: p.label,
  description: p.description,
  href: p.href,
}));

export function getProductsDropdownSections(): ProductsDropdownSection[] {
  return [{ id: "apps", title: "Product apps", items: productAppMenuLinks }];
}

export function getAllProductsMenuHrefs(): string[] {
  return getProductsDropdownSections().flatMap((s) =>
    s.items.map((i) => i.href),
  );
}

export const PUBLIC_NAV_CTA_ITEMS: PublicNavCta[] = [
  {
    id: "get-started",
    label: "Get Started",
    href: AUTH_ROUTES.start,
    variant: "primary",
  },
];

export function signInHref(redirectPath?: string) {
  return buildAuthStartRedirect(redirectPath);
}

export function getStartedHref(redirectPath?: string) {
  return buildAuthStartRedirect(redirectPath);
}

export function marketplaceWorkspaceForRole(role: AuthRole): string {
  return role === "buyer"
    ? MARKETPLACE_ROUTES.buyerDashboard
    : MARKETPLACE_ROUTES.sellerDashboard;
}

export function isNavLinkActive(location: string, href: string): boolean {
  const base = href.split("#")[0];
  if (base === PUBLIC_ROUTES.home) return location === "/" || location === "";
  if (base === MARKETPLACE_ROUTES.root) {
    return (
      location === MARKETPLACE_ROUTES.root ||
      location === `${MARKETPLACE_ROUTES.root}/`
    );
  }
  if (base.startsWith(`${MARKETPLACE_ROUTES.root}/`)) {
    return location === base || location.startsWith(`${base}/`);
  }
  return (
    location === base ||
    location.startsWith(`${base}?`) ||
    location.startsWith(`${base}/`)
  );
}

export function isProductsDropdownActive(location: string): boolean {
  return getAllProductsMenuHrefs().some((href) =>
    isNavLinkActive(location, href),
  );
}

const PRODUCT_SHELL_LABELS: readonly {
  id: AuthenticatedWorkspace;
  label: string;
}[] = [
  { id: "marketplace", label: "Marketplace" },
  { id: "ownerr-os", label: "OWNERR OS" },
  { id: "ownerr-network", label: "Ownerr Network" },
];

/** Sidebar context: authenticated product workspace only. */
export type SidebarNavGroup = AuthenticatedWorkspace;

export type SidebarNavItemDef = {
  id: string;
  group: SidebarNavGroup;
  label: string;
  href: string;
  icon: LucideIcon;
  requiredRoles: RouteRole[] | null;
};

export type SidebarNavSection = {
  title: string;
  items: readonly SidebarNavItemDef[];
};

function marketplaceNavItem(
  id: string,
  label: string,
  href: string,
  icon: LucideIcon,
  requiredRoles: RouteRole[] | null = null,
): SidebarNavItemDef {
  return { id, group: "marketplace", label, href, icon, requiredRoles };
}

const MARKETPLACE_BUYER_SIDEBAR: readonly SidebarNavSection[] = [
  {
    title: "Buyer",
    items: [
      marketplaceNavItem(
        "marketplace.buyer.overview",
        "Overview",
        MARKETPLACE_ROUTES.buyerDashboard,
        LayoutDashboard,
        ["buyer"],
      ),
      marketplaceNavItem(
        "marketplace.buyer.browse",
        "Browse Startups",
        MARKETPLACE_ROUTES.buyerBrowse,
        Search,
        ["buyer"],
      ),
      marketplaceNavItem(
        "marketplace.buyer.interests",
        "My Interests",
        MARKETPLACE_ROUTES.buyerInterests,
        Star,
        ["buyer"],
      ),
      marketplaceNavItem(
        "marketplace.buyer.bids",
        "My Bids",
        MARKETPLACE_ROUTES.buyerBids,
        Activity,
        ["buyer"],
      ),
      marketplaceNavItem(
        "marketplace.buyer.profile",
        "Profile",
        MARKETPLACE_ROUTES.buyerProfile,
        User,
        ["buyer"],
      ),
    ],
  },
];

const MARKETPLACE_SELLER_SIDEBAR: readonly SidebarNavSection[] = [
  {
    title: "Seller",
    items: [
      marketplaceNavItem(
        "marketplace.seller.overview",
        "Overview",
        MARKETPLACE_ROUTES.sellerDashboard,
        LayoutDashboard,
        ["founder"],
      ),
      marketplaceNavItem(
        "marketplace.seller.listings",
        "My Listings",
        MARKETPLACE_ROUTES.sellerListings,
        Briefcase,
        ["founder"],
      ),
      marketplaceNavItem(
        "marketplace.seller.inbox",
        "Inbox",
        MARKETPLACE_ROUTES.sellerInbox,
        MessageSquare,
        ["founder"],
      ),
      marketplaceNavItem(
        "marketplace.seller.verification",
        "Verification",
        MARKETPLACE_ROUTES.sellerVerification,
        Shield,
        ["founder"],
      ),
      marketplaceNavItem(
        "marketplace.seller.profile",
        "Profile",
        MARKETPLACE_ROUTES.sellerProfile,
        User,
        ["founder"],
      ),
    ],
  },
];

function isSidebarItemVisible(
  item: SidebarNavItemDef,
  subject: AccessSubject,
): boolean {
  if (!canAccessPath(item.href, subject)) return false;
  if (!item.requiredRoles?.length) return true;
  if (item.requiredRoles.includes("network_member"))
    return subject.networkProfile;
  if (!subject.deskUser) return false;
  return item.requiredRoles.includes(subject.deskUser.role);
}

export function getMarketplaceSidebarSections(
  subject: AccessSubject,
): SidebarNavSection[] {
  const role = subject.deskUser?.role;
  const sections =
    role === "founder"
      ? MARKETPLACE_SELLER_SIDEBAR
      : role === "buyer"
        ? MARKETPLACE_BUYER_SIDEBAR
        : [...MARKETPLACE_BUYER_SIDEBAR, ...MARKETPLACE_SELLER_SIDEBAR];
  return sections
    .map((section) => ({
      title: section.title,
      items: section.items.filter((item) =>
        isSidebarItemVisible(item, subject),
      ),
    }))
    .filter((section) => section.items.length > 0);
}

function ownerrNavItem(
  id: string,
  label: string,
  href: string,
  icon: LucideIcon,
  requiredRoles: RouteRole[] | null = ["founder"],
): SidebarNavItemDef {
  return { id, group: "ownerr-os", label, href, icon, requiredRoles };
}

const OWNERR_OS_SIDEBAR: readonly SidebarNavSection[] = [
  {
    title: "Founder",
    items: [
      ownerrNavItem(
        "ownerr-os.dashboard",
        "Overview",
        PRODUCT_ROUTES.ownerrOsDashboard,
        LayoutDashboard,
      ),
      ownerrNavItem(
        "ownerr-os.listings",
        "My Startups",
        PRODUCT_ROUTES.ownerrOsListings,
        Briefcase,
      ),
      ownerrNavItem(
        "ownerr-os.analytics",
        "Analytics",
        PRODUCT_ROUTES.ownerrOsAnalytics,
        BarChart3,
      ),
    ],
  },
  {
    title: "Account",
    items: [
      ownerrNavItem(
        "ownerr-os.profile",
        "Profile",
        PRODUCT_ROUTES.ownerrOsProfile,
        User,
      ),
    ],
  },
];

export function getOwnerrOsSidebarSections(
  subject: AccessSubject,
): SidebarNavSection[] {
  return OWNERR_OS_SIDEBAR.map((section) => ({
    title: section.title,
    items: section.items.filter((item) => isSidebarItemVisible(item, subject)),
  })).filter((section) => section.items.length > 0);
}

const SIDEBAR_NAV_REGISTRY: readonly SidebarNavItemDef[] = [
  {
    id: "ownerr-os.dashboard",
    group: "ownerr-os",
    label: "Dashboard",
    href: PRODUCT_ROUTES.ownerrOsDashboard,
    icon: LayoutDashboard,
    requiredRoles: ["founder"],
  },
  {
    id: "ownerr-os.listings",
    group: "ownerr-os",
    label: "My Startups",
    href: PRODUCT_ROUTES.ownerrOsListings,
    icon: Briefcase,
    requiredRoles: ["founder"],
  },
  {
    id: "ownerr-os.analytics",
    group: "ownerr-os",
    label: "Analytics",
    href: PRODUCT_ROUTES.ownerrOsAnalytics,
    icon: BarChart3,
    requiredRoles: ["founder"],
  },
  {
    id: "ownerr-os.profile",
    group: "ownerr-os",
    label: "Profile",
    href: PRODUCT_ROUTES.ownerrOsProfile,
    icon: User,
    requiredRoles: ["founder"],
  },
  {
    id: "ownerr-network.dashboard",
    group: "ownerr-network",
    label: "Dashboard",
    href: PRODUCT_ROUTES.ownerrNetworkDashboard,
    icon: LayoutDashboard,
    requiredRoles: ["network_member"],
  },
  {
    id: "ownerr-network.discover",
    group: "ownerr-network",
    label: "Discover",
    href: PRODUCT_ROUTES.ownerrNetworkDiscover,
    icon: Compass,
    requiredRoles: ["network_member"],
  },
  {
    id: "ownerr-network.referrals",
    group: "ownerr-network",
    label: "Referral",
    href: PRODUCT_ROUTES.ownerrNetworkReferrals,
    icon: Link2,
    requiredRoles: ["network_member"],
  },
  {
    id: "ownerr-network.wallet",
    group: "ownerr-network",
    label: "Wallet",
    href: PRODUCT_ROUTES.ownerrNetworkWallet,
    icon: Wallet,
    requiredRoles: ["network_member"],
  },
  {
    id: "ownerr-network.leaderboard",
    group: "ownerr-network",
    label: "Leaderboard",
    href: PRODUCT_ROUTES.ownerrNetworkLeaderboard,
    icon: Trophy,
    requiredRoles: ["network_member"],
  },
  {
    id: "ownerr-network.profile",
    group: "ownerr-network",
    label: "Profile",
    href: PRODUCT_ROUTES.ownerrNetworkProfile,
    icon: User,
    requiredRoles: ["network_member"],
  },
] as const;

const SIDEBAR_NAV_BY_GROUP: Record<SidebarNavGroup, SidebarNavItemDef[]> = {
  marketplace: [],
  "ownerr-os": [],
  "ownerr-network": [],
};

for (const item of SIDEBAR_NAV_REGISTRY) {
  SIDEBAR_NAV_BY_GROUP[item.group].push(item);
}

export function isSidebarNavActive(location: string, href: string): boolean {
  const path = normalizePathname(location.split("?")[0] ?? location);
  const base = normalizePathname(href.split("?")[0]?.split("#")[0] ?? href);
  return path === base || path.startsWith(`${base}/`);
}

export type AuthenticatedPageNavContext = {
  /** Current screen from sidebar (e.g. Overview, My Listings). */
  pageTitle: string;
  /** Product name (e.g. Marketplace, OWNERR OS). */
  workspaceLabel: string;
  /** Marketplace desk segment when applicable (Buyer / Seller). */
  deskLabel?: string;
};

function pickActiveSidebarItem(
  location: string,
  items: readonly SidebarNavItemDef[],
): SidebarNavItemDef | null {
  let best: SidebarNavItemDef | null = null;
  for (const item of items) {
    if (!isSidebarNavActive(location, item.href)) continue;
    if (
      !best ||
      normalizePathname(item.href).length > normalizePathname(best.href).length
    ) {
      best = item;
    }
  }
  return best;
}

function legacySettingsRedirectsToProfile(
  group: SidebarNavGroup,
  path: string,
): boolean {
  const legacy =
    group === "marketplace"
      ? MARKETPLACE_ROUTES.settings
      : group === "ownerr-os"
        ? PRODUCT_ROUTES.ownerrOsSettings
        : PRODUCT_ROUTES.ownerrNetworkSettings;
  const legacyPath = normalizePathname(legacy);
  return path === legacyPath || path.startsWith(`${legacyPath}/`);
}

/** Resolve mobile / header labels for authenticated product apps. */
export function resolveAuthenticatedPageNavContext(
  location: string,
  group: SidebarNavGroup,
  subject: AccessSubject,
): AuthenticatedPageNavContext {
  const path = normalizePathname(location.split("?")[0] ?? location);
  const workspaceLabel = getAuthenticatedWorkspaceLabel(group);

  if (legacySettingsRedirectsToProfile(group, path)) {
    return { pageTitle: "Profile", workspaceLabel };
  }

  if (
    group === "ownerr-network" &&
    path.includes("/ownerr-network/app/member/")
  ) {
    return { pageTitle: "Member profile", workspaceLabel };
  }

  let pageTitle = "Overview";
  let deskLabel: string | undefined;

  if (group === "marketplace") {
    let active: SidebarNavItemDef | null = null;
    for (const section of getMarketplaceSidebarSections(subject)) {
      const match = pickActiveSidebarItem(location, section.items);
      if (
        match &&
        (!active ||
          normalizePathname(match.href).length >
            normalizePathname(active.href).length)
      ) {
        active = match;
        deskLabel = section.title;
      }
    }
    if (active) pageTitle = active.label;
    if (!deskLabel && path.includes("/marketplace/app/seller"))
      deskLabel = "Seller";
    if (!deskLabel && path.includes("/marketplace/app/buyer"))
      deskLabel = "Buyer";
  } else if (group === "ownerr-os") {
    let active: SidebarNavItemDef | null = null;
    for (const section of getOwnerrOsSidebarSections(subject)) {
      const match = pickActiveSidebarItem(location, section.items);
      if (
        match &&
        (!active ||
          normalizePathname(match.href).length >
            normalizePathname(active.href).length)
      ) {
        active = match;
      }
    }
    if (active) pageTitle = active.label;
  } else {
    const active = pickActiveSidebarItem(
      location,
      getAuthenticatedSidebarNav(group, subject),
    );
    if (active) pageTitle = active.label;
  }

  return { pageTitle, workspaceLabel, deskLabel };
}

/** Filter sidebar entries using registry route RBAC (resolveRoleAccess per href). */
export function getAuthenticatedSidebarNav(
  group: SidebarNavGroup,
  subject: AccessSubject,
): SidebarNavItemDef[] {
  if (group === "marketplace") {
    return getMarketplaceSidebarSections(subject).flatMap(
      (section) => section.items,
    );
  }
  if (group === "ownerr-os") {
    return getOwnerrOsSidebarSections(subject).flatMap(
      (section) => section.items,
    );
  }
  return SIDEBAR_NAV_BY_GROUP[group].filter((item) =>
    isSidebarItemVisible(item, subject),
  );
}

export function getAuthenticatedWorkspaceLabel(
  workspace: AuthenticatedWorkspace,
): string {
  return (
    PRODUCT_SHELL_LABELS.find((p) => p.id === workspace)?.label ?? "Product"
  );
}

export function getSidebarNavGroupLabel(group: SidebarNavGroup): string {
  return getAuthenticatedWorkspaceLabel(group);
}
