import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchMarketplaceListings } from "@/lib/marketplace/service";
import type { DealRelationshipStage } from "@/lib/marketplace/types";
import { useMyBids } from "@/hooks/marketplace/useBids";
import { useMyInterests } from "@/hooks/marketplace/useInterests";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

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
        <Card>
          <CardHeader>
            <CardTitle>Total interests</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingInterests ? (
              <Skeleton className="h-8 w-1/2" />
            ) : (
              <>
                <div className="text-2xl font-bold">{safeInterests.length}</div>
                <p className="text-xs text-muted-foreground">
                  Across all listings
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active bids</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingBids ? (
              <Skeleton className="h-8 w-1/2" />
            ) : (
              <>
                <div className="text-2xl font-bold">{activeBidCount}</div>
                <p className="text-xs text-muted-foreground">
                  {safeBids.length} total · {formatCurrency(totalOfferValue)}{" "}
                  offered
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Listings tracked</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingInterests ? (
              <Skeleton className="h-8 w-1/2" />
            ) : (
              <>
                <div className="text-2xl font-bold">{listingsTracked}</div>
                <p className="text-xs text-muted-foreground">
                  Unique startups in your pipeline
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingInterests ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No interests yet. Browse listings to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {recent.map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border border-border px-3 py-2 text-sm"
                >
                  <p className="font-medium">
                    {listingBySlug.get(item.listingId)?.name ?? item.listingId}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.offerAmount
                      ? `Offer · ${formatCurrency(item.offerAmount)}`
                      : "Interest expressed"}{" "}
                    · {new Date(item.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Pipeline snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Interested
              </p>
              <p className="mt-1 text-lg font-bold">{stageCounts.interested}</p>
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Negotiating
              </p>
              <p className="mt-1 text-lg font-bold">
                {stageCounts.negotiating}
              </p>
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Contacted
              </p>
              <p className="mt-1 text-lg font-bold">{stageCounts.contacted}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
