import type { ReactNode } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { PUBLIC_ROUTES } from "@/routing/routeRegistry";
import type { AuthenticatedWorkspace } from "@/routing/routeRegistry";
import { OWNERR_OS_APP_CONTENT_CLASS } from "@/lib/ownerrOsAppLayout";

type Props = {
  product: AuthenticatedWorkspace;
  title: string;
  children?: ReactNode;
  /** Marketplace settings uses a wider layout. */
  wide?: boolean;
};

export function ProductSettingsShell({
  product,
  title,
  children,
  wide,
}: Props) {
  const { session, authUser, currentUser, logout } = useAuth();
  const email = currentUser?.email ?? session?.user.email ?? "";
  const displayName =
    currentUser?.name ??
    authUser?.user_metadata?.full_name?.toString() ??
    email.split("@")[0] ??
    "User";

  const shellClass =
    product === "ownerr-os" || product === "ownerr-network"
      ? OWNERR_OS_APP_CONTENT_CLASS
      : wide
        ? "mx-auto max-w-3xl space-y-6 pb-8"
        : "mx-auto max-w-lg space-y-8";

  return (
    <div className={shellClass}>
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Identity and preferences for this product only.
        </p>
      </div>

      {!wide ? (
        <>
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Signed in as
            </h2>
            <p className="mt-2 text-lg font-bold">{displayName}</p>
            {email ? (
              <p className="text-sm text-muted-foreground">{email}</p>
            ) : null}
          </section>
          {children}
          <section className="space-y-3">
            <p className="text-sm text-muted-foreground">
              To use another OWNERR product, log out and open it from{" "}
              <Link
                href={PUBLIC_ROUTES.products}
                className="font-semibold text-primary hover:underline"
              >
                Products
              </Link>
              .
            </p>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void logout()}
            >
              Log out
            </Button>
          </section>
        </>
      ) : (
        children
      )}
    </div>
  );
}
