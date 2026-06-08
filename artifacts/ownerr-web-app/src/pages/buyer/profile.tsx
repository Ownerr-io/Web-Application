import { MarketplaceAppPageShell } from "@/components/marketplace/MarketplaceAppPageShell";
import { MarketplaceProfileAccountSection } from "@/components/marketplace/MarketplaceProfileAccountSection";
import { AccountChangePasswordSection } from "@/components/auth/AccountChangePasswordSection";
import { useQuery } from "@tanstack/react-query";
import { fetchPersonVerificationProfile } from "@/lib/marketplace/personVerificationApi";
import { VerificationBadge } from "@/components/marketplace/VerificationBadge";

export default function BuyerProfilePage() {
  const { data: personProfile } = useQuery({
    queryKey: ["person-verification", "buyer"],
    queryFn: () => fetchPersonVerificationProfile("buyer"),
  });

  return (
    <MarketplaceAppPageShell
      kicker="Buyer desk"
      title="Profile"
      description="Your buyer desk account and preferences"
      headerActions={
        personProfile?.verification_status === "verified" ? (
          <VerificationBadge variant="buyer" />
        ) : null
      }
    >
      <MarketplaceProfileAccountSection />
      <AccountChangePasswordSection className="mt-6" />
    </MarketplaceAppPageShell>
  );
}
