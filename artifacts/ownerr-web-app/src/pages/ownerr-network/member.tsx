import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { ArrowLeft, BadgeCheck, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOwnerrNetworkAuth } from "@/hooks/useOwnerrNetworkAuth";
import { fetchPublicProfileByUsername } from "@/lib/ownerr-network/api";
import { ownerrNetworkAvatarUrl } from "@/lib/ownerr-network/avatar";
import type { LeaderboardEntry } from "@/lib/ownerr-network/types";
import { PRODUCT_ROUTES } from "@/routing/routeRegistry";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function OwnerrNetworkMemberPage() {
  const { username } = useParams<{ username: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { profile: me } = useOwnerrNetworkAuth();
  const [member, setMember] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    if (me?.username && me.username === username) {
      navigate(PRODUCT_ROUTES.ownerrNetworkProfile, { replace: true });
      return;
    }
    setLoading(true);
    void fetchPublicProfileByUsername(username)
      .then(setMember)
      .finally(() => setLoading(false));
  }, [username, me?.username, navigate]);

  if (!username) return null;

  if (loading) {
    return (
      <div className="w-full max-w-none min-w-0 space-y-6 sm:space-y-8">
        <p className="text-sm text-[color:var(--terminal-muted)]">
          Loading profile…
        </p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="w-full max-w-none min-w-0 space-y-6 sm:space-y-8">
        <Link
          href={PRODUCT_ROUTES.ownerrNetworkDiscover}
          className="inline-flex items-center gap-2 text-sm font-bold text-[color:var(--terminal-ochre)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to discover
        </Link>
        <p className="text-sm text-[color:var(--terminal-muted)]">
          Profile not found.
        </p>
      </div>
    );
  }

  const avatarSrc = ownerrNetworkAvatarUrl(member);
  const skills = member.skill_tags ?? [];

  async function copyPublicLink() {
    const url = `${window.location.origin}${PRODUCT_ROUTES.ownerrNetworkShare(member!.username)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Public profile link copied" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  }

  return (
    <div className="w-full max-w-none min-w-0 space-y-6 sm:space-y-8">
      <Link
        href={PRODUCT_ROUTES.ownerrNetworkDiscover}
        className="inline-flex items-center gap-2 text-sm font-bold text-[color:var(--terminal-ochre)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Discover
      </Link>

      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--terminal-lime)]">
          Member
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[color:var(--terminal-display)]">
          @{member.username}
        </h1>
        <p className="text-sm text-[color:var(--terminal-muted)]">
          {member.name}
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
            {member.name}
          </p>
          <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--terminal-ochre)]">
            {member.user_type ?? "Member"}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>
              <span className="font-bold text-[color:var(--terminal-lime)]">
                {member.network_score ?? member.points}
              </span>
              <span className="text-[color:var(--terminal-muted)]">
                {" "}
                reputation
              </span>
            </span>
            <span className="text-[color:var(--terminal-muted)]">
              {member.points} credits
            </span>
            <span className="text-[color:var(--terminal-muted)]">
              {member.total_referrals} referrals
            </span>
            {member.profile_verified ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[color:var(--terminal-lime)]">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                Verified
              </span>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0 font-bold"
          onClick={() => void copyPublicLink()}
        >
          <Share2 className="mr-2 h-4 w-4" aria-hidden />
          Copy public link
        </Button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <MemberFact label="Work preference" value={member.work_preference} />
        <MemberFact label="Experience" value={member.experience_level} />
        <MemberFact label="Availability" value={member.availability} />
        <MemberFact
          label="Profile completion"
          value={
            member.profile_completion_pct != null
              ? `${member.profile_completion_pct}%`
              : undefined
          }
        />
        <MemberFact
          label="Looking for"
          value={member.goals}
          className="sm:col-span-2"
        />
        <div className="rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-5 sm:col-span-2">
          <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
            Skills
          </p>
          {skills.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {skills.map((tag) => (
                <li
                  key={tag}
                  className="rounded-md border border-[color:var(--terminal-border)] bg-black/20 px-2 py-0.5 text-xs font-bold"
                >
                  {tag}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm font-bold text-[color:var(--terminal-display)]">
              —
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function MemberFact({
  label,
  value,
  className,
}: {
  label: string;
  value?: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-5",
        className,
      )}
    >
      <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold text-[color:var(--terminal-display)]">
        {value?.trim() || "—"}
      </p>
    </div>
  );
}
