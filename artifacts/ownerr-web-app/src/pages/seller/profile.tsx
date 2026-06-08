import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketplaceAppPageShell } from "@/components/marketplace/MarketplaceAppPageShell";
import { MarketplaceProfileAccountSection } from "@/components/marketplace/MarketplaceProfileAccountSection";
import { AccountChangePasswordSection } from "@/components/auth/AccountChangePasswordSection";
import { ListCompanyButton } from "@/components/marketplace/ListCompanyButton";
import {
  MarketplaceDeskKpiCard,
  MarketplaceDeskListItem,
  MarketplaceDeskStat,
  marketplaceDeskCardClass,
  marketplaceDeskKpiValueClass,
} from "@/components/marketplace/MarketplaceDeskUi";
import { useAuth } from "@/context/AuthContext";
import { getUserListings } from "@/lib/marketplace/service";
import { marketplaceSellerListingPath } from "@/lib/appPaths";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";
import { founderAvatarUrl, cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function SellerProfilePage() {
  const { currentUser, session } = useAuth();
  const authUserId = session?.user?.id;
  const email = currentUser?.email ?? "";
  const displayName = currentUser?.name ?? "Account";
  const avatarSrc = founderAvatarUrl(
    currentUser?.avatarSeed ?? currentUser?.id ?? "founder",
  );

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["seller-profile-listings", authUserId],
    queryFn: () => getUserListings(authUserId!),
    enabled: !!authUserId,
  });

  const fullyVerified = listings.filter(
    (l) => l.revenueVerified && l.domainVerified && l.trafficVerified,
  ).length;
  const verificationRate =
    listings.length > 0
      ? `${Math.round((fullyVerified / listings.length) * 100)}%`
      : "—";

  return (
    <MarketplaceAppPageShell
      kicker="Seller desk"
      title="Profile"
      description="Your seller desk identity and account"
      headerActions={<ListCompanyButton size="sm" />}
    >
      <section
        className={cn(
          marketplaceDeskCardClass,
          "flex flex-col gap-4 rounded-xl p-5 sm:flex-row sm:items-center",
        )}
      >
        <img
          src={avatarSrc}
          alt=""
          className="h-16 w-16 shrink-0 rounded-full border border-[color:var(--terminal-border)] object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-foreground">{displayName}</p>
          {email ? (
            <p className="text-sm text-muted-foreground">{email}</p>
          ) : null}
          <p className="brand-eyebrow mt-1 text-[10px]">Seller desk</p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className={cn(marketplaceDeskCardClass, "md:col-span-2 shadow-none")}
        >
          <CardHeader className="pb-3">
            <CardTitle className="brand-eyebrow text-xs font-bold tracking-widest">
              Desk snapshot
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                <MarketplaceDeskStat
                  label="Open listings"
                  value={listings.length}
                  valueClassName={marketplaceDeskKpiValueClass(0)}
                />
                <MarketplaceDeskStat
                  label="Fully verified"
                  value={fullyVerified}
                  valueClassName={marketplaceDeskKpiValueClass(1)}
                />
                <MarketplaceDeskStat
                  label="Verification rate"
                  value={verificationRate}
                  valueClassName={marketplaceDeskKpiValueClass(2)}
                />
              </div>
            )}
          </CardContent>
        </Card>
        <MarketplaceDeskKpiCard title="Your listings">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : listings.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                No companies listed yet. Add your first startup to verify
                revenue and appear on the marketplace.
              </p>
              <ListCompanyButton size="sm" className="w-full" />
            </div>
          ) : (
            <div className="space-y-2">
              {listings.slice(0, 4).map((l) => (
                <MarketplaceDeskListItem key={l.slug}>
                  <Link
                    href={marketplaceSellerListingPath(l.slug)}
                    className="font-medium hover:underline"
                  >
                    {l.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Trust {l.trustScore ?? 0} ·{" "}
                    {l.revenueVerified
                      ? "Revenue verified"
                      : "Verification pending"}
                  </p>
                </MarketplaceDeskListItem>
              ))}
              {listings.length > 4 ? (
                <Link
                  href={MARKETPLACE_ROUTES.sellerListings}
                  className="text-xs font-medium text-brand-lime hover:underline"
                >
                  View all {listings.length} listings
                </Link>
              ) : null}
            </div>
          )}
        </MarketplaceDeskKpiCard>
      </div>

      <MarketplaceProfileAccountSection showIdentity={false} />
      <AccountChangePasswordSection className="mt-6" />
    </MarketplaceAppPageShell>
  );
}
