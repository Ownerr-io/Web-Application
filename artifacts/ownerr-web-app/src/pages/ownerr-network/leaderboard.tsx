import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import { MARKETING_SHELL_CLASS } from "@/lib/marketingShell";
import { PRODUCT_ROUTES } from "@/routing/routeRegistry";
import { fetchLeaderboard, fetchWeeklyLeaderboard } from "@/lib/ownerr-network/api";
import type { LeaderboardEntry } from "@/lib/ownerr-network/types";
import { cn } from "@/lib/utils";

type Period = "week" | "all";

export default function UnemployedLeaderboardPage() {
  const [period, setPeriod] = useState<Period>("all");
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    document.title = "Ownerr Network Leaderboard | OWNERR";
    const load = period === "week" ? fetchWeeklyLeaderboard : fetchLeaderboard;
    void load(25)
      .then(setRows)
      .catch(() => setRows([]));
  }, [period]);

  return (
      <div className={MARKETING_SHELL_CLASS + " desk-app-theme mx-auto max-w-2xl"}>
        <Link href={PRODUCT_ROUTES.ownerrNetworkDashboard} className="text-xs font-bold text-[color:var(--terminal-ochre)]">
          Back to dashboard
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-[color:var(--terminal-display)]">Leaderboard</h1>
        <div className="mt-4 flex gap-2">
          {(["week", "all"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-[10px] px-4 py-2 text-xs font-black uppercase tracking-widest",
                period === p
                  ? "bg-[color:var(--terminal-ochre)] text-[color:var(--brand-accent-ink)]"
                  : "border border-[color:var(--terminal-border)] text-[color:var(--terminal-muted)]",
              )}
            >
              {p === "week" ? "This week" : "All time"}
            </button>
          ))}
        </div>
        <ul className="mt-8 space-y-2">
          {rows.map((u, i) => (
            <motion.li
              key={u.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/70 px-4 py-3"
            >
              <span className="flex items-center gap-3 font-bold">
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
                  <span className="w-5 text-center font-mono text-xs text-[color:var(--terminal-muted)]">
                    {i + 1}
                  </span>
                )}
                <Link href={`/share/network/${u.username}`} className="hover:text-[color:var(--terminal-lime)]">
                  @{u.username}
                </Link>
              </span>
              <span className="font-mono text-sm text-[color:var(--terminal-lime)]">{u.points} pts</span>
            </motion.li>
          ))}
        </ul>
      </div>
  );
}
