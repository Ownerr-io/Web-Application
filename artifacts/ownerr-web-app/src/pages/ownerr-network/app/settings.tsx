import { Link } from "wouter";
import { ProductSettingsShell } from "@/components/settings/ProductSettingsShell";
import { useOwnerrNetwork } from "@/context/ownerr-network/OwnerrNetworkProvider";
import { PRODUCT_ROUTES } from "@/routing/routeRegistry";

export default function OwnerrNetworkAppSettingsPage() {
  const { profile } = useOwnerrNetwork();

  return (
    <ProductSettingsShell product="ownerr-network" title="Ownerr Network settings">
      <div className="space-y-4">
        {profile ? (
          <>
            <p className="text-lg font-bold">@{profile.username}</p>
            <p className="text-sm text-muted-foreground">{profile.name}</p>
            <p className="text-sm text-muted-foreground">
              {profile.points} credits · {profile.total_referrals} referrals
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href={PRODUCT_ROUTES.ownerrNetworkDashboard}>Open dashboard</Link>
              <Link href={PRODUCT_ROUTES.ownerrNetworkReferrals}>Referrals</Link>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link href={PRODUCT_ROUTES.ownerrNetworkOnboarding}>Finish setup</Link>
          </p>
        )}
      </div>
    </ProductSettingsShell>
  );
}
