import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useActiveProduct } from "@/context/ActiveProductContext";
import { isMarketplacePublicPortalPath } from "@/lib/auth/marketplacePortalAuth";
import {
  isProductAuthPath,
  parseProductSlugFromAuthPath,
} from "@/lib/auth/productAuthRoutes";
import { resolvePlatformAdminPostAuthDestination } from "@/routing/authResolver";
import { shouldHoldPostAuthForPlatformAdmin } from "@/hooks/useRedirectPlatformAdminWhenReady";
import { productDashboardPath } from "@/lib/auth/productLock";
import { resolveMembershipAppForPath } from "@/lib/platform/appMembership";
import {
  normalizePathname,
  isProductAppInternalPath,
} from "@/routing/routeResolver";
import { PRODUCT_ROUTES, PUBLIC_ROUTES } from "@/routing/routeRegistry";
import {
  applyDemoMarketplaceProductLock,
  demoMarketplaceHomeHref,
  isDemoMarketplaceLockedSession,
  isPathAllowedForDemoMarketplaceLock,
} from "@/lib/marketplace/demoSessionLock";
import {
  applyOwnerrOsProductLock,
  isOwnerrOsAppPath,
  isPathAllowedForOwnerrOsAppLock,
  ownerrOsAppHomeHref,
} from "@/lib/auth/ownerrOsAppLock";

/** Marketing / viral OWNERR OS pages — guests only; signed-in users stay in the app shell. */
function isOwnerrOsPublicBrowsePath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  if (
    path === PRODUCT_ROUTES.ownerrOsLanding ||
    path === PRODUCT_ROUTES.ownerrOsJoin
  )
    return true;
  if (path.startsWith("/share/founder/")) return true;
  if (path === PUBLIC_ROUTES.contact) return true;
  return false;
}

function shouldLockOwnerrOsShell(
  pathname: string,
  activeProduct: string | null,
): boolean {
  if (activeProduct === "ownerr_os") return true;
  return isOwnerrOsAppPath(pathname);
}

/** Keeps users inside the correct product app shell; does not block public website routes. */
export function ProductShellEnforcer() {
  const [location, navigate] = useLocation();
  const { loading, session, currentUser, platformAdminReady, isPlatformAdmin } =
    useAuth();
  const { activeProduct, setActiveProduct } = useActiveProduct();

  useEffect(() => {
    if (
      shouldHoldPostAuthForPlatformAdmin({
        loading,
        session,
        platformAdminReady,
      })
    ) {
      return;
    }
    if (!session) return;

    const pathname = normalizePathname(location.split("?")[0] ?? location);

    if (isPlatformAdmin) {
      if (pathname.startsWith("/admin")) return;
      if (
        isProductAuthPath(pathname) ||
        isProductAppInternalPath(pathname) ||
        pathname.startsWith("/marketplace/app")
      ) {
        const params = new URLSearchParams(location.split("?")[1] ?? "");
        const returnTo = params.get("returnTo");
        navigate(resolvePlatformAdminPostAuthDestination(returnTo), {
          replace: true,
        });
      }
      return;
    }

    if (isDemoMarketplaceLockedSession(session.user.email)) {
      applyDemoMarketplaceProductLock();
      setActiveProduct("marketplace");
      if (!isPathAllowedForDemoMarketplaceLock(pathname)) {
        navigate(demoMarketplaceHomeHref(currentUser?.role ?? null), {
          replace: true,
        });
      }
      return;
    }

    if (isProductAuthPath(pathname)) {
      const slug = parseProductSlugFromAuthPath(pathname);
      if (slug === "marketplace") {
        const params = new URLSearchParams(location.split("?")[1] ?? "");
        const returnTo = params.get("returnTo");
        if (returnTo && isMarketplacePublicPortalPath(returnTo)) {
          navigate(returnTo, { replace: true });
        } else {
          navigate(productDashboardPath("marketplace"), { replace: true });
        }
      } else if (slug) {
        navigate(productDashboardPath(slug), { replace: true });
      }
      return;
    }

    if (shouldLockOwnerrOsShell(pathname, activeProduct)) {
      applyOwnerrOsProductLock();
      setActiveProduct("ownerr_os");
      if (!isPathAllowedForOwnerrOsAppLock(pathname)) {
        navigate(ownerrOsAppHomeHref(), { replace: true });
      }
      return;
    }

    if (!isProductAppInternalPath(pathname)) return;

    if (isOwnerrOsPublicBrowsePath(pathname)) return;

    const routeApp = resolveMembershipAppForPath(pathname);
    if (!routeApp) return;

    if (!activeProduct) {
      setActiveProduct(routeApp);
      return;
    }

    if (activeProduct !== routeApp) {
      navigate(productDashboardPath(activeProduct), { replace: true });
    }
  }, [
    loading,
    session,
    currentUser?.role,
    activeProduct,
    location,
    navigate,
    setActiveProduct,
    platformAdminReady,
    isPlatformAdmin,
  ]);

  return null;
}
