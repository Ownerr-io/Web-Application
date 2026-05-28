import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { AppSlug } from "@workspace/api-zod";
import { MarketingLayout } from "@/components/MarketingLayout";
import { useAuth } from "@/context/AuthContext";
import { useActiveProduct } from "@/context/ActiveProductContext";
import { marketplacePortalLoginHref } from "@/lib/auth/marketplacePortalAuth";
import {
  consumeGetStartedProduct,
  consumeMarketplaceRole,
  persistGetStartedProduct,
  persistMarketplaceRole,
} from "@/lib/auth/getStartedIntent";
import {
  persistProductIntent,
  productDashboardPath,
} from "@/lib/auth/productLock";
import { resolveProductAuthPath } from "@/lib/auth/productAuthRoutes";
import type { AuthRole } from "@/lib/auth/types";
import { showDemoAccountHints } from "@/lib/demo/demoAccountCatalog";
import {
  ensureBuyerProfile,
  ensureSellerProfile,
} from "@/lib/marketplace/profiles";
import { getSupabase } from "@/lib/supabase/client";
import { fetchCurrentOwnerrNetworkUser } from "@/lib/ownerr-network/api";
import {
  listActiveUserAppSlugs,
  provisionOwnerrProduct,
} from "@/lib/products/provision";
import { loadFounderSubmissionsForUser } from "@/lib/founderService";
import { PRODUCT_ITEMS } from "@/routes/publicNavConfig";
import { marketplaceWorkspaceForRole } from "@/routing/navigationRegistry";
import { AUTH_ROUTES, PRODUCT_ROUTES } from "@/routing/routeRegistry";
import { sanitizePostAuthRedirectParam } from "@/routing/authResolver";

type Step = "product" | "marketplace-role";

function productIdToSlug(id: string): AppSlug | null {
  if (id === "ownerr-os") return "ownerr_os";
  if (id === "marketplace") return "marketplace";
  if (id === "ownerr-network") return "ownerr_network";
  return null;
}

function slugToProductId(slug: AppSlug): string {
  if (slug === "ownerr_os") return "ownerr-os";
  if (slug === "marketplace") return "marketplace";
  return "ownerr-network";
}

async function setAuthDeskRole(role: AuthRole): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.updateUser({ data: { role } });
  if (error) throw error;
}

export function GetStartedFlow() {
  const { loading, session, authUser } = useAuth();
  const { setActiveProduct } = useActiveProduct();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("product");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const returnTo = sanitizePostAuthRedirectParam(params.get("returnTo"));
  const productParam = params.get("product");

  const enterMarketplace = useCallback(
    async (role: AuthRole) => {
      if (!authUser) return;
      setBusy(true);
      setError(null);
      try {
        await setAuthDeskRole(role);
        if (role === "buyer") {
          await ensureBuyerProfile(authUser);
        } else {
          await ensureSellerProfile(authUser);
        }
        persistProductIntent("marketplace");
        setActiveProduct("marketplace");
        navigate(marketplaceWorkspaceForRole(role), { replace: true });
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Could not open marketplace desk",
        );
      } finally {
        setBusy(false);
      }
    },
    [authUser, navigate, setActiveProduct],
  );

  const enterOwnerrOs = useCallback(async () => {
    if (!authUser?.id) return;
    setBusy(true);
    setError(null);
    try {
      const slugs = await listActiveUserAppSlugs(authUser.id);
      persistProductIntent("ownerr_os");
      setActiveProduct("ownerr_os");
      if (slugs.includes("ownerr_os")) {
        navigate(productDashboardPath("ownerr_os"), { replace: true });
        return;
      }
      // Check if they already have founder submissions (form filled)
      const existing = await loadFounderSubmissionsForUser(authUser.id);
      if (existing && existing.length > 0) {
        if (session?.user) {
          await provisionOwnerrProduct(session.user);
        }
        navigate(productDashboardPath("ownerr_os"), { replace: true });
        return;
      }
      navigate(PRODUCT_ROUTES.ownerrOsJoin, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open OWNERR OS");
    } finally {
      setBusy(false);
    }
  }, [authUser?.id, session, navigate, setActiveProduct]);

  const enterOwnerrNetwork = useCallback(async () => {
    if (!authUser?.id) return;
    setBusy(true);
    setError(null);
    try {
      const profile = await fetchCurrentOwnerrNetworkUser();
      persistProductIntent("ownerr_network");
      setActiveProduct("ownerr_network");
      if (profile) {
        navigate(PRODUCT_ROUTES.ownerrNetworkDashboard, { replace: true });
        return;
      }
      navigate(PRODUCT_ROUTES.ownerrNetworkOnboarding, { replace: true });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not open Ownerr Network",
      );
    } finally {
      setBusy(false);
    }
  }, [authUser?.id, navigate, setActiveProduct]);

  useEffect(() => {
    if (loading) return;
    const pendingRole = consumeMarketplaceRole();
    const pendingProduct = consumeGetStartedProduct();
    if (session && pendingRole) {
      void enterMarketplace(pendingRole);
      return;
    }
    if (!session) return;
    if (productParam === "marketplace" || pendingProduct === "marketplace") {
      setStep("marketplace-role");
      return;
    }
    if (productParam === "ownerr-os" || pendingProduct === "ownerr_os") {
      void enterOwnerrOs();
      return;
    }
    if (
      productParam === "ownerr-network" ||
      pendingProduct === "ownerr_network"
    ) {
      void enterOwnerrNetwork();
    }
  }, [
    loading,
    session,
    productParam,
    enterMarketplace,
    enterOwnerrOs,
    enterOwnerrNetwork,
  ]);

  function goToSignIn(slug: AppSlug, extra?: { marketplaceRole?: AuthRole }) {
    persistProductIntent(slug);
    persistGetStartedProduct(slug);
    if (extra?.marketplaceRole) persistMarketplaceRole(extra.marketplaceRole);
    if (slug === "ownerr_os") {
      navigate(`${PRODUCT_ROUTES.ownerrOsJoin}?mode=signin`, { replace: true });
      return;
    }
    const returnPath = `${AUTH_ROUTES.start}?product=${slugToProductId(slug)}`;
    const dest = returnTo ?? returnPath;
    const login =
      slug === "marketplace"
        ? marketplacePortalLoginHref(dest)
        : resolveProductAuthPath(slug, "login");
    navigate(`${login}?returnTo=${encodeURIComponent(dest)}`);
  }

  function onSelectProduct(productId: string) {
    const slug = productIdToSlug(productId);
    if (!slug) return;
    setError(null);
    if (slug === "marketplace") {
      setStep("marketplace-role");
      return;
    }
    if (!session) {
      goToSignIn(slug);
      return;
    }
    if (slug === "ownerr_os") void enterOwnerrOs();
    else if (slug === "ownerr_network") void enterOwnerrNetwork();
  }

  function onSelectMarketplaceRole(role: AuthRole) {
    if (!session) {
      goToSignIn("marketplace", { marketplaceRole: role });
      return;
    }
    void enterMarketplace(role);
  }

  if (loading) {
    return (
      <MarketingLayout hideProductContext>
        <div className="flex min-h-[50vh] items-center justify-center text-sm font-bold text-muted-foreground">
          Loading…
        </div>
      </MarketingLayout>
    );
  }

  if (step === "marketplace-role") {
    return (
      <MarketingLayout hideProductContext>
        <div className="saas-section-shell py-16 md:py-24">
          <button
            type="button"
            onClick={() => setStep("product")}
            className="mb-6 inline-flex items-center gap-1 text-xs font-bold text-[color:var(--terminal-muted)] hover:text-[color:var(--terminal-fg)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            All products
          </button>
          <p className="luxury-kicker">Marketplace</p>
          <h1 className="marketing-hero-title mt-2">
            How are you using the desk?
          </h1>
          <p className="marketing-lead mt-3 max-w-xl">
            {showDemoAccountHints()
              ? "Sign in with a seeded demo account from the database (see login page), then pick your desk."
              : "Choose buyer to browse and bid, or seller/founder to list and manage deals."}
          </p>
          {error ? (
            <p className="mt-4 text-sm font-semibold text-destructive">
              {error}
            </p>
          ) : null}
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onSelectMarketplaceRole("buyer")}
              className="saas-glass-card saas-glass-card-hover rounded-[14px] border border-[color:var(--terminal-border)]/80 p-6 text-left"
            >
              <h2 className="text-lg font-bold">Buyer</h2>
              <p className="marketing-body-sm mt-2">
                Browse listings, place bids, and track interests.
              </p>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onSelectMarketplaceRole("founder")}
              className="saas-glass-card saas-glass-card-hover rounded-[14px] border border-[color:var(--terminal-border)]/80 p-6 text-left"
            >
              <h2 className="text-lg font-bold">Seller / founder</h2>
              <p className="marketing-body-sm mt-2">
                Manage listings, inbox, and verification.
              </p>
            </button>
          </div>
        </div>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout hideProductContext>
      <div className="saas-section-shell py-16 md:py-24">
        <p className="luxury-kicker">Get started</p>
        <h1 className="marketing-hero-title mt-2">Choose your product</h1>
        <p className="marketing-lead mt-3 max-w-xl">
          Pick where you want to work. Marketplace buyers and founders get
          separate desks; other products open in their own app.
        </p>
        {error ? (
          <p className="mt-4 text-sm font-semibold text-destructive">{error}</p>
        ) : null}
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {PRODUCT_ITEMS.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => onSelectProduct(product.id)}
                className="saas-glass-card saas-glass-card-hover flex h-full w-full flex-col rounded-[14px] border border-[color:var(--terminal-border)]/80 p-6 text-left"
              >
                <h2 className="text-lg font-bold text-[color:var(--terminal-fg)]">
                  {product.label}
                </h2>
                <p className="marketing-body-sm mt-2 flex-1">
                  {product.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-lime">
                  Continue
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
              </button>
            </li>
          ))}
        </ul>
        {!session ? (
          <p className="marketing-body-sm mt-8">
            Already have an account?{" "}
            <Link
              href={marketplacePortalLoginHref(AUTH_ROUTES.start)}
              className="font-bold text-brand-lime underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        ) : null}
      </div>
    </MarketingLayout>
  );
}
