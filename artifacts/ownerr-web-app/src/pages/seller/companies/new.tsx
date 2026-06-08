import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { MarketplaceAppPageShell } from "@/components/marketplace/MarketplaceAppPageShell";
import { SellerAddStartupWizard } from "@/components/marketplace/SellerAddStartupWizard";
import { Button } from "@/components/ui/button";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";

export default function SellerAddStartupPage() {
  return (
    <MarketplaceAppPageShell
      kicker="Seller desk"
      title="Add startup"
      description="Submit accurate profile details. Verification checks run separately before publish."
      headerActions={
        <Button asChild variant="outline" size="sm">
          <Link href={MARKETPLACE_ROUTES.sellerCompanies}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
            Companies
          </Link>
        </Button>
      }
    >
      <SellerAddStartupWizard />
    </MarketplaceAppPageShell>
  );
}
