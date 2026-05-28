import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { fetchMarketplaceListings } from "@/lib/marketplace/service";
import { useInbox } from "@/hooks/marketplace/useInbox";

export default function SellerInboxPage() {
  const { data: inboxThreads = [], isLoading } = useInbox();
  const { data: listings = [] } = useQuery({
    queryKey: ["seller-inbox-listings"],
    queryFn: () => fetchMarketplaceListings(),
  });
  const listingBySlug = new Map(
    listings.map((listing) => [listing.slug, listing] as const),
  );
  const safeThreads = inboxThreads;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inbox</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Open Threads
            </p>
            <p className="mt-1 text-xl font-bold">{safeThreads.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Negotiating
            </p>
            <p className="mt-1 text-xl font-bold">
              {safeThreads.filter((x) => x.unreadCount > 0).length}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Contacted
            </p>
            <p className="mt-1 text-xl font-bold">
              {safeThreads.reduce((n, t) => n + t.unreadCount, 0)}
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading inbox…</p>
          ) : safeThreads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No conversations yet.
            </p>
          ) : (
            safeThreads.map((thread) => (
              <div
                key={thread.conversationId}
                className="rounded-lg border border-border p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{thread.buyerName}</p>
                  {thread.unreadCount > 0 ? (
                    <span className="text-xs font-medium text-primary">
                      {thread.unreadCount} unread
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {listingBySlug.get(thread.startupSlug)?.name ??
                    thread.startupTitle}
                </p>
                <p className="mt-1 text-sm text-foreground/90">
                  {thread.lastMessage || "No messages"}
                </p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
