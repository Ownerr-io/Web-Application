import { Link } from "wouter";
import { useOwnerrNetworkAuth } from "@/hooks/useOwnerrNetworkAuth";
import { MARKETING_SHELL_CLASS } from "@/lib/marketingShell";
import { PRODUCT_ROUTES } from "@/routing/routeRegistry";
import { computeNetworkScore } from "@/lib/ownerr-network/score";

export default function OwnerrNetworkProfilePage() {
  const { profile, networkProfile } = useOwnerrNetworkAuth();
  if (!profile) return null;

  const completion = networkProfile?.profile_completion_pct ?? 0;
  const score = computeNetworkScore({
    points: profile.points,
    total_referrals: profile.total_referrals,
    profile_completion_pct: completion,
    profile_verified: profile.profile_verified,
  });

  return (
    <div className={MARKETING_SHELL_CLASS + " desk-app-theme mx-auto max-w-2xl space-y-6"}>
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--terminal-lime)]">
          My profile
        </p>
        <h1 className="mt-1 text-2xl font-bold">@{profile.username}</h1>
        <p className="text-sm text-[color:var(--terminal-muted)]">{profile.email}</p>
      </header>

      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-[color:var(--terminal-muted)]">Display name</dt>
          <dd className="font-bold">{networkProfile?.display_name ?? profile.name}</dd>
        </div>
        <div>
          <dt className="text-[color:var(--terminal-muted)]">Type</dt>
          <dd className="font-bold">{networkProfile?.user_type ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[color:var(--terminal-muted)]">Skills</dt>
          <dd className="font-bold">{(networkProfile?.skill_tags ?? []).join(", ") || "—"}</dd>
        </div>
        <div>
          <dt className="text-[color:var(--terminal-muted)]">Work preference</dt>
          <dd className="font-bold">{networkProfile?.work_preference ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[color:var(--terminal-muted)]">Looking for</dt>
          <dd className="font-bold">{networkProfile?.goals ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[color:var(--terminal-muted)]">Reputation</dt>
          <dd className="font-bold text-[color:var(--terminal-lime)]">{score}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-3">
        <Link href={PRODUCT_ROUTES.ownerrNetworkShare(profile.username)} className="text-sm font-bold text-[color:var(--terminal-ochre)]">
          Public share page →
        </Link>
        {completion < 100 ? (
          <Link href={PRODUCT_ROUTES.ownerrNetworkOnboarding} className="text-sm font-bold text-[color:var(--terminal-muted)]">
            Finish onboarding
          </Link>
        ) : null}
      </div>
    </div>
  );
}
