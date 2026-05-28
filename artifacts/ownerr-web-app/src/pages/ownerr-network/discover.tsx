import { useEffect, useState } from "react";
import { Link } from "wouter";
import { BadgeCheck, Search, Share2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOwnerrNetworkAuth } from "@/hooks/useOwnerrNetworkAuth";
import { fetchDiscoverProfiles } from "@/lib/ownerr-network/api";
import { ownerrNetworkAvatarUrl } from "@/lib/ownerr-network/avatar";
import type { DiscoverProfile } from "@/lib/ownerr-network/types";
import { PRODUCT_ROUTES } from "@/routing/routeRegistry";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const filterControlClass =
  "h-10 min-w-[9rem] flex-1 rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)] px-3 text-sm text-[color:var(--terminal-display)]";

export default function OwnerrNetworkDiscoverPage() {
  const { toast } = useToast();
  const { profile } = useOwnerrNetworkAuth();
  const [rows, setRows] = useState<DiscoverProfile[]>([]);
  const [userType, setUserType] = useState("");
  const [skill, setSkill] = useState("");
  const [workPreference, setWorkPreference] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void fetchDiscoverProfiles({
      userType: userType || undefined,
      skill: skill || undefined,
      workPreference: workPreference || undefined,
      verifiedOnly,
    })
      .then((data) => {
        if (!profile?.id) {
          setRows(data);
          return;
        }
        setRows(
          data.filter(
            (r) =>
              r.user_id !== profile.id &&
              r.auth_user_id !== profile.auth_user_id &&
              r.username !== profile.username,
          ),
        );
      })
      .finally(() => setLoading(false));
  }, [
    userType,
    skill,
    workPreference,
    verifiedOnly,
    profile?.id,
    profile?.auth_user_id,
    profile?.username,
  ]);

  return (
    <div className="w-full max-w-none min-w-0 space-y-6 sm:space-y-8">
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--terminal-lime)]">
          Discover
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[color:var(--terminal-display)]">
          {profile ? `@${profile.username}` : "People"}
        </h1>
        <p className="text-sm text-[color:var(--terminal-muted)]">
          Browse completed profiles and connect with founders, builders, and
          operators.
        </p>
      </header>

      <section className="rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Search
            className="h-4 w-4 text-[color:var(--terminal-ochre)]"
            aria-hidden
          />
          <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
            Filters
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <select
            className={filterControlClass}
            value={userType}
            onChange={(e) => setUserType(e.target.value)}
          >
            <option value="">All types</option>
            <option>Freelancer</option>
            <option>Student</option>
            <option>Founder</option>
            <option>Job Seeker</option>
            <option>Recruiter</option>
          </select>
          <input
            className={cn(filterControlClass, "min-w-[12rem]")}
            placeholder="Skill or sector"
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
          />
          <select
            className={filterControlClass}
            value={workPreference}
            onChange={(e) => setWorkPreference(e.target.value)}
          >
            <option value="">Any work style</option>
            <option>Full remote</option>
            <option>Hybrid</option>
            <option>On-site</option>
          </select>
          <label className="flex h-10 items-center gap-2 rounded-[10px] border border-[color:var(--terminal-border)] bg-black/20 px-3 text-sm text-[color:var(--terminal-muted)]">
            <input
              type="checkbox"
              className="accent-[color:var(--terminal-lime)]"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
            />
            Verified only
          </label>
        </div>
      </section>

      {loading ? (
        <p className="text-sm text-[color:var(--terminal-muted)]">
          Loading profiles…
        </p>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center rounded-[12px] border border-dashed border-[color:var(--terminal-border)] px-6 py-14 text-center">
          <Users
            className="h-8 w-8 text-[color:var(--terminal-muted)]"
            aria-hidden
          />
          <p className="mt-3 text-sm font-bold text-[color:var(--terminal-display)]">
            No profiles match
          </p>
          <p className="mt-1 max-w-sm text-xs text-[color:var(--terminal-muted)]">
            Try clearing filters or check back as more members complete
            onboarding.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => (
            <DiscoverProfileCard
              key={p.user_id}
              profile={p}
              onShare={() => {
                const url = `${window.location.origin}${PRODUCT_ROUTES.ownerrNetworkShare(p.username)}`;
                void navigator.clipboard.writeText(url).then(
                  () => toast({ title: "Profile link copied" }),
                  () => toast({ title: "Copy failed", variant: "destructive" }),
                );
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DiscoverProfileCard({
  profile: p,
  onShare,
}: {
  profile: DiscoverProfile;
  onShare: () => void;
}) {
  const avatar = ownerrNetworkAvatarUrl({
    profile_image: p.profile_image,
    username: p.username,
    auth_user_id: p.auth_user_id,
  });
  const memberHref = PRODUCT_ROUTES.ownerrNetworkMember(p.username);

  return (
    <article className="flex h-full flex-col rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-5">
      <div className="flex items-start gap-3">
        <img
          src={avatar}
          alt=""
          className="h-12 w-12 shrink-0 rounded-full border border-[color:var(--terminal-border)] object-cover"
        />
        <div className="min-w-0 flex-1">
          <Link
            href={memberHref}
            className="truncate text-base font-bold text-[color:var(--terminal-display)] hover:text-[color:var(--terminal-lime)]"
          >
            @{p.username}
          </Link>
          <p className="truncate text-sm text-[color:var(--terminal-muted)]">
            {p.name}
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-[color:var(--terminal-ochre)]">
            {p.user_type ?? "Member"}
          </p>
        </div>
      </div>
      {p.skill_tags.length > 0 ? (
        <p className="mt-3 line-clamp-2 text-xs text-[color:var(--terminal-muted)]">
          {p.skill_tags.join(" · ")}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-bold text-[color:var(--terminal-lime)]">
          {p.network_score}
        </span>
        <span className="text-xs text-[color:var(--terminal-muted)]">
          reputation
        </span>
        {p.profile_verified ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-[color:var(--terminal-lime)]">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
            Verified
          </span>
        ) : null}
      </div>
      <div className="mt-auto flex flex-col gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full font-bold"
          asChild
        >
          <Link href={memberHref}>View profile</Link>
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full font-bold"
          onClick={onShare}
        >
          <Share2 className="mr-2 h-4 w-4" aria-hidden />
          Copy link
        </Button>
      </div>
    </article>
  );
}
