import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useMockSession } from "@/context/MockSessionContext";
import { getUserListings } from "@/lib/mockMarketplaceService";

export default function SellerVerificationPage() {
  const { currentUser } = useMockSession();
  const ownerId = currentUser?.id;
  const { data: listings = [] } = useQuery({
    queryKey: ["seller-verification-page", ownerId],
    queryFn: () => getUserListings(ownerId!),
    enabled: !!ownerId,
  });
  const safeListings = listings.length > 0 ? listings : [
    { slug: "sorio-ai", name: "Sorio AI", revenueVerified: true, domainVerified: true, trafficVerified: true },
    { slug: "oli-ai", name: "Oli Ai", revenueVerified: true, domainVerified: false, trafficVerified: false },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verification Center</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Fully Verified</p>
            <p className="mt-1 text-xl font-bold">
              {safeListings.filter((x) => x.revenueVerified && x.domainVerified && x.trafficVerified).length}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Revenue Verified</p>
            <p className="mt-1 text-xl font-bold">{safeListings.filter((x) => x.revenueVerified).length}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Domain Verified</p>
            <p className="mt-1 text-xl font-bold">{safeListings.filter((x) => x.domainVerified).length}</p>
          </div>
        </div>
        <div className="space-y-3">
          {safeListings.map((listing) => (
            <div key={listing.slug} className="rounded-lg border border-border p-3">
              <p className="font-semibold">{listing.name}</p>
              <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                <span>Revenue: {listing.revenueVerified ? "Verified" : "Pending"}</span>
                <span>Domain: {listing.domainVerified ? "Verified" : "Pending"}</span>
                <span>Traffic: {listing.trafficVerified ? "Verified" : "Pending"}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}