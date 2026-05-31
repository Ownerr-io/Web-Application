import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { MarketingLayout } from "@/components/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { PasswordRulesHint } from "@/components/auth/PasswordRulesHint";
import { getSupabase } from "@/lib/supabase/client";
import {
  validateAuthPassword,
  validatePasswordConfirmation,
} from "@/lib/auth/validation";
import { AUTH_ROUTES, PUBLIC_ROUTES } from "@/routing/routeRegistry";
import { sanitizePostAuthRedirectParam } from "@/routing/authResolver";
import { completeProductAuth } from "@/lib/auth/completeProductAuth";
import { useActiveProduct } from "@/context/ActiveProductContext";
import { resolveMembershipAppForPath } from "@/lib/platform/appMembership";
import type { AppSlug } from "@workspace/api-zod";

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const {
    configured,
    session,
    authUser,
    updatePassword,
    formatAuthError,
    isPlatformAdmin,
  } = useAuth();
  const { setActiveProduct } = useActiveProduct();
  const { toast } = useToast();

  const [ready, setReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!configured) return;
    const supabase = getSupabase();
    let cancelled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) {
        setReady(true);
        return;
      }
      setInvalidLink(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "PASSWORD_RECOVERY" && next) {
        setReady(true);
        setInvalidLink(false);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [configured]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pw = validateAuthPassword(password);
    if (!pw.ok) {
      toast({ title: pw.message, variant: "destructive" });
      return;
    }
    const match = validatePasswordConfirmation(password, confirm);
    if (!match.ok) {
      toast({ title: match.message, variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      setDone(true);
      toast({ title: "Password updated" });

      const returnTo = sanitizePostAuthRedirectParam(
        new URLSearchParams(window.location.search).get("returnTo"),
      );
      const user = authUser ?? session?.user;
      if (user) {
        const fromPath = returnTo
          ? resolveMembershipAppForPath(returnTo)
          : null;
        const appSlug: AppSlug = fromPath ?? "marketplace";
        const { path } = await completeProductAuth({
          appSlug,
          user,
          isPlatformAdmin,
          returnTo,
          setActiveProduct,
        });
        window.setTimeout(() => navigate(path, { replace: true }), 800);
      } else {
        window.setTimeout(
          () => navigate(returnTo ?? PUBLIC_ROUTES.products, { replace: true }),
          800,
        );
      }
    } catch (err) {
      toast({
        title: "Could not update password",
        description: formatAuthError(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <MarketingLayout>
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-bold">Choose a new password</h1>
        {invalidLink && !ready ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-destructive">
              This reset link is invalid or has expired. Request a new one from
              the sign-in page.
            </p>
            <Link href={AUTH_ROUTES.start}>
              <Button variant="outline">Back to sign in</Button>
            </Link>
          </div>
        ) : done ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Your password was updated. Redirecting…
          </p>
        ) : !ready ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={(e) => void onSubmit(e)}>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <PasswordRulesHint password={password} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Saving…" : "Update password"}
            </Button>
          </form>
        )}
      </div>
    </MarketingLayout>
  );
}
