import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Crown, Trophy } from "lucide-react";
import { useOwnerrNetworkAuth } from "@/hooks/useOwnerrNetworkAuth";
import { ownerrNetworkAvatarUrl } from "@/lib/ownerr-network/avatar";
import { PRODUCT_ROUTES } from "@/routing/routeRegistry";
import {
  fetchLeaderboard,
  fetchWeeklyLeaderboard,
} from "@/lib/ownerr-network/api";
import type { LeaderboardEntry } from "@/lib/ownerr-network/types";
import { cn } from "@/lib/utils";

type Period = "week" | "all";

export default function OwnerrNetworkLeaderboardPage() {
  const { profile } = useOwnerrNetworkAuth();
  const [period, setPeriod] = useState<Period>("all");
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Ownerr Network Leaderboard | OWNERR";
    setLoading(true);
    const load = period === "week" ? fetchWeeklyLeaderboard : fetchLeaderboard;
    void load(25)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [period]);

  const myRank = profile ? rows.findIndex((r) => r.id === profile.id) : -1;

  return (
    <div className="w-full max-w-none min-w-0 space-y-6 sm:space-y-8">
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--terminal-lime)]">
          Leaderboard
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[color:var(--terminal-display)]">
          {profile ? `@${profile.username}` : "Rankings"}
        </h1>
        <p className="text-sm text-[color:var(--terminal-muted)]">
          Top members by points {period === "week" ? "this week" : "all time"}.
        </p>
      </header>

      {profile && myRank >= 0 ? (
        <div className="rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
            Your rank
          </p>
          <p className="mt-1 text-3xl font-bold text-[color:var(--terminal-lime)]">
            #{myRank + 1}
          </p>
          <p className="mt-1 text-sm text-[color:var(--terminal-muted)]">
            {profile.points} points
          </p>
        </div>
      ) : null}

      <section className="rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trophy
              className="h-4 w-4 text-[color:var(--terminal-ochre)]"
              aria-hidden
            />
            <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
              Period
            </p>
          </div>
          <div className="flex gap-2">
            {(["week", "all"] as const).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={period === p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "brand-segment-btn px-4 py-2 tracking-widest",
                  period === p && "brand-segment-btn--active",
                )}
              >
                <span className="brand-segment-btn-label">
                  {p === "week" ? "This week" : "All time"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {loading ? (
        <p className="text-sm text-[color:var(--terminal-muted)]">
          Loading rankings…
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-[color:var(--terminal-border)] px-6 py-12 text-center text-sm text-[color:var(--terminal-muted)]">
          No leaderboard entries yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((u, i) => (
            <li
              key={u.id}
              className={cn(
                "flex items-center justify-between gap-3 rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 px-4 py-3",
                profile?.id === u.id &&
                  "border-[color:var(--terminal-lime)]/40",
              )}
            >
              <span className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex w-8 shrink-0 justify-center">
                  {i < 3 ? (
                    <Crown
                      className={cn(
                        "h-5 w-5",
                        i === 0
                          ? "text-[color:var(--terminal-ochre)]"
                          : "text-[color:var(--terminal-muted)]",
                      )}
                      aria-hidden
                    />
                  ) : (
                    <span className="font-mono text-xs font-bold text-[color:var(--terminal-muted)]">
                      {i + 1}
                    </span>
                  )}
                </span>
                <img
                  src={ownerrNetworkAvatarUrl(u)}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full border border-[color:var(--terminal-border)] object-cover"
                />
                <span className="min-w-0">
                  <Link
                    href={PRODUCT_ROUTES.ownerrNetworkMember(u.username)}
                    className="block truncate font-bold text-[color:var(--terminal-display)] hover:text-[color:var(--terminal-lime)]"
                  >
                    @{u.username}
                  </Link>
                  <span className="block truncate text-xs text-[color:var(--terminal-muted)]">
                    {u.name}
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-mono text-sm font-bold text-[color:var(--terminal-lime)]">
                  {u.points} pts
                </span>
                {u.total_referrals > 0 ? (
                  <span className="text-[10px] text-[color:var(--terminal-muted)]">
                    {u.total_referrals} referrals
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
