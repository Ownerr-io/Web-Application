import { Link } from "wouter";
import { useInbox } from "@/hooks/marketplace/useInbox";
import { useAuth } from "@/context/AuthContext";
import {
  MarketplaceDeskListItem,
  MarketplaceDeskPanel,
  MarketplaceDeskStat,
  MarketplaceDeskStatGrid,
  marketplaceDeskKpiValueClass,
} from "@/components/marketplace/MarketplaceDeskUi";
import { useQuery } from "@tanstack/react-query";
import { fetchMarketplaceListings } from "@/lib/marketplace/service";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";
import { cn } from "@/lib/utils";

type Props = {
  mode: "buyer" | "seller";
};

export function MarketplaceInboxPanel({ mode }: Props) {
  const { currentUser } = useAuth();
  const { data: inboxThreads = [], isLoading } = useInbox();
  const { data: listings = [] } = useQuery({
    queryKey: ["inbox-listings", mode],
    queryFn: () => fetchMarketplaceListings(),
    enabled: mode === "seller",
  });
  const listingBySlug = new Map(
    listings.map((listing) => [listing.slug, listing] as const),
  );

  return (
    <MarketplaceDeskPanel title="Inbox">
      <MarketplaceDeskStatGrid>
        <MarketplaceDeskStat
          label="Open threads"
          value={inboxThreads.length}
          valueClassName={marketplaceDeskKpiValueClass(0)}
        />
        <MarketplaceDeskStat
          label="With unread"
          value={inboxThreads.filter((x) => x.unreadCount > 0).length}
          valueClassName={marketplaceDeskKpiValueClass(1)}
        />
        <MarketplaceDeskStat
          label="Unread total"
          value={inboxThreads.reduce((n, t) => n + t.unreadCount, 0)}
          valueClassName={marketplaceDeskKpiValueClass(2)}
        />
      </MarketplaceDeskStatGrid>
      <div className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading inbox…</p>
        ) : inboxThreads.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {mode === "buyer"
              ? "No conversations yet. Express interest on a listing to start a thread."
              : "No conversations yet."}
          </p>
        ) : (
          inboxThreads.map((thread) => {
            const href =
              mode === "buyer"
                ? MARKETPLACE_ROUTES.buyerInboxConversation(
                    thread.conversationId,
                  )
                : MARKETPLACE_ROUTES.sellerInboxConversation(
                    thread.conversationId,
                  );
            return (
              <Link key={thread.conversationId} href={href}>
                <MarketplaceDeskListItem
                  className={cn(
                    "cursor-pointer transition-colors hover:border-brand-lime/40 hover:bg-muted/20",
                    thread.unreadCount > 0 && "border-brand-orange/30",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">
                      {mode === "buyer" ? thread.sellerName : thread.buyerName}
                    </p>
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
                  <p className="mt-1 line-clamp-2 text-sm text-foreground/90">
                    {thread.lastMessage || "No messages"}
                  </p>
                  <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-brand-lime">
                    Open chat →
                  </p>
                </MarketplaceDeskListItem>
              </Link>
            );
          })
        )}
      </div>
      {currentUser?.email ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Signed in as {currentUser.email}
        </p>
      ) : null}
    </MarketplaceDeskPanel>
  );
}
