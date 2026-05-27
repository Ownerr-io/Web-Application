import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOwnerrNetworkAuth } from "@/hooks/useOwnerrNetworkAuth";
import { MARKETING_SHELL_CLASS } from "@/lib/marketingShell";
import {
  claimDailyActivity,
  fetchLedger,
  verifyProfileBonus,
} from "@/lib/ownerr-network/api";
import type { OwnerrNetworkLedgerRow } from "@/lib/ownerr-network/types";
import { useToast } from "@/hooks/use-toast";

export default function UnemployedWalletPage() {
  const { toast } = useToast();
  const { profile, refreshProfile } = useOwnerrNetworkAuth();
  const [ledger, setLedger] = useState<OwnerrNetworkLedgerRow[]>([]);
  const [claimingVerify, setClaimingVerify] = useState(false);

  useEffect(() => {
    if (!profile) return;
    void fetchLedger(profile.id).then(setLedger);
    void claimDailyActivity().then(() => refreshProfile());
  }, [profile, refreshProfile]);

  if (!profile) return null;

  return (
    <div className={MARKETING_SHELL_CLASS + " desk-app-theme mx-auto max-w-3xl space-y-8"}>
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--terminal-lime)]">
          Wallet
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[color:var(--terminal-display)]">@{profile.username}</h1>
        <p className="text-sm text-[color:var(--terminal-muted)]">Points balance and activity</p>
      </header>

      <section className="rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-5">
        <Wallet className="h-5 w-5 text-[color:var(--terminal-ochre)]" aria-hidden />
        <p className="mt-2 text-xs font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
          Balance
        </p>
        <p className="mt-1 text-3xl font-bold text-[color:var(--terminal-lime)]">{profile.points}</p>
        <p className="text-sm text-[color:var(--terminal-muted)]">≈ ₹{profile.points} INR equivalent</p>
        <p className="mt-2 text-xs text-[color:var(--terminal-muted)]">
          Wallet balance: {profile.wallet_balance} · Total earned: {profile.total_earned}
        </p>
      </section>

      <section>
        <h2 className="font-bold text-[color:var(--terminal-display)]">Points history</h2>
        <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
          {ledger.length === 0 ? (
            <li className="text-sm text-[color:var(--terminal-muted)]">No ledger entries yet.</li>
          ) : (
            ledger.map((row) => (
              <li
                key={row.id}
                className="flex justify-between rounded-[8px] border border-[color:var(--terminal-border)]/60 px-3 py-2 text-sm"
              >
                <span className="text-[color:var(--terminal-muted)]">{row.type}</span>
                <span className="font-mono font-bold text-[color:var(--terminal-lime)]">+{row.amount}</span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-[12px] border border-[color:var(--terminal-border)] p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
          Profile verification
        </p>
        <p className="mt-2 text-sm text-[color:var(--terminal-muted)]">
          Confirm your email in Supabase, then claim +10 points once.
        </p>
        <Button
          className="mt-3"
          disabled={profile.profile_verified || claimingVerify}
          onClick={() => {
            setClaimingVerify(true);
            void verifyProfileBonus()
              .then(() => refreshProfile())
              .then(() => toast({ title: "Verification bonus applied" }))
              .catch((err) =>
                toast({
                  title: "Could not verify",
                  description: err instanceof Error ? err.message : "Try again",
                  variant: "destructive",
                }),
              )
              .finally(() => setClaimingVerify(false));
          }}
        >
          {profile.profile_verified ? "Verified" : "Claim verification bonus"}
        </Button>
      </section>
    </div>
  );
}
