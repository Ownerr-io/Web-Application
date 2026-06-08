import { MarketplaceAppPageShell } from "@/components/marketplace/MarketplaceAppPageShell";
import { PersonVerificationCenter } from "@/components/marketplace/PersonVerificationCenter";

export default function BuyerVerificationPage() {
  return (
    <MarketplaceAppPageShell
      kicker="Buyer desk"
      title="Verification"
      description="Verify your profile to earn a Verified Buyer badge (no government ID required)"
    >
      <PersonVerificationCenter deskRole="buyer" />
    </MarketplaceAppPageShell>
  );
}
