import { Link } from "wouter";
import { useOwnerrNetworkAuth } from "@/hooks/useOwnerrNetworkAuth";
import { PRODUCT_ROUTES } from "@/routing/routeRegistry";
import { computeNetworkScore } from "@/lib/ownerr-network/score";
import { cn } from "@/lib/utils";

export default function OwnerrNetworkDashboardPage() {
  const { profile, networkProfile } = useOwnerrNetworkAuth();

  if (!profile) return null;

  const completion = networkProfile?.profile_completion_pct ?? 0;
  const reputation = computeNetworkScore({
    points: profile.points,
    total_referrals: profile.total_referrals,
    profile_completion_pct: completion,
    profile_verified: profile.profile_verified,
  });

  return (
    <div className="w-full max-w-none min-w-0 space-y-8">
      <header className="brand-page-header space-y-2">
        <p className="brand-eyebrow">Dashboard</p>
        <h1 className="brand-page-title text-2xl font-bold">
          @{profile.username}
        </h1>
        <p className="text-sm text-muted-foreground">{profile.name}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="brand-kpi-card rounded-xl p-5 shadow-none">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-orange/90">
            Profile completion
          </p>
          <p className="mt-1 text-3xl font-bold brand-kpi-value--success">
            {completion}%
          </p>
          <Link
            href={PRODUCT_ROUTES.ownerrNetworkProfile}
            className="mt-2 inline-block text-sm font-bold text-brand-orange hover:text-brand-lime"
          >
            {completion >= 100 ? "View profile →" : "Complete profile →"}
          </Link>
        </div>
        <div className="brand-kpi-card rounded-xl p-5 shadow-none">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-orange/90">
            Reputation
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{reputation}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Points, referrals, profile & verification
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Link
          href={PRODUCT_ROUTES.ownerrNetworkDiscover}
          className={cn(
            "brand-panel-card rounded-xl p-4 shadow-none transition-colors",
            "hover:border-[color:color-mix(in_srgb,var(--brand-orange)_45%,var(--terminal-border))]",
          )}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-brand-orange/90">
            Discover
          </p>
          <p className="mt-2 text-sm font-bold text-brand-lime">
            Find people →
          </p>
        </Link>
        <Link
          href={PRODUCT_ROUTES.ownerrNetworkReferrals}
          className={cn(
            "brand-panel-card rounded-xl p-4 shadow-none transition-colors",
            "hover:border-[color:color-mix(in_srgb,var(--brand-orange)_45%,var(--terminal-border))]",
          )}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-brand-orange/90">
            Referrals
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {profile.total_referrals}
          </p>
        </Link>
        <Link
          href={PRODUCT_ROUTES.ownerrNetworkWallet}
          className={cn(
            "brand-panel-card rounded-xl p-4 shadow-none transition-colors",
            "hover:border-[color:color-mix(in_srgb,var(--brand-orange)_45%,var(--terminal-border))]",
          )}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-brand-orange/90">
            Credits
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums brand-kpi-value--success">
            {profile.points}
          </p>
        </Link>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href={PRODUCT_ROUTES.ownerrNetworkReferrals}
          className="text-sm font-bold text-brand-orange hover:text-brand-lime"
        >
          Share profile
        </Link>
        <Link
          href={PRODUCT_ROUTES.ownerrNetworkLeaderboard}
          className="text-sm font-bold text-muted-foreground hover:text-brand-orange"
        >
          Leaderboard
        </Link>
      </div>
    </div>
  );
}
