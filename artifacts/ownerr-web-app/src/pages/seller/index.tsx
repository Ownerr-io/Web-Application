import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Link } from "wouter";
import { useInbox } from "@/hooks/marketplace/useInbox";
import {
  countCompaniesReadyToPublish,
  countPublishedCompanies,
  fetchSellerCompanies,
} from "@/lib/marketplace/sellerCompanyApi";
import { gatesTotal } from "@/lib/marketplace/verificationDesk";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MarketplaceDeskKpiCard,
  MarketplaceDeskListItem,
  MarketplaceDeskPanel,
  marketplaceDeskKpiValueClass,
} from "@/components/marketplace/MarketplaceDeskUi";
import { ListCompanyButton } from "@/components/marketplace/ListCompanyButton";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";

export default function SellerDashboard() {
  const { session } = useAuth();
  const authUserId = session?.user?.id;
  const { data: companies = [], isLoading: listingsLoading } = useQuery({
    queryKey: ["seller-companies", authUserId],
    queryFn: () => fetchSellerCompanies(authUserId!),
    enabled: !!authUserId,
  });
  const { data: inbox = [], isLoading: inboxLoading } = useInbox();

  const readyCount = countCompaniesReadyToPublish(companies);
  const publishedCount = countPublishedCompanies(companies);
  const unreadTotal = inbox.reduce((n, t) => n + t.unreadCount, 0);
  const recent = [...inbox]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 4);

  return (
    <div className="grid gap-4">
      {!listingsLoading && companies.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-border bg-muted/20 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-foreground">
              List your first company
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Create a marketplace listing, connect verifications, and manage
              deals from this desk.
            </p>
          </div>
          <ListCompanyButton />
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MarketplaceDeskKpiCard title="Companies">
          {listingsLoading ? (
            <Skeleton className="h-8 w-1/2" />
          ) : (
            <>
              <div
                className={`text-2xl font-bold tabular-nums ${marketplaceDeskKpiValueClass(0)}`}
              >
                {companies.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Listings on your seller desk
              </p>
            </>
          )}
        </MarketplaceDeskKpiCard>
        <MarketplaceDeskKpiCard title="Ready to publish">
          {listingsLoading ? (
            <Skeleton className="h-8 w-1/2" />
          ) : (
            <>
              <div
                className={`text-2xl font-bold tabular-nums ${marketplaceDeskKpiValueClass(1)}`}
              >
                {readyCount}
              </div>
              <p className="text-xs text-muted-foreground">
                All {gatesTotal()} verification gates complete
              </p>
              {readyCount < companies.length && companies.length > 0 ? (
                <Link
                  href={MARKETPLACE_ROUTES.sellerCompanies}
                  className="mt-2 inline-block text-xs font-medium text-brand-lime hover:underline"
                >
                  Open companies
                </Link>
              ) : null}
            </>
          )}
        </MarketplaceDeskKpiCard>
        <MarketplaceDeskKpiCard title="Published">
          {listingsLoading ? (
            <Skeleton className="h-8 w-1/2" />
          ) : (
            <>
              <div
                className={`text-2xl font-bold tabular-nums ${marketplaceDeskKpiValueClass(2)}`}
              >
                {publishedCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Live on marketplace
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
              <Link
                key={thread.conversationId}
                href={MARKETPLACE_ROUTES.sellerInboxConversation(
                  thread.conversationId,
                )}
              >
                <MarketplaceDeskListItem className="cursor-pointer transition-colors hover:border-brand-lime/40 hover:bg-muted/20">
                  <p className="font-medium">{thread.startupTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {thread.buyerName} ·{" "}
                    {new Date(thread.updatedAt).toLocaleDateString()}
                    {thread.unreadCount > 0
                      ? ` · ${thread.unreadCount} unread`
                      : ""}
                  </p>
                  <p className="mt-1 line-clamp-1 text-sm text-foreground/90">
                    {thread.lastMessage || "No messages"}
                  </p>
                </MarketplaceDeskListItem>
              </Link>
            ))}
          </div>
        )}
      </MarketplaceDeskPanel>
    </div>
  );
}
