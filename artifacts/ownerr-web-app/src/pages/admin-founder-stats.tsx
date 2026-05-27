import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchFounderAnalytics } from "@/lib/founderService";
import type { FounderAnalytics } from "@/lib/founderTypes";

export default function AdminFounderStatsPage() {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FounderAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const analytics = await fetchFounderAnalytics(key.trim() || undefined);
      setData(analytics);
    } catch {
      setError("Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount (key entered later via form)
  }, []);

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-10">
      <h1 className="text-2xl font-bold text-[color:var(--terminal-fg)]">Founder viral analytics</h1>
      <p className="mt-2 text-sm text-[color:var(--terminal-muted)]">
        Internal view. Set the admin key in Supabase (
        <code className="text-[color:var(--terminal-ochre)]">founder_admin_secrets</code>
        ) and enter the same value below.
      </p>
      <div className="mt-6 flex max-w-md gap-2">
        <Input
          type="password"
          placeholder="Admin key (optional for local IDB)"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="border-[color:var(--terminal-border)] bg-[color:var(--terminal-bg)]"
        />
        <Button
          type="button"
          onClick={load}
          disabled={loading}
          className="bg-[color:var(--terminal-ochre)] font-bold text-[color:var(--brand-accent-ink)]"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      {data ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <StatCard label="Founders submitted" value={data.totalFounders} />
          <StatCard label="Referral clicks" value={data.totalReferralClicks} />
          <StatCard label="Conversions" value={data.totalConversions} />
        </div>
      ) : null}
      {data?.topFounders.length ? (
        <section className="mt-10">
          <h2 className="text-lg font-bold">Top viral founders</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {data.topFounders.map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap justify-between gap-2 rounded-[10px] border border-[color:var(--terminal-border)] px-3 py-2"
              >
                <span>
                  {f.founderName} · {f.startupName}
                </span>
                <span className="font-mono text-[color:var(--terminal-muted)]">
                  visits {f.visitCount} · signups {f.referralSignupCount} · score {f.viralScore}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {data?.topStartups.length ? (
        <section className="mt-10">
          <h2 className="text-lg font-bold">Most shared startups</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {data.topStartups.map((s) => (
              <li
                key={s.startupName}
                className="flex justify-between rounded-[10px] border border-[color:var(--terminal-border)] px-3 py-2"
              >
                <span>{s.startupName}</span>
                <span className="text-[color:var(--terminal-muted)]">
                  {s.founders} founders · {s.visitCount} visits
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {data?.trafficSources.length ? (
        <section className="mt-10">
          <h2 className="text-lg font-bold">Traffic sources</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {data.trafficSources.map((s) => (
              <li
                key={s.sourcePlatform}
                className="flex justify-between rounded-[10px] border border-[color:var(--terminal-border)] px-3 py-2"
              >
                <span>{s.sourcePlatform}</span>
                <span>{s.count}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)] p-4">
      <p className="text-xs uppercase tracking-widest text-[color:var(--terminal-muted)]">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[color:var(--terminal-ochre)]">{value}</p>
    </div>
  );
}
