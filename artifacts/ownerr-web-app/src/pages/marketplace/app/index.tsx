import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { resolveMarketplaceDeskRoles } from "@/lib/marketplace/service";
import { resolveMarketplaceAppEntry } from "@/lib/marketplace/roleGate";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";

export default function MarketplaceAppEntryPage() {
  const [, navigate] = useLocation();
  const { session, currentUser } = useAuth();

  useEffect(() => {
    if (!session?.user?.id) {
      navigate(MARKETPLACE_ROUTES.root, { replace: true });
      return;
    }
    void resolveMarketplaceDeskRoles(session.user.id).then(
      ({ hasBuyer, hasSeller }) => {
        const dest = resolveMarketplaceAppEntry({
          hasBuyer,
          hasSeller,
          metadataRole: currentUser?.role ?? null,
        });
        navigate(dest, { replace: true });
      },
    );
  }, [session, currentUser, navigate]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm font-bold text-muted-foreground">
      Opening Marketplace…
    </div>
  );
}
