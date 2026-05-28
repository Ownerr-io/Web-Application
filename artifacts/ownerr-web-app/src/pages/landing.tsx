import { LandingHeroSaaS } from "@/components/landing/saas/LandingHeroSaaS";
import { LandingSocialProof } from "@/components/landing/saas/LandingSocialProof";
import { LandingProductShowcase } from "@/components/landing/saas/LandingProductShowcase";
import { LandingHowItWorksSaaS } from "@/components/landing/saas/LandingHowItWorksSaaS";
import { LandingFeaturesBento } from "@/components/landing/saas/LandingFeaturesBento";
import { LandingFinalCta } from "@/components/landing/saas/LandingFinalCta";

/**
 * Premium SaaS landing — marketing shell + footer come from App route wrapper (MarketingLayout).
 */
export default function Landing() {
  return (
    <div className="landing-saas-page">
      <LandingHeroSaaS />
      <LandingSocialProof />
      <LandingProductShowcase />
      <LandingHowItWorksSaaS />
      <LandingFeaturesBento />
      <LandingFinalCta />
    </div>
  );
}
