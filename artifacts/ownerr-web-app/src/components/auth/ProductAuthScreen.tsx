import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import type { AppSlug } from "@workspace/api-zod";
import { MarketingLayout } from "@/components/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useActiveProduct } from "@/context/ActiveProductContext";
import { useToast } from "@/hooks/use-toast";
import { MARKETING_SHELL_CLASS } from "@/lib/marketingShell";
import {
  consumeIntendedRoute,
  persistProductIntent,
  readActiveProduct,
} from "@/lib/auth/productLock";
import { listActiveUserAppSlugs } from "@/lib/products/provision";
import {
  resolveAuthenticatedAppEntry,
  sanitizePostAuthRedirectParam,
} from "@/routing/authResolver";
import {
  productLandingPath,
  resolveProductAuthPath,
} from "@/lib/auth/productAuthRoutes";
import { DemoAccountsHint } from "@/components/auth/DemoAccountsHint";
import { isMarketplacePublicPortalPath } from "@/lib/auth/marketplacePortalAuth";
import { marketplacePortalAuthPath } from "@/lib/auth/marketplacePortalAuth";
import { syncMarketplaceDeskRoleForPath } from "@/lib/auth/syncMarketplaceDeskRole";
import { syncOwnerrFounderRole } from "@/lib/auth/syncOwnerrFounderRole";
import { PRODUCT_ROUTES } from "@/routing/routeRegistry";
export type ProductAuthMode = "signin" | "signup";

type Props = {
  appSlug: AppSlug;
  mode: ProductAuthMode;
};

function productKicker(slug: AppSlug): string {
  if (slug === "ownerr_network") return "OWNERR NETWORK";
  if (slug === "ownerr_os") return "OWNERR OS";
  return "MARKETPLACE";
}

export function ProductAuthScreen({ appSlug, mode: initialMode }: Props) {
  const {
    configured,
    loading,
    session,
    authUser,
    currentUser,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
  } = useAuth();
  const { setActiveProduct } = useActiveProduct();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [mode, setMode] = useState<ProductAuthMode>(initialMode);
  const [name, setName] = useState("");
  const [startupName, setStartupName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const isOwnerr = appSlug === "ownerr_os";

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    persistProductIntent(appSlug);
  }, [appSlug]);

  useEffect(() => {
    if (appSlug !== "ownerr_os") return;
    const qs = typeof window !== "undefined" ? window.location.search : "";
    navigate(`${PRODUCT_ROUTES.ownerrOsJoin}${qs}`, { replace: true });
  }, [appSlug, navigate]);

  useEffect(() => {
    if (loading || !session || !authUser?.id) return;
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : "",
    );
    const returnTo =
      consumeIntendedRoute() ??
      sanitizePostAuthRedirectParam(params.get("returnTo"));
    const stayOnPublicPortal =
      appSlug === "marketplace" && returnTo && isMarketplacePublicPortalPath(returnTo);
    if (!stayOnPublicPortal) {
      setActiveProduct(appSlug);
    }
    void (async () => {
      if (appSlug === "marketplace" && returnTo) {
        try {
          await syncMarketplaceDeskRoleForPath(returnTo);
        } catch {
          /* profile may still load; demo email fallback maps desk user */
        }
      }
      if (appSlug === "ownerr_os") {
        try {
          await syncOwnerrFounderRole();
        } catch {
          /* demo email fallback maps desk user */
        }
      }
      const slugs = await listActiveUserAppSlugs(authUser.id);
      const dest = resolveAuthenticatedAppEntry({
        slugs,
        activeProduct: stayOnPublicPortal ? null : readActiveProduct() ?? appSlug,
        currentUser,
        returnTo,
      });
      navigate(dest, { replace: true });
    })();
  }, [loading, session, authUser?.id, appSlug, setActiveProduct, navigate, currentUser]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) {
      toast({
        title: "Sign-in unavailable",
        description: "Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
        variant: "destructive",
      });
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail.includes("@")) {
      toast({ title: "Invalid email", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (mode === "signup" && name.trim().length < 2) {
      toast({ title: "Enter your name", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        await signUpWithEmail(
          trimmedEmail,
          password,
          name.trim(),
          undefined,
        );
        toast({
          title: "Check your email",
          description: "Confirm your email, then sign in to continue.",
        });
        return;
      }
      await signInWithEmail(trimmedEmail, password);
      if (isOwnerr) {
        await syncOwnerrFounderRole();
      }
      const params = new URLSearchParams(window.location.search);
      const returnTo = sanitizePostAuthRedirectParam(params.get("returnTo"));
      const stayOnPublicPortal =
        appSlug === "marketplace" && returnTo && isMarketplacePublicPortalPath(returnTo);
      if (!stayOnPublicPortal) {
        setActiveProduct(appSlug);
      }
    } catch (err) {
      toast({
        title: mode === "signup" ? "Registration failed" : "Sign-in failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    if (session) return;
    const callbackPath =
      appSlug === "marketplace" && typeof window !== "undefined" && window.location.pathname.startsWith("/marketplace/")
        ? marketplacePortalAuthPath("callback")
        : resolveProductAuthPath(appSlug, "callback");
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}${callbackPath}`;
    setBusy(true);
    try {
      await signInWithGoogle(redirectTo);
    } catch (err) {
      toast({
        title: "Google sign-in failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      setBusy(false);
    }
  }

  if (appSlug === "ownerr_os") {
    return null;
  }

  if (!configured) {
    return (
      <MarketingLayout>
        <p className="p-8 text-center text-sm text-muted-foreground">
          Configure Supabase env vars to enable auth.
        </p>
      </MarketingLayout>
    );
  }

  const landing = productLandingPath(appSlug);

  return (
    <MarketingLayout>
      <div className={`${MARKETING_SHELL_CLASS} landing-terminal-palette mx-auto max-w-md px-4 py-12 sm:py-16`}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="saas-glass-card rounded-[14px] border border-[color:var(--terminal-border)] p-6 sm:p-8"
        >
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--terminal-lime)]">
            {productKicker(appSlug)}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[color:var(--terminal-display)] sm:text-3xl">
            {mode === "signup" ? "Create account" : "Sign in"}
          </h1>
          <p className="mt-2 text-sm text-[color:var(--terminal-muted)]">
            {isOwnerr
              ? "Founders use OWNERR OS to list, share, and grow with referrals. Use your company work email."
              : "You will stay in this product after sign-in."}
          </p>

          <form className="mt-8 space-y-4" onSubmit={(e) => void onSubmit(e)} noValidate>
            {mode === "signup" ? (
              <div className="space-y-2">
                <Label htmlFor="auth-name">Your name</Label>
                <Input
                  id="auth-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-[color:var(--terminal-border)] bg-[color:var(--terminal-bg)]"
                  autoComplete="name"
                  required
                />
              </div>
            ) : null}

            {isOwnerr && mode === "signup" ? (
              <div className="space-y-2">
                <Label htmlFor="auth-startup">Startup name</Label>
                <Input
                  id="auth-startup"
                  value={startupName}
                  onChange={(e) => setStartupName(e.target.value)}
                  className="border-[color:var(--terminal-border)] bg-[color:var(--terminal-bg)]"
                  placeholder="Acme Labs"
                  required
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="auth-email">{isOwnerr ? "Work email (company domain)" : "Email"}</Label>
              <Input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-[color:var(--terminal-border)] bg-[color:var(--terminal-bg)]"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="auth-password">Password</Label>
                {mode === "signin" ? (
                  <Link
                    href={resolveProductAuthPath(appSlug, "forgot-password")}
                    className="text-xs font-semibold text-[color:var(--terminal-ochre)] hover:underline"
                  >
                    Forgot password?
                  </Link>
                ) : null}
              </div>
              <Input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-[color:var(--terminal-border)] bg-[color:var(--terminal-bg)]"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                minLength={6}
                required
              />
            </div>

            <Button type="submit" disabled={busy || loading} className="btn-platform-gradient w-full font-bold">
              {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <Button
            type="button"
            variant="outline"
            className="mt-3 w-full border-[color:var(--terminal-border)]"
            disabled={busy}
            onClick={() => void onGoogle()}
          >
            {busy ? "Opening Google…" : "Continue with Google"}
          </Button>

          {appSlug === "marketplace" && mode === "signin" ? <DemoAccountsHint /> : null}

          <p className="mt-6 text-center text-xs text-[color:var(--terminal-muted)]">
            {mode === "signup" ? (
              <>
                Already have an account?{" "}
                <Link href={resolveProductAuthPath(appSlug, "login")} className="font-bold text-[color:var(--terminal-ochre)]">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New here?{" "}
                <Link href={resolveProductAuthPath(appSlug, "register")} className="font-bold text-[color:var(--terminal-ochre)]">
                  Create account
                </Link>
              </>
            )}
          </p>

          <Link
            href={landing}
            className="mt-4 block text-center text-xs text-[color:var(--terminal-muted)] hover:text-[color:var(--terminal-fg)]"
          >
            Back to {productKicker(appSlug)}
          </Link>
        </motion.div>
      </div>
    </MarketingLayout>
  );
}
