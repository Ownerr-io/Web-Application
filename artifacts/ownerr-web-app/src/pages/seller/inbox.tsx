import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useMockSession } from "@/context/MockSessionContext";
import { fetchMarketplaceListings, getAllThreadsForOwner } from "@/lib/mockMarketplaceService";
import { mockStartups } from "@/lib/mockData";

export default function SellerInboxPage() {
  const { currentUser } = useMockSession();
  const ownerId = currentUser?.id;
  const { data: threads = [] } = useQuery({
    queryKey: ["seller-inbox-page", ownerId],
    queryFn: () => getAllThreadsForOwner(ownerId!),
    enabled: !!ownerId,
  });
  const { data: listings = [] } = useQuery({
    queryKey: ["seller-inbox-listings"],
    queryFn: () => fetchMarketplaceListings(mockStartups),
  });
  const listingBySlug = new Map(listings.map((listing) => [listing.slug, listing] as const));
  const safeThreads = threads.length > 0 ? threads : [
    {
      id: "fallback-inbox-1",
      buyerName: "Olivia Carter",
      stage: "negotiating",
      listingId: "sorio-ai",
      messages: [{ body: "Can we review churn trend by plan tier?" }],
    },
    {
      id: "fallback-inbox-2",
      buyerName: "Liam Brooks",
      stage: "contacted",
      listingId: "oli-ai",
      messages: [{ body: "Interested in closing this week if analytics access is available." }],
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inbox</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Open Threads</p>
            <p className="mt-1 text-xl font-bold">{safeThreads.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Negotiating</p>
            <p className="mt-1 text-xl font-bold">{safeThreads.filter((x) => x.stage === "negotiating").length}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Contacted</p>
            <p className="mt-1 text-xl font-bold">{safeThreads.filter((x) => x.stage === "contacted").length}</p>
          </div>
        </div>
        <div className="space-y-3">
          {safeThreads.map((thread) => (
            <div key={thread.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{thread.buyerName}</p>
                <span className="text-xs text-muted-foreground capitalize">{thread.stage}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {listingBySlug.get(thread.listingId)?.name ?? thread.listingId}
              </p>
              <p className="mt-1 text-sm text-foreground/90">
                {thread.messages.at(-1)?.body ?? "No messages"}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}