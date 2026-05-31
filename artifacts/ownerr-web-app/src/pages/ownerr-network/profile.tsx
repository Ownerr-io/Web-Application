import type { ReactNode } from "react";
import { Link } from "wouter";
import { BadgeCheck, LogOut, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOwnerrNetworkAuth } from "@/hooks/useOwnerrNetworkAuth";
import { PRODUCT_ROUTES } from "@/routing/routeRegistry";
import { computeNetworkScore } from "@/lib/ownerr-network/score";
import { ownerrNetworkAvatarUrl } from "@/lib/ownerr-network/avatar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { PUBLIC_ROUTES } from "@/routing/routeRegistry";
import { AccountChangePasswordSection } from "@/components/auth/AccountChangePasswordSection";

function ProfileFactCard({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
        {label}
      </p>
      <div className="mt-2 text-sm font-bold text-[color:var(--terminal-display)]">
        {children}
      </div>
    </div>
  );
}

export default function OwnerrNetworkProfilePage() {
  const { toast } = useToast();
  const { logout } = useAuth();
  const { profile, networkProfile } = useOwnerrNetworkAuth();
  if (!profile) return null;

  const completion = networkProfile?.profile_completion_pct ?? 0;
  const score = computeNetworkScore({
    points: profile.points,
    total_referrals: profile.total_referrals,
    profile_completion_pct: completion,
    profile_verified: profile.profile_verified,
  });
  const displayName = networkProfile?.display_name ?? profile.name;
  const skills = networkProfile?.skill_tags ?? [];
  const avatarSrc = ownerrNetworkAvatarUrl(profile);
  const username = profile.username;

  async function copyPublicProfile() {
    const url = `${window.location.origin}${PRODUCT_ROUTES.ownerrNetworkShare(username)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Public profile link copied" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  }

  return (
    <div className="w-full max-w-none min-w-0 space-y-6 sm:space-y-8">
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--terminal-lime)]">
          Profile
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[color:var(--terminal-display)]">
          @{profile.username}
        </h1>
        <p className="text-sm text-[color:var(--terminal-muted)]">
          {displayName}
        </p>
      </header>

      <section className="flex flex-col gap-4 rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-5 sm:flex-row sm:items-center">
        <img
          src={avatarSrc}
          alt=""
          className="h-20 w-20 shrink-0 rounded-full border border-[color:var(--terminal-border)] object-cover"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-lg font-bold text-[color:var(--terminal-display)]">
            {displayName}
          </p>
          <p className="text-sm text-[color:var(--terminal-muted)]">
            {profile.email}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {profile.profile_verified ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[color:var(--terminal-lime)]">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                Verified
              </span>
            ) : (
              <span className="text-xs font-bold text-[color:var(--terminal-muted)]">
                Not verified
              </span>
            )}
            <span className="text-xs text-[color:var(--terminal-muted)]">
              ·
            </span>
            <span className="text-xs font-bold text-[color:var(--terminal-ochre)]">
              {networkProfile?.user_type ?? "Member"}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-stretch">
          <Button
            type="button"
            variant="outline"
            className="font-bold"
            onClick={() => void copyPublicProfile()}
          >
            <Share2 className="mr-2 h-4 w-4" aria-hidden />
            Copy public link
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="font-bold"
            asChild
          >
            <Link href={PRODUCT_ROUTES.ownerrNetworkReferrals}>
              Referral tools →
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
            Profile completion
          </p>
          <p className="mt-1 text-3xl font-bold text-[color:var(--terminal-lime)]">
            {completion}%
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[color:var(--terminal-border)]/60">
            <div
              className="h-full rounded-full bg-[color:var(--terminal-lime)] transition-[width]"
              style={{ width: `${Math.min(100, Math.max(0, completion))}%` }}
            />
          </div>
          {completion < 100 ? (
            <Link
              href={PRODUCT_ROUTES.ownerrNetworkOnboarding}
              className="mt-3 inline-block text-sm font-bold text-[color:var(--terminal-ochre)]"
            >
              Finish onboarding →
            </Link>
          ) : (
            <p className="mt-3 text-xs text-[color:var(--terminal-muted)]">
              Profile is complete for discovery.
            </p>
          )}
        </div>
        <div className="rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
            Reputation
          </p>
          <p className="mt-1 text-3xl font-bold text-[color:var(--terminal-display)]">
            {score}
          </p>
          <p className="mt-2 text-xs text-[color:var(--terminal-muted)]">
            {profile.points} pts · {profile.total_referrals} referrals
          </p>
          <Link
            href={PRODUCT_ROUTES.ownerrNetworkWallet}
            className="mt-3 inline-block text-sm font-bold text-[color:var(--terminal-ochre)]"
          >
            Open wallet →
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
          About you
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ProfileFactCard label="Display name">{displayName}</ProfileFactCard>
          <ProfileFactCard label="Member type">
            {networkProfile?.user_type ?? "—"}
          </ProfileFactCard>
          <ProfileFactCard label="Work preference">
            {networkProfile?.work_preference ?? "—"}
          </ProfileFactCard>
          <ProfileFactCard label="Experience">
            {networkProfile?.experience_level ?? "—"}
          </ProfileFactCard>
          <ProfileFactCard label="Availability">
            {networkProfile?.availability ?? "—"}
          </ProfileFactCard>
          <ProfileFactCard label="Seriousness">
            {networkProfile?.seriousness_score ?? "—"}
          </ProfileFactCard>
          <ProfileFactCard label="Looking for">
            <span className="font-normal leading-relaxed text-[color:var(--terminal-muted)]">
              {networkProfile?.goals?.trim() || "—"}
            </span>
          </ProfileFactCard>
          <ProfileFactCard label="Skills">
            {skills.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5 font-normal">
                {skills.map((tag) => (
                  <li
                    key={tag}
                    className={cn(
                      "rounded-md border border-[color:var(--terminal-border)] bg-black/20 px-2 py-0.5 text-xs font-bold text-[color:var(--terminal-display)]",
                    )}
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            ) : (
              "—"
            )}
          </ProfileFactCard>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href={PRODUCT_ROUTES.ownerrNetworkDiscover}
          className="text-sm font-bold text-[color:var(--terminal-muted)]"
        >
          Discover people
        </Link>
        <Link
          href={PRODUCT_ROUTES.ownerrNetworkLeaderboard}
          className="text-sm font-bold text-[color:var(--terminal-muted)]"
        >
          Leaderboard
        </Link>
      </div>

      <AccountChangePasswordSection variant="terminal" />

      <section className="rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
          Account
        </h2>
        <p className="text-sm text-[color:var(--terminal-muted)]">
          To use another OWNERR product, log out and open it from{" "}
          <Link
            href={PUBLIC_ROUTES.products}
            className="font-bold text-[color:var(--terminal-ochre)] hover:underline"
          >
            Products
          </Link>
          .
        </p>
        <Button
          type="button"
          variant="destructive"
          className="font-bold"
          onClick={() => void logout()}
        >
          <LogOut className="mr-2 h-4 w-4" aria-hidden />
          Log out
        </Button>
      </section>
    </div>
  );
}
