import { MarketplaceProfileAccountSection } from "@/components/marketplace/MarketplaceProfileAccountSection";

export default function BuyerProfilePage() {
  return (
    <div className="grid gap-4">
      <header>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your buyer desk account and preferences
        </p>
      </header>
      <MarketplaceProfileAccountSection />
    </div>
  );
}
