import { Link } from "wouter";
import { useOwnerrNetworkAuth } from "@/hooks/useOwnerrNetworkAuth";
import { PRODUCT_ROUTES } from "@/routing/routeRegistry";
import { computeNetworkScore } from "@/lib/ownerr-network/score";

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
    <div className="w-full max-w-none min-w-0 space-y-6 sm:space-y-8">
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--terminal-lime)]">
          Dashboard
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[color:var(--terminal-display)]">
          @{profile.username}
        </h1>
        <p className="text-sm text-[color:var(--terminal-muted)]">
          {profile.name}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
            Profile completion
          </p>
          <p className="mt-1 text-3xl font-bold text-[color:var(--terminal-lime)]">
            {completion}%
          </p>
          <Link
            href={PRODUCT_ROUTES.ownerrNetworkProfile}
            className="mt-2 inline-block text-sm font-bold text-[color:var(--terminal-ochre)]"
          >
            {completion >= 100 ? "View profile →" : "Complete profile →"}
          </Link>
        </div>
        <div className="rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
            Reputation
          </p>
          <p className="mt-1 text-3xl font-bold">{reputation}</p>
          <p className="mt-2 text-xs text-[color:var(--terminal-muted)]">
            Points, referrals, profile & verification
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Link
          href={PRODUCT_ROUTES.ownerrNetworkDiscover}
          className="rounded-[12px] border border-[color:var(--terminal-border)] p-4 transition-colors hover:border-[color:var(--terminal-ochre)]/50"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
            Discover
          </p>
          <p className="mt-2 text-sm font-bold text-[color:var(--terminal-ochre)]">
            Find people →
          </p>
        </Link>
        <Link
          href={PRODUCT_ROUTES.ownerrNetworkReferrals}
          className="rounded-[12px] border border-[color:var(--terminal-border)] p-4 transition-colors hover:border-[color:var(--terminal-ochre)]/50"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
            Referrals
          </p>
          <p className="mt-1 text-2xl font-bold">{profile.total_referrals}</p>
        </Link>
        <Link
          href={PRODUCT_ROUTES.ownerrNetworkWallet}
          className="rounded-[12px] border border-[color:var(--terminal-border)] p-4 transition-colors hover:border-[color:var(--terminal-ochre)]/50"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
            Credits
          </p>
          <p className="mt-1 text-2xl font-bold text-[color:var(--terminal-lime)]">
            {profile.points}
          </p>
        </Link>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href={PRODUCT_ROUTES.ownerrNetworkReferrals}
          className="text-sm font-bold text-[color:var(--terminal-ochre)]"
        >
          Share profile
        </Link>
        <Link
          href={PRODUCT_ROUTES.ownerrNetworkLeaderboard}
          className="text-sm font-bold text-[color:var(--terminal-muted)]"
        >
          Leaderboard
        </Link>
      </div>
    </div>
  );
}
