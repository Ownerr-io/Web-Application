import { MarketplaceAppPageShell } from "@/components/marketplace/MarketplaceAppPageShell";
import { PersonVerificationCenter } from "@/components/marketplace/PersonVerificationCenter";

export default function SellerPersonVerificationPage() {
  return (
    <MarketplaceAppPageShell
      kicker="Founder desk"
      title="Verification"
      description="Verify your profile for a Verified Founder badge (no government ID required)"
    >
      <PersonVerificationCenter deskRole="seller" />
    </MarketplaceAppPageShell>
  );
}
