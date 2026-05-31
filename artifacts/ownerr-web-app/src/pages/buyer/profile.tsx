import { MarketplaceAppPageShell } from "@/components/marketplace/MarketplaceAppPageShell";
import { MarketplaceProfileAccountSection } from "@/components/marketplace/MarketplaceProfileAccountSection";
import { AccountChangePasswordSection } from "@/components/auth/AccountChangePasswordSection";

export default function BuyerProfilePage() {
  return (
    <MarketplaceAppPageShell
      kicker="Buyer desk"
      title="Profile"
      description="Your buyer desk account and preferences"
    >
      <MarketplaceProfileAccountSection />
      <AccountChangePasswordSection className="mt-6" />
    </MarketplaceAppPageShell>
  );
}
