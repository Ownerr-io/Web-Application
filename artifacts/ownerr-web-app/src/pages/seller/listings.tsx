import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getUserListings } from "@/lib/marketplace/service";
import { formatShortCurrency } from "@/lib/utils";
import {
  MarketplaceDeskListItem,
  MarketplaceDeskPanel,
  MarketplaceDeskStat,
  MarketplaceDeskStatGrid,
  marketplaceDeskKpiValueClass,
} from "@/components/marketplace/MarketplaceDeskUi";

export default function SellerListingsPage() {
  const { session } = useAuth();
  const authUserId = session?.user?.id;
  const { data: listings = [] } = useQuery({
    queryKey: ["seller-listings-page", authUserId],
    queryFn: () => getUserListings(authUserId!),
    enabled: !!authUserId,
  });
  return (
    <MarketplaceDeskPanel title="My listings">
      <MarketplaceDeskStatGrid>
        <MarketplaceDeskStat
          label="Listings"
          value={listings.length}
          valueClassName={marketplaceDeskKpiValueClass(0)}
        />
        <MarketplaceDeskStat
          label="Total asking"
          value={formatShortCurrency(
            listings.reduce((s, x) => s + (x.price ?? 0), 0),
          )}
          valueClassName={marketplaceDeskKpiValueClass(1)}
        />
        <MarketplaceDeskStat
          label="Avg trust"
          value={
            listings.length
              ? Math.round(
                  listings.reduce(
                    (s, x) =>
                      s + ((x as { trustScore?: number }).trustScore ?? 70),
                    0,
                  ) / listings.length,
                )
              : "—"
          }
          valueClassName={marketplaceDeskKpiValueClass(2)}
        />
      </MarketplaceDeskStatGrid>
      <div className="space-y-3">
        {listings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No listings linked to this seller desk yet.
          </p>
        ) : null}
        {listings.map((listing) => (
          <MarketplaceDeskListItem key={listing.slug}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{listing.name}</p>
              <span className="text-sm font-bold text-brand-lime">
                {formatShortCurrency(listing.revenue)} MRR
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Asking price {formatShortCurrency(listing.price ?? 0)} ·{" "}
              {listing.category}
            </p>
          </MarketplaceDeskListItem>
        ))}
      </div>
    </MarketplaceDeskPanel>
  );
}
