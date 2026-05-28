import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { fetchMarketplaceListings } from "@/lib/marketplace/service";
import { useMyBids } from "@/hooks/marketplace/useBids";
import { formatCurrency } from "@/lib/utils";

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
    <Card>
      <CardHeader>
        <CardTitle>My Bids</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Active Offers
            </p>
            <p className="mt-1 text-xl font-bold">{rows.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Total Offer Value
            </p>
            <p className="mt-1 text-xl font-bold">
              {formatCurrency(rows.reduce((sum, row) => sum + row.amount, 0))}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Latest Update
            </p>
            <p className="mt-1 text-sm font-semibold">
              {new Date(
                rows[0]?.updatedAt ?? new Date().toISOString(),
              ).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {rows.map((record) => {
            const listing = listingBySlug.get(record.startupSlug);
            return (
              <div
                key={record.id}
                className="rounded-lg border border-border p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    {listing?.name ?? record.startupSlug}
                  </p>
                  <span className="text-sm font-bold">
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
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
