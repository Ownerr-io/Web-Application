import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useMockSession } from "@/context/MockSessionContext";
import { fetchMarketplaceListings, getUserBids } from "@/lib/mockMarketplaceService";
import { mockStartups } from "@/lib/mockData";
import { formatCurrency } from "@/lib/utils";

export default function BuyerBidsPage() {
  const { currentUser } = useMockSession();
  const userId = currentUser?.id;
  const bidsQuery = useQuery({
    queryKey: ["buyer-bids-page", userId],
    queryFn: () => getUserBids(userId!),
    enabled: !!userId,
  });
  const listingsQuery = useQuery({
    queryKey: ["buyer-bids-listings"],
    queryFn: () => fetchMarketplaceListings(mockStartups),
  });
  const listingBySlug = new Map((listingsQuery.data ?? []).map((listing) => [listing.slug, listing] as const));
  const fallbackBids = [
    {
      id: "fallback-bid-1",
      listingId: "sorio-ai",
      offerAmount: 215000,
      stage: "negotiating",
      updatedAt: new Date("2026-03-03T15:30:00.000Z").toISOString(),
    },
    {
      id: "fallback-bid-2",
      listingId: "rezi",
      offerAmount: 128000,
      stage: "contacted",
      updatedAt: new Date("2026-03-11T14:10:00.000Z").toISOString(),
    },
  ];
  const rows = (bidsQuery.data && bidsQuery.data.length > 0 ? bidsQuery.data : fallbackBids) as Array<{
    id: string;
    listingId: string;
    offerAmount: number | null;
    stage: string;
    updatedAt: string;
  }>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Bids</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Active Offers</p>
            <p className="mt-1 text-xl font-bold">{rows.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Offer Value</p>
            <p className="mt-1 text-xl font-bold">
              {formatCurrency(rows.reduce((sum, row) => sum + (row.offerAmount ?? 0), 0))}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Latest Update</p>
            <p className="mt-1 text-sm font-semibold">
              {new Date(rows[0]?.updatedAt ?? new Date().toISOString()).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {rows.map((record) => {
            const listing = listingBySlug.get(record.listingId);
            return (
              <div key={record.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{listing?.name ?? record.listingId}</p>
                  <span className="text-sm font-bold">{formatCurrency(record.offerAmount ?? 0)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground capitalize">Stage: {record.stage}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Updated {new Date(record.updatedAt).toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {listing?.category ?? "Startup"} · Trust {listing?.trustScore ?? 72}/100
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}