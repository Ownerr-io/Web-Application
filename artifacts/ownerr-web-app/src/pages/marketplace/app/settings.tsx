import { RedirectToProductProfile } from "@/components/routing/RedirectToProductProfile";

/** Legacy URL — profile holds account settings. */
export default function MarketplaceAppSettingsPage() {
  return <RedirectToProductProfile product="marketplace" />;
}
