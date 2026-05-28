import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useInbox } from "@/hooks/marketplace/useInbox";
import { getUserListings } from "@/lib/marketplace/service";
import { Skeleton } from "@/components/ui/skeleton";

export default function SellerDashboard() {
  const { session } = useAuth();
  const authUserId = session?.user?.id;
  const { data: listings = [], isLoading: listingsLoading } = useQuery({
    queryKey: ["seller-overview-listings", authUserId],
    queryFn: () => getUserListings(authUserId!),
    enabled: !!authUserId,
  });
  const { data: inbox = [], isLoading: inboxLoading } = useInbox();

  const verifiedCount = listings.filter(
    (listing) => listing.revenueVerified && listing.domainVerified,
  ).length;
  const unreadTotal = inbox.reduce((n, t) => n + t.unreadCount, 0);
  const recent = [...inbox]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 4);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total listings</CardTitle>
          </CardHeader>
          <CardContent>
            {listingsLoading ? (
              <Skeleton className="h-8 w-1/2" />
            ) : (
              <>
                <div className="text-2xl font-bold">{listings.length}</div>
                <p className="text-xs text-muted-foreground">
                  Linked to your seller desk
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Verified listings</CardTitle>
          </CardHeader>
          <CardContent>
            {listingsLoading ? (
              <Skeleton className="h-8 w-1/2" />
            ) : (
              <>
                <div className="text-2xl font-bold">{verifiedCount}</div>
                <p className="text-xs text-muted-foreground">
                  Revenue + domain verified
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Inbox threads</CardTitle>
          </CardHeader>
          <CardContent>
            {inboxLoading ? (
              <Skeleton className="h-8 w-1/2" />
            ) : (
              <>
                <div className="text-2xl font-bold">{inbox.length}</div>
                <p className="text-xs text-muted-foreground">
                  Buyer conversations
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Unread messages</CardTitle>
          </CardHeader>
          <CardContent>
            {inboxLoading ? (
              <Skeleton className="h-8 w-1/2" />
            ) : (
              <>
                <div className="text-2xl font-bold">{unreadTotal}</div>
                <p className="text-xs text-muted-foreground">
                  Across all threads
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Listings with buyers</CardTitle>
          </CardHeader>
          <CardContent>
            {inboxLoading ? (
              <Skeleton className="h-8 w-1/2" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {new Set(inbox.map((t) => t.startupSlug)).size}
                </div>
                <p className="text-xs text-muted-foreground">
                  Startups in active conversations
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent inbox</CardTitle>
        </CardHeader>
        <CardContent>
          {inboxLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No conversations yet.
            </p>
          ) : (
            <div className="space-y-2">
              {recent.map((thread) => (
                <div
                  key={thread.conversationId}
                  className="rounded-md border border-border px-3 py-2 text-sm"
                >
                  <p className="font-medium">{thread.startupTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {thread.buyerName} ·{" "}
                    {new Date(thread.updatedAt).toLocaleDateString()}
                    {thread.unreadCount > 0
                      ? ` · ${thread.unreadCount} unread`
                      : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
