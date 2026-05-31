import { useState } from "react";
import { Link } from "wouter";
import { MarketingLayout } from "@/components/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { normalizeAuthEmail, validateAuthEmail } from "@/lib/auth/validation";
import { AUTH_ROUTES } from "@/routing/routeRegistry";

export default function VerifyEmailPage() {
  const { configured, resendSignupVerification, formatAuthError } = useAuth();
  const { toast } = useToast();

  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const initialEmail = params.get("email") ?? "";

  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onResend(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) return;
    const check = validateAuthEmail(email);
    if (!check.ok) {
      toast({ title: check.message, variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await resendSignupVerification(normalizeAuthEmail(email));
      setSent(true);
      toast({
        title: "Verification email sent",
        description: "Check your inbox from Ownerr Intelligence.",
      });
    } catch (err) {
      toast({
        title: "Could not resend",
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
        <h1 className="text-2xl font-bold">Verify your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Confirm your email to access Ownerr. We send messages from Ownerr
          Intelligence at Intelligence@ownerr.live.
        </p>
        {sent ? (
          <p className="mt-6 text-sm text-muted-foreground">
            If an account exists for that address, a new confirmation link is on
            its way. Open the link, then sign in.
          </p>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={(e) => void onResend(e)}>
            <div className="space-y-2">
              <Label htmlFor="verify-email">Email</Label>
              <Input
                id="verify-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Sending…" : "Resend verification email"}
            </Button>
          </form>
        )}
        <Link
          href={AUTH_ROUTES.start}
          className="mt-6 inline-block text-sm font-bold text-primary"
        >
          Back to get started
        </Link>
      </div>
    </MarketingLayout>
  );
}
