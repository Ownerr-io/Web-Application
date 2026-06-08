import { MarketplaceAppPageShell } from "@/components/marketplace/MarketplaceAppPageShell";
import { MarketplaceInboxPanel } from "@/components/marketplace/MarketplaceInboxPanel";

export default function SellerInboxPage() {
  return (
    <MarketplaceAppPageShell
      kicker="Founder desk"
      title="Inbox"
      description="Buyer conversations on your listings"
    >
      <MarketplaceInboxPanel mode="seller" />
    </MarketplaceAppPageShell>
  );
}
