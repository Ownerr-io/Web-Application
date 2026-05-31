import { useEffect, useState } from "react";
import { Link } from "wouter";
import { MarketingLayout } from "@/components/MarketingLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { waitForEmailConfirmationSession } from "@/lib/auth/waitForEmailConfirmation";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { AUTH_ROUTES } from "@/routing/routeRegistry";

type Status = "loading" | "success" | "failure";

export default function AuthConfirmPage() {
  const { loading, session, authUser } = useAuth();
  const [status, setStatus] = useState<Status>("loading");
  const [confirmedEmail, setConfirmedEmail] = useState<string | undefined>();

  useEffect(() => {
    if (loading) return;
    if (!isSupabaseConfigured()) {
      setStatus("failure");
      return;
    }

    if (session?.user?.email_confirmed_at) {
      setConfirmedEmail(session.user.email ?? undefined);
      setStatus("success");
      return;
    }

    let cancelled = false;
    void waitForEmailConfirmationSession().then((result) => {
      if (cancelled) return;
      if (result.confirmed) {
        setConfirmedEmail(result.email ?? authUser?.email ?? undefined);
        setStatus("success");
        return;
      }
      if (session?.user && !session.user.email_confirmed_at) {
        setStatus("failure");
        return;
      }
      setStatus("failure");
    });

    return () => {
      cancelled = true;
    };
  }, [loading, session, authUser?.email]);

  const resendEmail =
    confirmedEmail ?? authUser?.email ?? session?.user?.email ?? "";

  return (
    <MarketingLayout>
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        {status === "loading" ? (
          <p className="text-sm text-muted-foreground">
            Confirming your email…
          </p>
        ) : null}
        {status === "success" ? (
          <>
            <h1 className="text-2xl font-bold">Email verified</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You are all set. Sign in to continue building on Ownerr.
            </p>
            <Link href={AUTH_ROUTES.start}>
              <Button className="mt-6">Continue</Button>
            </Link>
          </>
        ) : null}
        {status === "failure" ? (
          <>
            <h1 className="text-2xl font-bold">Verification issue</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This link may have expired or already been used. Request a new
              verification email.
            </p>
            <Link
              href={`${AUTH_ROUTES.verifyEmail}${resendEmail ? `?email=${encodeURIComponent(resendEmail)}` : ""}`}
            >
              <Button className="mt-6" variant="outline">
                Resend verification
              </Button>
            </Link>
          </>
        ) : null}
      </div>
    </MarketingLayout>
  );
}
