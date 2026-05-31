import type { ReactNode } from "react";
import { Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useMarketplace } from "@/context/marketplace/MarketplaceProvider";
import { MarketplaceAppPageShell } from "@/components/marketplace/MarketplaceAppPageShell";
import { marketplaceDeskCardClass } from "@/components/marketplace/MarketplaceDeskUi";
import { marketplaceAppRoutes } from "@/routes/appRoutes";
import { MARKETPLACE_ROUTES, PRODUCT_ROUTES } from "@/routing/routeRegistry";
import { marketplaceWorkspaceForRole } from "@/routing/navigationRegistry";
import type { AuthRole } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

/**
 * Authenticated hub at `/marketplace/app`.
 */
export default function DashboardHubPage() {
  const { currentUser } = useAuth();
  const { profile: marketplaceProfile, loading, error } = useMarketplace();

  const deskRole =
    (marketplaceProfile?.desk_role as AuthRole | null | undefined) ??
    currentUser?.role ??
    null;

  return (
    <MarketplaceAppPageShell
      kicker="Marketplace"
      title="Desk overview"
      description="Profile and shortcuts for your marketplace desk (loaded from your database record)."
    >
      {loading ? (
        <p className="text-xs text-muted-foreground">
          Refreshing desk profile…
        </p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {deskRole ? (
        <p className="text-sm font-medium">
          Active desk:{" "}
          <span className="capitalize text-brand-lime">{deskRole}</span>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          No desk role on file yet. Use buyer or founder flows to create your
          marketplace profile.
        </p>
      )}

      {deskRole === "buyer" ? (
        <DeskShortcutPanel title="Buyer">
          <DeskLink href={marketplaceAppRoutes.buyerBids}>My bids</DeskLink>
          <DeskLink href={marketplaceAppRoutes.buyerInterests}>
            Saved startups
          </DeskLink>
          <DeskLink href={marketplaceAppRoutes.buyerAcquire}>
            Browse startups
          </DeskLink>
        </DeskShortcutPanel>
      ) : null}

      {deskRole === "founder" ? (
        <DeskShortcutPanel title="Seller">
          <DeskLink href={marketplaceAppRoutes.founderListings}>
            My listings
          </DeskLink>
          <DeskLink href={marketplaceAppRoutes.founderInbox}>Inbox</DeskLink>
          <DeskLink href={marketplaceAppRoutes.founderVerification}>
            Verification
          </DeskLink>
        </DeskShortcutPanel>
      ) : null}

      {deskRole ? <ButtonRow deskRole={deskRole} /> : null}

      <p className="text-center text-xs text-muted-foreground">
        <Link
          href={MARKETPLACE_ROUTES.sellerProfile}
          className="font-bold text-brand-orange hover:text-brand-lime"
        >
          Marketplace profile
        </Link>
      </p>
    </MarketplaceAppPageShell>
  );
}

function DeskShortcutPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={cn(marketplaceDeskCardClass, "space-y-3 rounded-xl p-5")}>
      <h2 className="brand-eyebrow text-xs font-bold">{title}</h2>
      <ul className="flex flex-col gap-2 text-sm font-medium">{children}</ul>
    </div>
  );
}

function DeskLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <Link
        className="font-bold text-brand-orange underline-offset-4 hover:text-brand-lime hover:underline"
        href={href}
      >
        {children}
      </Link>
    </li>
  );
}

function ButtonRow({ deskRole }: { deskRole: AuthRole }) {
  const deskHref = marketplaceWorkspaceForRole(deskRole);
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={deskHref}
        className="btn-platform-gradient inline-flex h-9 items-center rounded-[10px] px-4 text-sm font-bold"
      >
        Open {deskRole} workspace
      </Link>
      <Link
        href={PRODUCT_ROUTES.ownerrOsProfile}
        className="text-sm font-bold text-muted-foreground hover:text-brand-lime"
      >
        OWNERR OS profile
      </Link>
    </div>
  );
}
