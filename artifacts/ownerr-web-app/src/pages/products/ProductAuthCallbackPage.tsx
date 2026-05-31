import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { MarketingLayout } from "@/components/MarketingLayout";
import { useAuth } from "@/context/AuthContext";
import { useActiveProduct } from "@/context/ActiveProductContext";
import { isMarketplacePublicPortalPath } from "@/lib/auth/marketplacePortalAuth";
import {
  parseProductSlugFromAuthPath,
  resolveProductAuthPath,
} from "@/lib/auth/productAuthRoutes";
import {
  consumeIntendedRoute,
  isAppSlug,
  productDashboardPath,
} from "@/lib/auth/productLock";
import {
  resolvePlatformAdminPostAuthDestination,
  sanitizePostAuthRedirectParam,
} from "@/routing/authResolver";
import { shouldHoldPostAuthForPlatformAdmin } from "@/hooks/useRedirectPlatformAdminWhenReady";
import { logProductIssue } from "@/lib/observability/productErrors";
import {
  mergeOwnerrOsDraftAfterAuth,
  resolvePostOwnerrAuthPath,
} from "@/lib/auth/mergeOwnerrOsDraft";
import { PUBLIC_ROUTES } from "@/routing/routeRegistry";

export function ProductAuthCallbackPage() {
  const [location, navigate] = useLocation();
  const { loading, session, authUser, platformAdminReady, isPlatformAdmin } =
    useAuth();
  const { setActiveProduct } = useActiveProduct();
  const [error, setError] = useState<string | null>(null);

  const appSlug = parseProductSlugFromAuthPath(
    location.split("?")[0] ?? location,
  );

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
    if (!appSlug || !isAppSlug(appSlug)) {
      logProductIssue(
        "auth.callback",
        new Error("invalid product in callback path"),
      );
      navigate(PUBLIC_ROUTES.products, { replace: true });
      return;
    }
    if (!session) {
      setError("Sign-in did not complete. Try again from the product page.");
      return;
    }

    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : "",
    );
    const returnTo =
      consumeIntendedRoute() ??
      sanitizePostAuthRedirectParam(params.get("returnTo"));

    if (isPlatformAdmin) {
      navigate(resolvePlatformAdminPostAuthDestination(returnTo), {
        replace: true,
      });
      return;
    }

    if (appSlug === "marketplace") {
      if (returnTo && isMarketplacePublicPortalPath(returnTo)) {
        navigate(returnTo, { replace: true });
        return;
      }
    }
    void (async () => {
      const user = authUser ?? session.user;
      if (appSlug === "ownerr_os" && user) {
        try {
          const { record, merged } = await mergeOwnerrOsDraftAfterAuth(user);
          setActiveProduct("ownerr_os");
          const fallback = resolvePostOwnerrAuthPath(record, merged);
          navigate(returnTo && record ? returnTo : fallback, { replace: true });
        } catch (e) {
          logProductIssue("auth.callback", e);
          setActiveProduct("ownerr_os");
          navigate(productDashboardPath("ownerr_os"), { replace: true });
        }
        return;
      }
      setActiveProduct(appSlug);
      navigate(productDashboardPath(appSlug), { replace: true });
    })();
  }, [
    loading,
    session,
    authUser,
    appSlug,
    navigate,
    setActiveProduct,
    platformAdminReady,
    isPlatformAdmin,
  ]);

  if (!appSlug) return null;

  if (error) {
    return (
      <MarketingLayout>
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <a
            href={resolveProductAuthPath(appSlug, "login")}
            className="mt-4 inline-block text-sm font-bold text-primary"
          >
            Back to sign in
          </a>
        </div>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      <div className="flex min-h-[40vh] items-center justify-center text-sm font-bold text-muted-foreground">
        Completing sign-in…
      </div>
    </MarketingLayout>
  );
}
