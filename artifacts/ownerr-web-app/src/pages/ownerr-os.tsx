import { useEffect } from "react";
import { useLocation } from "wouter";
import { MarketingLayout } from "@/components/MarketingLayout";
import { FounderOsIntroScene } from "@/components/founder-os/FounderOsIntroScene";
import { captureReferralFromSearch } from "@/lib/founderReferral";
import { trackReferral } from "@/lib/founderService";
import { AUTH_ROUTES, PRODUCT_ROUTES } from "@/routing/routeRegistry";

export default function OwnerrOsPage() {
  const [location, navigate] = useLocation();

  useEffect(() => {
    const search = typeof window !== "undefined" ? window.location.search : "";
    const params = new URLSearchParams(
      search.startsWith("?") ? search : `?${search}`,
    );
    if (params.get("ref")?.trim()) {
      navigate(
        `${PRODUCT_ROUTES.ownerrOsJoin}${search.startsWith("?") ? search : `?${search}`}`,
        {
          replace: true,
        },
      );
      return;
    }
    const attr = captureReferralFromSearch(search);
    if (attr?.referralCode) {
      void trackReferral(attr.referralCode, "visit", attr.sourcePlatform);
    }
  }, [location, navigate]);

  return (
    <MarketingLayout fullBleedMain hideProductContext>
      <FounderOsIntroScene
        onContinue={() => navigate(`${AUTH_ROUTES.start}?product=ownerr-os`)}
        secondaryCtaHref={PRODUCT_ROUTES.ownerrOsJoin}
        secondaryCtaLabel="Join OWNERR OS"
      />
    </MarketingLayout>
  );
}
