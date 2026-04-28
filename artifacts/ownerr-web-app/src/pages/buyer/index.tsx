import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMockSession } from "@/context/MockSessionContext";
import { fetchMarketplaceListings, getUserBids, getUserInterests } from "@/lib/mockMarketplaceService";
import type { DealRelationshipStage, MarketplaceInterestRecord } from "@/lib/mockMarketplaceService";
import { Skeleton } from "@/components/ui/skeleton";
import { mockStartups } from "@/lib/mockData";

export default function BuyerDashboard() {
  const { currentUser } = useMockSession();
  const userId = currentUser?.id;

  const {
    data: interests,
    isLoading: isLoadingInterests,
  } = useQuery({
    queryKey: ["userInterests", userId],
    queryFn: () => getUserInterests(userId!),
    enabled: !!userId,
  });

  const {
    data: bids,
    isLoading: isLoadingBids,
  } = useQuery({
    queryKey: ["userBids", userId],
    queryFn: () => getUserBids(userId!),
    enabled: !!userId,
  });

  const { data: listings } = useQuery({
    queryKey: ["buyer-overview-listings"],
    queryFn: () => fetchMarketplaceListings(mockStartups),
  });
  const listingBySlug = new Map((listings ?? []).map((listing) => [listing.slug, listing] as const));
  type FallbackInterest = Pick<MarketplaceInterestRecord, "id" | "listingId" | "offerAmount" | "updatedAt" | "stage">;
  const fallbackRecent: FallbackInterest[] = [
    { id: "fallback-1", listingId: "sorio-ai", offerAmount: 215000, updatedAt: new Date("2026-03-03").toISOString(), stage: "interested" },
    { id: "fallback-2", listingId: "oli-ai", offerAmount: null, updatedAt: new Date("2026-03-05").toISOString(), stage: "contacted" },
    { id: "fallback-3", listingId: "rezi", offerAmount: 128000, updatedAt: new Date("2026-03-11").toISOString(), stage: "negotiating" },
  ];
  const safeInterests = interests && interests.length > 0 ? interests : fallbackRecent;
  const safeBidsCount = bids && bids.length > 0 ? bids.length : fallbackRecent.filter((x) => !!x.offerAmount).length;
  const recent = [...safeInterests].slice(0, 4);
  const stageCounts: Record<DealRelationshipStage, number> = { interested: 0, contacted: 0, negotiating: 0, closed: 0 };
  for (const item of safeInterests) stageCounts[item.stage]++;

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Interests</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingInterests ? (
              <Skeleton className="h-8 w-1/2" />
            ) : (
              <>
                <div className="text-2xl font-bold">{safeInterests.length}</div>
                <p className="text-xs text-muted-foreground">Across all listings</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Bids</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingBids ? (
              <Skeleton className="h-8 w-1/2" />
            ) : (
              <>
                <div className="text-2xl font-bold">{safeBidsCount}</div>
                <p className="text-xs text-muted-foreground">On various startups</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>High-Trust Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28</div>
            <p className="text-xs text-muted-foreground">Viewed</p>
          </CardContent>
        </Card>
      </div>
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recent.map((item) => (
                <div key={item.id} className="rounded-md border border-border px-3 py-2 text-sm">
                  <p className="font-medium">{listingBySlug.get(item.listingId)?.name ?? item.listingId}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.offerAmount ? `Offer sent · $${Math.round(item.offerAmount).toLocaleString()}` : "Interest expressed"} ·{" "}
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Interested</p>
              <p className="mt-1 text-lg font-bold">{stageCounts.interested}</p>
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Negotiating</p>
              <p className="mt-1 text-lg font-bold">{stageCounts.negotiating}</p>
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Contacted</p>
              <p className="mt-1 text-lg font-bold">{stageCounts.contacted}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}