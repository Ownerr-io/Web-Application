import { useState } from "react";
import { Link } from "wouter";
import type { AppSlug } from "@workspace/api-zod";
import { MarketingLayout } from "@/components/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  productLandingPath,
  resolveProductAuthPath,
} from "@/lib/auth/productAuthRoutes";
import { authAbsoluteUrl } from "@/lib/auth/routes";
import { validateAuthEmail, normalizeAuthEmail } from "@/lib/auth/validation";
import { sanitizePostAuthRedirectParam } from "@/routing/authResolver";

type Props = { appSlug: AppSlug };

export function ProductForgotPasswordPage({ appSlug }: Props) {
  const { configured, resetPasswordForEmail, formatAuthError } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) return;
    const trimmed = normalizeAuthEmail(email);
    const check = validateAuthEmail(trimmed);
    if (!check.ok) {
      toast({ title: check.message, variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const returnTo = sanitizePostAuthRedirectParam(
        new URLSearchParams(window.location.search).get("returnTo"),
      );
      const qs = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
      await resetPasswordForEmail(
        trimmed,
        authAbsoluteUrl(`/auth/reset-password${qs}`),
      );
      setSent(true);
      toast({
        title: "Check your email",
        description: "Password reset link sent.",
      });
    } catch (err) {
      toast({
        title: "Could not send reset email",
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
        <h1 className="text-2xl font-bold">Reset password</h1>
        {sent ? (
          <p className="mt-4 text-sm text-muted-foreground">
            If an account exists for that email, you will receive a reset link.
          </p>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={(e) => void onSubmit(e)}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}
        <Link
          href={resolveProductAuthPath(appSlug, "login")}
          className="mt-6 inline-block text-sm font-bold text-primary"
        >
          Back to sign in
        </Link>
        <Link
          href={productLandingPath(appSlug)}
          className="mt-2 block text-xs text-muted-foreground"
        >
          Back to product
        </Link>
      </div>
    </MarketingLayout>
  );
}
