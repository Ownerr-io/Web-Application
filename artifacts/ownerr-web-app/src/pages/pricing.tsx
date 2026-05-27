import { Link } from 'wouter';
import { MarketingLayout } from '@/components/MarketingLayout';
import { PUBLIC_ROUTES } from '@/routing/routeRegistry';
import { authRegisterHref } from '@/lib/auth/routes';

export default function PricingPage() {
  return (
    <MarketingLayout hideProductContext>
      <div className="landing-terminal-palette saas-section-shell py-16 md:py-24">
        <p className="luxury-kicker">Pricing</p>
        <h1 className="marketing-hero-title mt-2">
          <span className="platform-gradient-text">Simple plans</span> for operators and teams
        </h1>
        <p className="marketing-lead mt-4 max-w-xl">
          Marketplace discovery is public. Product apps and workspace tools unlock with an OWNERR account.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href={authRegisterHref()}
            className="btn-platform-gradient inline-flex h-11 items-center justify-center rounded-[10px] px-6 text-sm font-bold"
          >
            Get Started
          </Link>
          <Link
            href={PUBLIC_ROUTES.contact}
            className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[color:var(--terminal-border)] px-6 text-sm font-semibold"
          >
            Contact sales
          </Link>
        </div>
      </div>
    </MarketingLayout>
  );
}
