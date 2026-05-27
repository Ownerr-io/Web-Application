import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { fetchDiscoverProfiles } from "@/lib/ownerr-network/api";
import type { DiscoverProfile } from "@/lib/ownerr-network/types";
import { MARKETING_SHELL_CLASS } from "@/lib/marketingShell";
import { PRODUCT_ROUTES } from "@/routing/routeRegistry";

export default function OwnerrNetworkDiscoverPage() {
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
      .then(setRows)
      .finally(() => setLoading(false));
  }, [userType, skill, workPreference, verifiedOnly]);

  return (
    <div className={MARKETING_SHELL_CLASS + " desk-app-theme mx-auto max-w-5xl space-y-6"}>
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--terminal-lime)]">
          Discover
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[color:var(--terminal-display)]">People</h1>
        <p className="text-sm text-[color:var(--terminal-muted)]">
          Browse completed profiles. Simple filters — no matching engine yet.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <select
          className="h-9 rounded-md border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)] px-2 text-sm"
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
          className="h-9 rounded-md border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)] px-2 text-sm"
          placeholder="Skill / sector"
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
        />
        <select
          className="h-9 rounded-md border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)] px-2 text-sm"
          value={workPreference}
          onChange={(e) => setWorkPreference(e.target.value)}
        >
          <option value="">Remote / local</option>
          <option>Full remote</option>
          <option>Hybrid</option>
          <option>On-site</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} />
          Verified only
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-[color:var(--terminal-muted)]">Loading…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p) => (
            <article
              key={p.user_id}
              className="rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-4"
            >
              <p className="text-lg font-bold">@{p.username}</p>
              <p className="text-sm text-[color:var(--terminal-muted)]">{p.name}</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-widest text-[color:var(--terminal-ochre)]">
                {p.user_type ?? "Member"}
              </p>
              {p.skill_tags.length > 0 ? (
                <p className="mt-2 text-xs text-[color:var(--terminal-muted)]">{p.skill_tags.join(" · ")}</p>
              ) : null}
              <p className="mt-3 text-sm">
                Score <span className="font-bold text-[color:var(--terminal-lime)]">{p.network_score}</span>
                {p.profile_verified ? " · verified" : ""}
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                <Link href={PRODUCT_ROUTES.ownerrNetworkShare(p.username)}>Share profile</Link>
              </Button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
