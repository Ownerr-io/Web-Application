import { useEffect } from "react";
import { useLocation } from "wouter";
import { MarketingLayout } from "@/components/MarketingLayout";
import { OwnerrOsJoinScene } from "@/components/founder-os/OwnerrOsJoinScene";
import { captureReferralFromSearch, getStoredReferralAttribution } from "@/lib/founderReferral";
import { trackReferral } from "@/lib/founderService";
import { persistGetStartedProduct } from "@/lib/auth/getStartedIntent";
import { persistOwnerrOsDraft, peekOwnerrOsDraft } from "@/lib/auth/ownerrOsDraft";

export default function JoinReferralPage() {
  const [location] = useLocation();

  useEffect(() => {
    persistGetStartedProduct("ownerr_os");
    document.title = "Join OWNERR OS — Founder referral";
    const search = typeof window !== "undefined" ? window.location.search : "";
    const attr = captureReferralFromSearch(search);
    if (attr?.referralCode) {
      void trackReferral(attr.referralCode, "visit", attr.sourcePlatform);
      const existing = peekOwnerrOsDraft();
      persistOwnerrOsDraft({
        fullName: existing?.fullName ?? "",
        startupName: existing?.startupName ?? "",
        industry: existing?.industry ?? "SaaS",
        ideaDescription: existing?.ideaDescription ?? "",
        referralCode: attr.referralCode,
      });
    }
  }, [location]);

  const referralCode = getStoredReferralAttribution()?.referralCode ?? null;

  return (
    <MarketingLayout fullBleedMain hideFooter hideProductContext>
      <OwnerrOsJoinScene referralCode={referralCode} />
    </MarketingLayout>
  );
}
