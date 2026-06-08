import { Link } from "wouter";
import { useInbox } from "@/hooks/marketplace/useInbox";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";
import { MarketplaceDeskListItem } from "@/components/marketplace/MarketplaceDeskUi";

export function CompanyWorkspaceMessagesTab({ slug }: { slug: string }) {
  const { data: threads = [], isLoading } = useInbox();
  const filtered = threads.filter((t) => t.startupSlug === slug);

  if (isLoading)
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!filtered.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No conversations for this listing. Buyer messages appear in{" "}
        <Link href={MARKETPLACE_ROUTES.sellerInbox} className="underline">
          Inbox
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {filtered.map((thread) => (
        <Link
          key={thread.conversationId}
          href={MARKETPLACE_ROUTES.sellerInboxConversation(
            thread.conversationId,
          )}
        >
          <MarketplaceDeskListItem className="cursor-pointer hover:border-brand-lime/40">
            <p className="font-medium">{thread.buyerName}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {thread.lastMessage || "No messages"}
            </p>
          </MarketplaceDeskListItem>
        </Link>
      ))}
    </div>
  );
}
