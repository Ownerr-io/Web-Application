import { useEffect, useState } from "react";
import { Link } from "wouter";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { loadFounderSubmissionForUser } from "@/lib/founderService";
import type { FounderSubmissionRecord } from "@/lib/founderTypes";
import { founderAvatarUrl } from "@/lib/utils";
import { PRODUCT_ROUTES, PUBLIC_ROUTES } from "@/routing/routeRegistry";
import { AccountChangePasswordSection } from "@/components/auth/AccountChangePasswordSection";

export default function OwnerrOsAppProfilePage() {
  const { session, currentUser, logout } = useAuth();
  const [founder, setFounder] = useState<FounderSubmissionRecord | null>(null);
  const email = currentUser?.email ?? session?.user.email ?? "";
  const displayName = currentUser?.name ?? email.split("@")[0] ?? "Founder";
  const avatarSrc = founderAvatarUrl(
    currentUser?.avatarSeed ?? currentUser?.id ?? session?.user.id ?? "user",
  );

  useEffect(() => {
    const uid = session?.user.id;
    if (!uid) return;
    void loadFounderSubmissionForUser(uid).then(setFounder);
  }, [session?.user.id]);

  return (
    <div className="w-full max-w-none min-w-0 space-y-6 sm:space-y-8">
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--terminal-lime)]">
          Profile
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[color:var(--terminal-display)]">
          {displayName}
        </h1>
        <p className="text-sm text-[color:var(--terminal-muted)]">
          OWNERR OS account and founder listing
        </p>
      </header>

      <section className="flex flex-col gap-4 rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-5 sm:flex-row sm:items-center">
        <img
          src={avatarSrc}
          alt=""
          className="h-16 w-16 shrink-0 rounded-full border border-[color:var(--terminal-border)] object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-[color:var(--terminal-display)]">
            {displayName}
          </p>
          {email ? (
            <p className="text-sm text-[color:var(--terminal-muted)]">
              {email}
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-5 space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[color:var(--terminal-muted)]">
          Founder listing
        </h2>
        {founder ? (
          <>
            <p className="text-lg font-bold text-[color:var(--terminal-display)]">
              {founder.startupName}
            </p>
            <p className="text-sm text-[color:var(--terminal-muted)]">
              {founder.tagline}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="font-bold"
                asChild
              >
                <Link href={PRODUCT_ROUTES.ownerrOsDashboard}>
                  Open dashboard
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="font-bold"
                asChild
              >
                <Link href={PRODUCT_ROUTES.ownerrOsAnalytics}>
                  View analytics
                </Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-[color:var(--terminal-muted)]">
              No startup listing linked to this account yet.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-2 font-bold"
              asChild
            >
              <Link href={PRODUCT_ROUTES.ownerrOsListings}>Create listing</Link>
            </Button>
          </>
        )}
      </section>

      <AccountChangePasswordSection variant="terminal" />

      <section className="rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-5 space-y-4">
        <p className="text-sm text-[color:var(--terminal-muted)]">
          To use another OWNERR product, log out and open it from{" "}
          <Link
            href={PUBLIC_ROUTES.products}
            className="font-bold text-[color:var(--terminal-ochre)] hover:underline"
          >
            Products
          </Link>
          .
        </p>
        <Button
          type="button"
          variant="destructive"
          className="font-bold"
          onClick={() => void logout()}
        >
          <LogOut className="mr-2 h-4 w-4" aria-hidden />
          Log out
        </Button>
      </section>
    </div>
  );
}
