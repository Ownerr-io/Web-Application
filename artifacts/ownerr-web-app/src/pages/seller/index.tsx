import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useMockSession } from "@/context/MockSessionContext";
import { getAllThreadsForOwner, getUserListings } from "@/lib/mockMarketplaceService";

export default function SellerDashboard() {
  const { currentUser } = useMockSession();
  const ownerId = currentUser?.id;
  const { data: listings = [] } = useQuery({
    queryKey: ["seller-overview-listings", ownerId],
    queryFn: () => getUserListings(ownerId!),
    enabled: !!ownerId,
  });
  const { data: threads = [] } = useQuery({
    queryKey: ["seller-overview-threads", ownerId],
    queryFn: () => getAllThreadsForOwner(ownerId!),
    enabled: !!ownerId,
  });
  const fallbackThreads = [
    { id: "fallback-thread-1", buyerName: "Olivia Carter", stage: "negotiating", updatedAt: new Date("2026-03-12").toISOString() },
    { id: "fallback-thread-2", buyerName: "Liam Brooks", stage: "contacted", updatedAt: new Date("2026-03-10").toISOString() },
    { id: "fallback-thread-3", buyerName: "Noah Mills", stage: "interested", updatedAt: new Date("2026-03-08").toISOString() },
  ];
  const safeThreads = threads.length > 0 ? threads : fallbackThreads;
  const verifiedCount = listings.filter((listing) => listing.revenueVerified && listing.domainVerified).length;

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{listings.length}</div>
            <p className="text-xs text-muted-foreground">Live listings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Verified Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{verifiedCount}</div>
            <p className="text-xs text-muted-foreground">Revenue + domain verified</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeThreads.length}</div>
            <p className="text-xs text-muted-foreground">Buyer conversations</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Health</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{safeThreads.filter((x) => x.stage === "negotiating").length}</p>
            <p className="text-xs text-muted-foreground">Deals in negotiation</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>New Interest (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{safeThreads.filter((x) => x.stage === "interested").length}</p>
            <p className="text-xs text-muted-foreground">Fresh buyer leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Response Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">92%</p>
            <p className="text-xs text-muted-foreground">Average within 24h</p>
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
              {safeThreads.slice(0, 4).map((thread) => (
                <div key={thread.id} className="rounded-md border border-border px-3 py-2 text-sm">
                  <p className="font-medium">{thread.buyerName}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {thread.stage} · {new Date(thread.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}