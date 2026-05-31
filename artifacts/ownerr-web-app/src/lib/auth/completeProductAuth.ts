import type { AppSlug } from "@workspace/api-zod";
import type { User } from "@supabase/supabase-js";
import {
  consumeIntendedRoute,
  productDashboardPath,
  readActiveProduct,
} from "@/lib/auth/productLock";
import { isMarketplacePublicPortalPath } from "@/lib/auth/marketplacePortalAuth";
import {
  resolveAuthenticatedAppEntry,
  resolvePlatformAdminPostAuthDestination,
  sanitizePostAuthRedirectParam,
} from "@/routing/authResolver";
import {
  mergeOwnerrOsDraftAfterAuth,
  resolvePostOwnerrAuthPath,
} from "@/lib/auth/mergeOwnerrOsDraft";
import { syncOwnerrFounderRole } from "@/lib/auth/syncOwnerrFounderRole";
import { syncMarketplaceDeskRoleForPath } from "@/lib/auth/syncMarketplaceDeskRole";
import { listActiveUserAppSlugs } from "@/lib/products/provision";
import { mapDeskUserFromSupabase } from "@/lib/auth/mapDeskUser";

export type CompleteProductAuthInput = {
  appSlug: AppSlug;
  user: User;
  isPlatformAdmin: boolean;
  returnTo?: string | null;
  pathname?: string;
  setActiveProduct: (slug: AppSlug) => void;
};

export type CompleteProductAuthResult = {
  path: string;
};

/**
 * Resolves where to send the user after password/OAuth/magic-link session is established.
 */
export async function completeProductAuth(
  input: CompleteProductAuthInput,
): Promise<CompleteProductAuthResult> {
  const {
    appSlug,
    user,
    isPlatformAdmin,
    returnTo: returnToParam,
    pathname,
    setActiveProduct,
  } = input;

  const returnTo =
    returnToParam ??
    (typeof window !== "undefined"
      ? sanitizePostAuthRedirectParam(
          new URLSearchParams(window.location.search).get("returnTo"),
        )
      : null);

  if (isPlatformAdmin) {
    return {
      path: resolvePlatformAdminPostAuthDestination(returnTo),
    };
  }

  const intended = consumeIntendedRoute();
  const safeReturn = returnTo ?? intended;

  if (
    appSlug === "marketplace" &&
    safeReturn &&
    isMarketplacePublicPortalPath(safeReturn)
  ) {
    setActiveProduct("marketplace");
    return { path: safeReturn };
  }

  if (appSlug === "ownerr_os") {
    await syncOwnerrFounderRole();
    try {
      const { record, merged } = await mergeOwnerrOsDraftAfterAuth(user);
      setActiveProduct("ownerr_os");
      const fallback = resolvePostOwnerrAuthPath(record, merged);
      return { path: safeReturn && record ? safeReturn : fallback };
    } catch {
      setActiveProduct("ownerr_os");
      return { path: productDashboardPath("ownerr_os") };
    }
  }

  if (pathname) {
    await syncMarketplaceDeskRoleForPath(pathname);
  }

  const stayOnPublicPortal =
    appSlug === "marketplace" &&
    safeReturn &&
    isMarketplacePublicPortalPath(safeReturn);

  if (!stayOnPublicPortal) {
    setActiveProduct(appSlug);
  }

  const slugs = await listActiveUserAppSlugs(user.id);
  const currentUser = mapDeskUserFromSupabase(user);
  const path = resolveAuthenticatedAppEntry({
    slugs,
    activeProduct: stayOnPublicPortal ? null : (readActiveProduct() ?? appSlug),
    currentUser,
    returnTo: safeReturn,
    platformAdmin: false,
  });

  return { path };
}
