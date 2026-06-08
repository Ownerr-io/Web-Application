import { MarketplaceAppPageShell } from "@/components/marketplace/MarketplaceAppPageShell";
import { MarketplaceConversationChat } from "@/components/marketplace/MarketplaceConversationChat";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";
import { useParams } from "wouter";

export default function SellerInboxConversationPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = params.conversationId ?? "";

  return (
    <MarketplaceAppPageShell
      kicker="Founder desk"
      title="Conversation"
      description="Message a buyer about your listing"
    >
      <MarketplaceConversationChat
        mode="seller"
        conversationId={conversationId}
        backHref={MARKETPLACE_ROUTES.sellerInbox}
      />
    </MarketplaceAppPageShell>
  );
}
