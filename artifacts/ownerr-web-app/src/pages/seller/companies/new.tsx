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
      layout="compact"
    >
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-mt-1 mb-1 w-fit px-0 text-muted-foreground hover:text-foreground"
      >
        <Link href={MARKETPLACE_ROUTES.sellerCompanies}>
          <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
          Back to companies
        </Link>
      </Button>
      <SellerAddStartupWizard />
    </MarketplaceAppPageShell>
  );
}
