import { MarketplaceAppPageShell } from "@/components/marketplace/MarketplaceAppPageShell";
import { MarketplaceInboxPanel } from "@/components/marketplace/MarketplaceInboxPanel";

export default function BuyerInboxPage() {
  return (
    <MarketplaceAppPageShell
      kicker="Buyer desk"
      title="Inbox"
      description="Messages with founders about listings you follow"
    >
      <MarketplaceInboxPanel mode="buyer" />
    </MarketplaceAppPageShell>
  );
}
