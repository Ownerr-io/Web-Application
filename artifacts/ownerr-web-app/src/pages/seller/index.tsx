import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useInbox } from "@/hooks/marketplace/useInbox";
import { getUserListings } from "@/lib/marketplace/service";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MarketplaceDeskKpiCard,
  MarketplaceDeskListItem,
  MarketplaceDeskPanel,
  marketplaceDeskKpiValueClass,
} from "@/components/marketplace/MarketplaceDeskUi";

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
        <MarketplaceDeskKpiCard title="Total listings">
          {listingsLoading ? (
            <Skeleton className="h-8 w-1/2" />
          ) : (
            <>
              <div
                className={`text-2xl font-bold tabular-nums ${marketplaceDeskKpiValueClass(0)}`}
              >
                {listings.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Linked to your seller desk
              </p>
            </>
          )}
        </MarketplaceDeskKpiCard>
        <MarketplaceDeskKpiCard title="Verified listings">
          {listingsLoading ? (
            <Skeleton className="h-8 w-1/2" />
          ) : (
            <>
              <div
                className={`text-2xl font-bold tabular-nums ${marketplaceDeskKpiValueClass(1)}`}
              >
                {verifiedCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Revenue + domain verified
              </p>
            </>
          )}
        </MarketplaceDeskKpiCard>
        <MarketplaceDeskKpiCard title="Inbox threads">
          {inboxLoading ? (
            <Skeleton className="h-8 w-1/2" />
          ) : (
            <>
              <div
                className={`text-2xl font-bold tabular-nums ${marketplaceDeskKpiValueClass(2)}`}
              >
                {inbox.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Buyer conversations
              </p>
            </>
          )}
        </MarketplaceDeskKpiCard>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <MarketplaceDeskKpiCard title="Unread messages">
          {inboxLoading ? (
            <Skeleton className="h-8 w-1/2" />
          ) : (
            <>
              <div
                className={`text-2xl font-bold tabular-nums ${marketplaceDeskKpiValueClass(0)}`}
              >
                {unreadTotal}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all threads
              </p>
            </>
          )}
        </MarketplaceDeskKpiCard>
        <MarketplaceDeskKpiCard title="Listings with buyers">
          {inboxLoading ? (
            <Skeleton className="h-8 w-1/2" />
          ) : (
            <>
              <div
                className={`text-2xl font-bold tabular-nums ${marketplaceDeskKpiValueClass(1)}`}
              >
                {new Set(inbox.map((t) => t.startupSlug)).size}
              </div>
              <p className="text-xs text-muted-foreground">
                Startups in active conversations
              </p>
            </>
          )}
        </MarketplaceDeskKpiCard>
      </div>
      <MarketplaceDeskPanel title="Recent inbox">
        {inboxLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No conversations yet.</p>
        ) : (
          <div className="space-y-2">
            {recent.map((thread) => (
              <MarketplaceDeskListItem key={thread.conversationId}>
                <p className="font-medium">{thread.startupTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {thread.buyerName} ·{" "}
                  {new Date(thread.updatedAt).toLocaleDateString()}
                  {thread.unreadCount > 0
                    ? ` · ${thread.unreadCount} unread`
                    : ""}
                </p>
              </MarketplaceDeskListItem>
            ))}
          </div>
        )}
      </MarketplaceDeskPanel>
    </div>
  );
}
