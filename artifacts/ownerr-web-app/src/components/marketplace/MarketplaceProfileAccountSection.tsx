import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { founderAvatarUrl } from "@/lib/utils";
import { syncMarketplaceDeskRoleForPath } from "@/lib/auth/syncMarketplaceDeskRole";
import type { AuthRole } from "@/lib/auth/types";
import { marketplaceWorkspaceForRole } from "@/routing/navigationRegistry";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";
import { cn } from "@/lib/utils";
import { marketplaceDeskCardClass } from "@/components/marketplace/MarketplaceDeskUi";

type DeskView = "buyer" | "seller";

function activeDeskFromPath(path: string, fallback: AuthRole | null): DeskView {
  if (path.includes("/marketplace/app/seller")) return "seller";
  if (path.includes("/marketplace/app/buyer")) return "buyer";
  return fallback === "buyer" ? "buyer" : "seller";
}

const BUYER_LINKS = [
  { href: MARKETPLACE_ROUTES.buyerDashboard, label: "Overview" },
  { href: MARKETPLACE_ROUTES.buyerBrowse, label: "Browse" },
  { href: MARKETPLACE_ROUTES.buyerBids, label: "Bids" },
  { href: MARKETPLACE_ROUTES.buyerInterests, label: "Interests" },
];

const SELLER_LINKS = [
  { href: MARKETPLACE_ROUTES.sellerDashboard, label: "Overview" },
  { href: MARKETPLACE_ROUTES.sellerListings, label: "My listings" },
  { href: MARKETPLACE_ROUTES.sellerInbox, label: "Inbox" },
  { href: MARKETPLACE_ROUTES.sellerVerification, label: "Verification" },
];

type Props = {
  /** When false, only workspace shortcuts, desk switch, and log out (identity shown elsewhere). */
  showIdentity?: boolean;
};

/** Account, desk switch, and session controls for marketplace profile pages. */
export function MarketplaceProfileAccountSection({
  showIdentity = true,
}: Props) {
  const [location, navigate] = useLocation();
  const { session, currentUser, logout } = useAuth();
  const [switching, setSwitching] = useState(false);

  const activeDesk = activeDeskFromPath(location, currentUser?.role ?? null);
  const workspaceLinks = activeDesk === "buyer" ? BUYER_LINKS : SELLER_LINKS;
  const otherDesk: DeskView = activeDesk === "buyer" ? "seller" : "buyer";
  const otherRole: AuthRole = otherDesk === "buyer" ? "buyer" : "founder";
  const email = session?.user.email ?? currentUser?.email ?? "";
  const displayName = currentUser?.name ?? email.split("@")[0] ?? "Account";
  const avatarSrc = founderAvatarUrl(
    currentUser?.avatarSeed ?? currentUser?.id ?? session?.user.id ?? "user",
  );

  async function switchToOtherDesk() {
    const dest = marketplaceWorkspaceForRole(otherRole);
    setSwitching(true);
    try {
      await syncMarketplaceDeskRoleForPath(dest);
      navigate(dest, { replace: true });
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="space-y-6">
      {showIdentity ? (
        <section
          className={cn(
            marketplaceDeskCardClass,
            "flex flex-col gap-4 rounded-xl p-5 sm:flex-row sm:items-center",
          )}
        >
          <img
            src={avatarSrc}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full border border-border object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-foreground">{displayName}</p>
            {email ? (
              <p className="text-sm text-muted-foreground">{email}</p>
            ) : null}
            <p className="brand-eyebrow mt-1 text-[10px]">
              {activeDesk === "buyer" ? "Buyer" : "Seller"} desk
            </p>
          </div>
        </section>
      ) : null}

      <section
        className={cn(marketplaceDeskCardClass, "space-y-4 rounded-xl p-5")}
      >
        <div>
          <p className="brand-eyebrow text-[10px] font-bold">This workspace</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {workspaceLinks.map((item) => (
              <Button
                key={item.href}
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-[10px]"
                asChild
              >
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </div>
        </div>

        <div className="brand-kpi-card overflow-hidden rounded-xl p-4">
          <p className="brand-eyebrow text-[10px] font-bold">Switch desk</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Open the {otherDesk} app with the matching account when enabled.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={switching}
            onClick={() => void switchToOtherDesk()}
          >
            Switch to {otherDesk} desk
          </Button>
        </div>

        <Button
          type="button"
          variant="destructive"
          className="font-bold"
          onClick={() => void logout()}
        >
          Log out
        </Button>
      </section>
    </div>
  );
}
