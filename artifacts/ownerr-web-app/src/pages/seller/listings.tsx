import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getUserListings } from "@/lib/marketplace/service";
import { formatShortCurrency } from "@/lib/utils";

export default function SellerListingsPage() {
  const { session } = useAuth();
  const authUserId = session?.user?.id;
  const { data: listings = [] } = useQuery({
    queryKey: ['seller-listings-page', authUserId],
    queryFn: () => getUserListings(authUserId!),
    enabled: !!authUserId,
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Listings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Listings</p>
            <p className="mt-1 text-xl font-bold">{listings.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Asking</p>
            <p className="mt-1 text-xl font-bold">
              {formatShortCurrency(listings.reduce((s, x) => s + (x.price ?? 0), 0))}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Avg Trust</p>
            <p className="mt-1 text-xl font-bold">
              {listings.length
                ? Math.round(
                    listings.reduce((s, x) => s + ((x as { trustScore?: number }).trustScore ?? 70), 0) /
                      listings.length,
                  )
                : '—'}
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {listings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No listings linked to this seller desk yet.</p>
          ) : null}
          {listings.map((listing) => (
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