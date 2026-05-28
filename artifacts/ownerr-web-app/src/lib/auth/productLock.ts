import type { AppSlug } from "@workspace/api-zod";
import { MARKETPLACE_ROUTES, PRODUCT_ROUTES } from "@/routing/routeRegistry";
import { normalizePathname } from "@/routing/routeResolver";

const ACTIVE_PRODUCT_KEY = "ownerr.active_product";
const PRODUCT_INTENT_KEY = "ownerr.auth.product_intent";
const INTENDED_ROUTE_KEY = "ownerr.auth.intended_route";
const INTENT_MAX_AGE_MS = 30 * 60 * 1000;

export function isAppSlug(value: string | null | undefined): value is AppSlug {
  return (
    value === "ownerr_os" ||
    value === "marketplace" ||
    value === "ownerr_network"
  );
}

/** Canonical dashboard per product (post-login destination). */
export function productDashboardPath(slug: AppSlug): string {
  if (slug === "ownerr_os") return PRODUCT_ROUTES.ownerrOsDashboard;
  if (slug === "marketplace") return MARKETPLACE_ROUTES.app;
  return PRODUCT_ROUTES.ownerrNetworkDashboard;
}

export function productOnboardingPath(slug: AppSlug): string | null {
  if (slug === "ownerr_network") return PRODUCT_ROUTES.ownerrNetworkOnboarding;
  return null;
}

/** Marketing entry paths → product slug. */
export function captureProductIntentFromPath(pathname: string): AppSlug | null {
  const path = normalizePathname(pathname);
  if (
    path === PRODUCT_ROUTES.ownerrOsLanding ||
    path.startsWith("/products/ownerr-os")
  ) {
    return "ownerr_os";
  }
  if (
    path === PRODUCT_ROUTES.ownerrNetworkLanding ||
    path.startsWith("/products/ownerr-network")
  ) {
    return "ownerr_network";
  }
  if (path === "/products/marketplace" || path.startsWith("/marketplace")) {
    return "marketplace";
  }
  if (path.startsWith("/ownerr-os")) return "ownerr_os";
  if (path.startsWith("/ownerr-network")) return "ownerr_network";
  return null;
}

type StoredIntent = { slug: AppSlug; createdAt: number };

export function persistProductIntent(slug: AppSlug): void {
  if (typeof window === "undefined") return;
  const payload: StoredIntent = { slug, createdAt: Date.now() };
  try {
    sessionStorage.setItem(PRODUCT_INTENT_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function peekProductIntent(): AppSlug | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PRODUCT_INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredIntent;
    if (!parsed?.slug || !isAppSlug(parsed.slug)) return null;
    if (Date.now() - parsed.createdAt > INTENT_MAX_AGE_MS) {
      sessionStorage.removeItem(PRODUCT_INTENT_KEY);
      return null;
    }
    return parsed.slug;
  } catch {
    return null;
  }
}

export function consumeProductIntent(): AppSlug | null {
  const slug = peekProductIntent();
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(PRODUCT_INTENT_KEY);
    } catch {
      /* ignore */
    }
  }
  return slug;
}

export function persistActiveProduct(slug: AppSlug): void {
  if (!isAppSlug(slug)) return;
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(ACTIVE_PRODUCT_KEY, slug);
  } catch {
    /* ignore */
  }
}

export function readActiveProduct(): AppSlug | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ACTIVE_PRODUCT_KEY);
    return isAppSlug(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function clearActiveProduct(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(ACTIVE_PRODUCT_KEY);
    sessionStorage.removeItem(PRODUCT_INTENT_KEY);
    sessionStorage.removeItem(INTENDED_ROUTE_KEY);
  } catch {
    /* ignore */
  }
}

export function saveIntendedRoute(pathname: string): void {
  if (typeof window === "undefined") return;
  const path = normalizePathname(pathname);
  if (!path.startsWith("/") || path.startsWith("//")) return;
  try {
    sessionStorage.setItem(INTENDED_ROUTE_KEY, path);
  } catch {
    /* ignore */
  }
}

export function peekIntendedRoute(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(INTENDED_ROUTE_KEY);
    if (!raw?.startsWith("/") || raw.startsWith("//")) return null;
    return normalizePathname(raw);
  } catch {
    return null;
  }
}

export function consumeIntendedRoute(): string | null {
  const path = peekIntendedRoute();
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(INTENDED_ROUTE_KEY);
    } catch {
      /* ignore */
    }
  }
  return path;
}

export function parseProductIntentQuery(search: string): AppSlug | null {
  const raw = new URLSearchParams(search).get("app")?.trim() ?? null;
  return isAppSlug(raw) ? raw : null;
}

export function parseAppSlugParam(raw: string | null): AppSlug | null {
  const trimmed = raw?.trim() ?? null;
  return isAppSlug(trimmed) ? trimmed : null;
}

/** Routes that must not hold a signed-in user with an active product lock. */
export const PUBLIC_AUTH_ESCAPE_PATHS = ["/", "/products"] as const;

export function isPublicAuthEscapePath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  return (PUBLIC_AUTH_ESCAPE_PATHS as readonly string[]).some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
}

export function isAuthCallbackPath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  return path.endsWith("/callback") && path.startsWith("/products/");
}

export function appSlugToAuthProduct(
  slug: AppSlug,
): "ownerr-os" | "ownerr-network" | null {
  if (slug === "ownerr_os") return "ownerr-os";
  if (slug === "ownerr_network") return "ownerr-network";
  return null;
}
