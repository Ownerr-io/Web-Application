import { useQuery } from "@tanstack/react-query";
import { fetchMarketplaceListings } from "@/lib/marketplace/service";
import { useInbox } from "@/hooks/marketplace/useInbox";
import {
  MarketplaceDeskListItem,
  MarketplaceDeskPanel,
  MarketplaceDeskStat,
  MarketplaceDeskStatGrid,
  marketplaceDeskKpiValueClass,
} from "@/components/marketplace/MarketplaceDeskUi";

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
    <MarketplaceDeskPanel title="Inbox">
      <MarketplaceDeskStatGrid>
        <MarketplaceDeskStat
          label="Open threads"
          value={safeThreads.length}
          valueClassName={marketplaceDeskKpiValueClass(0)}
        />
        <MarketplaceDeskStat
          label="With unread"
          value={safeThreads.filter((x) => x.unreadCount > 0).length}
          valueClassName={marketplaceDeskKpiValueClass(1)}
        />
        <MarketplaceDeskStat
          label="Unread total"
          value={safeThreads.reduce((n, t) => n + t.unreadCount, 0)}
          valueClassName={marketplaceDeskKpiValueClass(2)}
        />
      </MarketplaceDeskStatGrid>
      <div className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading inbox…</p>
        ) : safeThreads.length === 0 ? (
          <p className="text-sm text-muted-foreground">No conversations yet.</p>
        ) : (
          safeThreads.map((thread) => (
            <MarketplaceDeskListItem key={thread.conversationId}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{thread.buyerName}</p>
                {thread.unreadCount > 0 ? (
                  <span className="text-xs font-medium text-brand-orange">
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
            </MarketplaceDeskListItem>
          ))
        )}
      </div>
    </MarketplaceDeskPanel>
  );
}
