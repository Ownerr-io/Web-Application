import { useQuery } from "@tanstack/react-query";
import { fetchMarketplaceListings } from "@/lib/marketplace/service";
import { useMyBids } from "@/hooks/marketplace/useBids";
import { formatCurrency } from "@/lib/utils";
import {
  MarketplaceDeskListItem,
  MarketplaceDeskPanel,
  MarketplaceDeskStat,
  MarketplaceDeskStatGrid,
  marketplaceDeskKpiValueClass,
} from "@/components/marketplace/MarketplaceDeskUi";

export default function BuyerBidsPage() {
  const bidsQuery = useMyBids();
  const listingsQuery = useQuery({
    queryKey: ["buyer-bids-listings"],
    queryFn: () => fetchMarketplaceListings(),
  });
  const listingBySlug = new Map(
    (listingsQuery.data ?? []).map(
      (listing) => [listing.slug, listing] as const,
    ),
  );
  const rows = bidsQuery.data ?? [];

  return (
    <MarketplaceDeskPanel title="My bids">
      <MarketplaceDeskStatGrid>
        <MarketplaceDeskStat
          label="Active offers"
          value={rows.length}
          valueClassName={marketplaceDeskKpiValueClass(0)}
        />
        <MarketplaceDeskStat
          label="Total offer value"
          value={formatCurrency(rows.reduce((sum, row) => sum + row.amount, 0))}
          valueClassName={marketplaceDeskKpiValueClass(1)}
        />
        <MarketplaceDeskStat
          label="Latest update"
          value={new Date(
            rows[0]?.updatedAt ?? new Date().toISOString(),
          ).toLocaleDateString()}
          valueClassName={`text-base ${marketplaceDeskKpiValueClass(2)}`}
        />
      </MarketplaceDeskStatGrid>
      <div className="space-y-3">
        {rows.map((record) => {
          const listing = listingBySlug.get(record.startupSlug);
          return (
            <MarketplaceDeskListItem key={record.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {listing?.name ?? record.startupSlug}
                </p>
                <span className="text-sm font-bold text-brand-lime">
                  {formatCurrency(record.amount)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground capitalize">
                Status: {record.status}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Updated {new Date(record.updatedAt).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {listing?.category ?? "Startup"} · Trust{" "}
                {listing?.trustScore ?? 72}/100
              </p>
            </MarketplaceDeskListItem>
          );
        })}
      </div>
    </MarketplaceDeskPanel>
  );
}
