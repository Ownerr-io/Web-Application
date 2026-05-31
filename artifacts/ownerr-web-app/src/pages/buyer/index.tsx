import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMarketplaceListings } from "@/lib/marketplace/service";
import type { DealRelationshipStage } from "@/lib/marketplace/types";
import { useMyBids } from "@/hooks/marketplace/useBids";
import { useMyInterests } from "@/hooks/marketplace/useInterests";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import {
  MarketplaceDeskKpiCard,
  MarketplaceDeskListItem,
  MarketplaceDeskPanel,
  MarketplaceDeskStat,
  MarketplaceDeskStatGrid,
  marketplaceDeskKpiValueClass,
} from "@/components/marketplace/MarketplaceDeskUi";

export default function BuyerDashboard() {
  const { data: interests, isLoading: isLoadingInterests } = useMyInterests();
  const { data: bids, isLoading: isLoadingBids } = useMyBids();

  const { data: listings } = useQuery({
    queryKey: ["buyer-overview-listings"],
    queryFn: () => fetchMarketplaceListings(),
  });
  const listingBySlug = new Map(
    (listings ?? []).map((listing) => [listing.slug, listing] as const),
  );
  const safeInterests = useMemo(() => interests ?? [], [interests]);
  const safeBids = bids ?? [];
  const recent = [...safeInterests].slice(0, 4);
  const stageCounts: Record<DealRelationshipStage, number> = {
    interested: 0,
    contacted: 0,
    negotiating: 0,
    closed: 0,
    withdrawn: 0,
  };
  for (const item of safeInterests) stageCounts[item.stage]++;

  const listingsTracked = useMemo(
    () => new Set(safeInterests.map((i) => i.listingId)).size,
    [safeInterests],
  );
  const totalOfferValue = safeBids.reduce((sum, row) => sum + row.amount, 0);
  const activeBidCount = safeBids.filter(
    (b) =>
      b.status !== "withdrawn" &&
      b.status !== "rejected" &&
      b.status !== "accepted",
  ).length;

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <MarketplaceDeskKpiCard title="Total interests">
          {isLoadingInterests ? (
            <Skeleton className="h-8 w-1/2" />
          ) : (
            <>
              <div
                className={`text-2xl font-bold tabular-nums ${marketplaceDeskKpiValueClass(0)}`}
              >
                {safeInterests.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all listings
              </p>
            </>
          )}
        </MarketplaceDeskKpiCard>
        <MarketplaceDeskKpiCard title="Active bids">
          {isLoadingBids ? (
            <Skeleton className="h-8 w-1/2" />
          ) : (
            <>
              <div
                className={`text-2xl font-bold tabular-nums ${marketplaceDeskKpiValueClass(1)}`}
              >
                {activeBidCount}
              </div>
              <p className="text-xs text-muted-foreground">
                {safeBids.length} total · {formatCurrency(totalOfferValue)}{" "}
                offered
              </p>
            </>
          )}
        </MarketplaceDeskKpiCard>
        <MarketplaceDeskKpiCard title="Listings tracked">
          {isLoadingInterests ? (
            <Skeleton className="h-8 w-1/2" />
          ) : (
            <>
              <div
                className={`text-2xl font-bold tabular-nums ${marketplaceDeskKpiValueClass(2)}`}
              >
                {listingsTracked}
              </div>
              <p className="text-xs text-muted-foreground">
                Unique startups in your pipeline
              </p>
            </>
          )}
        </MarketplaceDeskKpiCard>
      </div>
      <MarketplaceDeskPanel title="Recent activity">
        {isLoadingInterests ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No interests yet. Browse listings to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {recent.map((item) => (
              <MarketplaceDeskListItem key={item.id}>
                <p className="font-medium">
                  {listingBySlug.get(item.listingId)?.name ?? item.listingId}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.offerAmount
                    ? `Offer · ${formatCurrency(item.offerAmount)}`
                    : "Interest expressed"}{" "}
                  · {new Date(item.updatedAt).toLocaleDateString()}
                </p>
              </MarketplaceDeskListItem>
            ))}
          </div>
        )}
      </MarketplaceDeskPanel>
      <MarketplaceDeskPanel title="Pipeline snapshot">
        <MarketplaceDeskStatGrid>
          <MarketplaceDeskStat
            label="Interested"
            value={stageCounts.interested}
            valueClassName={marketplaceDeskKpiValueClass(0)}
          />
          <MarketplaceDeskStat
            label="Negotiating"
            value={stageCounts.negotiating}
            valueClassName={marketplaceDeskKpiValueClass(1)}
          />
          <MarketplaceDeskStat
            label="Contacted"
            value={stageCounts.contacted}
            valueClassName={marketplaceDeskKpiValueClass(2)}
          />
        </MarketplaceDeskStatGrid>
      </MarketplaceDeskPanel>
    </div>
  );
}
