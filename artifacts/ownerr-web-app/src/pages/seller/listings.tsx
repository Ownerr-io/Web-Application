import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useMockSession } from "@/context/MockSessionContext";
import { getUserListings } from "@/lib/mockMarketplaceService";
import { formatShortCurrency } from "@/lib/utils";

export default function SellerListingsPage() {
  const { currentUser } = useMockSession();
  const ownerId = currentUser?.id;
  const { data: listings = [] } = useQuery({
    queryKey: ["seller-listings-page", ownerId],
    queryFn: () => getUserListings(ownerId!),
    enabled: !!ownerId,
  });
  const safeListings = listings.length > 0 ? listings : [
    { slug: "sorio-ai", name: "Sorio AI", revenue: 12500, price: 250000, category: "Artificial Intelligence", trustScore: 88 },
    { slug: "oli-ai", name: "Oli Ai", revenue: 1100, price: 50000, category: "Artificial Intelligence", trustScore: 74 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Listings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Listings</p>
            <p className="mt-1 text-xl font-bold">{safeListings.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Asking</p>
            <p className="mt-1 text-xl font-bold">{formatShortCurrency(safeListings.reduce((s, x) => s + (x.price ?? 0), 0))}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Avg Trust</p>
            <p className="mt-1 text-xl font-bold">
              {Math.round(safeListings.reduce((s, x) => s + ((x as { trustScore?: number }).trustScore ?? 70), 0) / safeListings.length)}
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {safeListings.map((listing) => (
            <div key={listing.slug} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{listing.name}</p>
                <span className="text-sm font-bold">{formatShortCurrency(listing.revenue)} MRR</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Asking price {formatShortCurrency(listing.price ?? 0)} · {listing.category}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}