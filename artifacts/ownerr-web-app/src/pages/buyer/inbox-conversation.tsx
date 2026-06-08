import { MarketplaceAppPageShell } from "@/components/marketplace/MarketplaceAppPageShell";
import { MarketplaceConversationChat } from "@/components/marketplace/MarketplaceConversationChat";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";
import { useParams } from "wouter";

export default function BuyerInboxConversationPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = params.conversationId ?? "";

  return (
    <MarketplaceAppPageShell
      kicker="Buyer desk"
      title="Conversation"
      description="Message the founder about this listing"
    >
      <MarketplaceConversationChat
        mode="buyer"
        conversationId={conversationId}
        backHref={MARKETPLACE_ROUTES.buyerInbox}
      />
    </MarketplaceAppPageShell>
  );
}
