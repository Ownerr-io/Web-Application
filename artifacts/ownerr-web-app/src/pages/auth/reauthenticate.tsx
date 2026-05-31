import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { MarketingLayout } from "@/components/MarketingLayout";
import { ReauthOtpPanel } from "@/components/auth/ReauthOtpPanel";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AUTH_ROUTES, PUBLIC_ROUTES } from "@/routing/routeRegistry";
import { sanitizePostAuthRedirectParam } from "@/routing/authResolver";

/** Standalone reauthentication (OTP) — use ?returnTo= after sensitive actions. */
export default function ReauthenticatePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { loading, session, requestLogin, confirmReauthenticationNonce } =
    useAuth();

  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const returnTo =
    sanitizePostAuthRedirectParam(params.get("returnTo")) ??
    PUBLIC_ROUTES.products;

  useEffect(() => {
    if (loading) return;
    if (!session) {
      requestLogin();
    }
  }, [loading, session, requestLogin]);

  if (loading || !session) {
    return (
      <MarketingLayout>
        <p className="p-8 text-center text-sm text-muted-foreground">
          Loading…
        </p>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <h1 className="text-xl font-bold">Verify your identity</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Use the verification code from Ownerr Intelligence to continue.
          </p>
          <div className="mt-6">
            <ReauthOtpPanel
              onVerified={async (nonce) => {
                await confirmReauthenticationNonce(nonce);
                toast({ title: "Identity verified" });
                navigate(returnTo, { replace: true });
              }}
              onCancel={() => navigate(returnTo, { replace: true })}
            />
          </div>
          <Link
            href={AUTH_ROUTES.start}
            className="mt-6 block text-center text-xs text-muted-foreground hover:text-foreground"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </MarketingLayout>
  );
}
