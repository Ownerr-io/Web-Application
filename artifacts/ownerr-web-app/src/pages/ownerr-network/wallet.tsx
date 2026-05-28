import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Coins,
  History,
  ShieldCheck,
  Wallet as WalletIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOwnerrNetworkAuth } from "@/hooks/useOwnerrNetworkAuth";
import {
  claimDailyActivity,
  fetchLedger,
  verifyProfileBonus,
} from "@/lib/ownerr-network/api";
import type { OwnerrNetworkLedgerRow } from "@/lib/ownerr-network/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function formatLedgerLabel(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatLedgerWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function OwnerrNetworkWalletPage() {
  const { toast } = useToast();
  const { profile, refreshProfile } = useOwnerrNetworkAuth();
  const [ledger, setLedger] = useState<OwnerrNetworkLedgerRow[]>([]);
  const [claimingVerify, setClaimingVerify] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    setLedgerLoading(true);
    void fetchLedger(profile.id)
      .then(setLedger)
      .finally(() => setLedgerLoading(false));
  }, [profile?.id]);

  useEffect(() => {
    void claimDailyActivity().then(() => refreshProfile());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!profile) return null;

  const spendable = profile.wallet_balance ?? profile.points;
  const lifetime = profile.total_earned ?? profile.points;

  return (
    <div className="w-full max-w-none min-w-0 space-y-6 sm:space-y-8">
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--terminal-lime)]">
          Wallet
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[color:var(--terminal-display)]">
          @{profile.username}
        </h1>
        <p className="text-sm text-[color:var(--terminal-muted)]">
          Points balance and activity
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-5">
          <div className="flex items-center justify-between gap-3">
            <WalletIcon
              className="h-5 w-5 text-[color:var(--terminal-ochre)]"
              aria-hidden
            />
            <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
              1 pt = ₹1 credit
            </p>
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
            Available balance
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-[color:var(--terminal-lime)]">
            {spendable}
          </p>
          <p className="mt-2 text-sm text-[color:var(--terminal-muted)]">
            ≈ ₹{spendable.toLocaleString()} in platform credits
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-[color:var(--terminal-border)]/80 pt-4">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
                Wallet balance
              </dt>
              <dd className="mt-1 text-lg font-bold tabular-nums text-[color:var(--terminal-display)]">
                {profile.wallet_balance}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
                Lifetime earned
              </dt>
              <dd className="mt-1 text-lg font-bold tabular-nums text-[color:var(--terminal-display)]">
                {lifetime}
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col justify-between rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-5">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck
                className="h-4 w-4 text-[color:var(--terminal-ochre)]"
                aria-hidden
              />
              <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
                Profile verification
              </p>
            </div>
            <p className="mt-3 text-sm text-[color:var(--terminal-muted)]">
              {profile.profile_verified
                ? "Your profile is verified. Verification bonuses are applied to your wallet."
                : "Confirm your account email, then claim a one-time +10 point bonus."}
            </p>
          </div>
          {profile.profile_verified ? (
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[color:var(--terminal-lime)]">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
              Verified
            </div>
          ) : (
            <Button
              className="mt-5 w-full font-bold sm:w-auto"
              disabled={claimingVerify}
              onClick={() => {
                setClaimingVerify(true);
                void verifyProfileBonus()
                  .then(() => refreshProfile())
                  .then(() => toast({ title: "Verification bonus applied" }))
                  .catch((err) =>
                    toast({
                      title: "Could not verify",
                      description:
                        err instanceof Error ? err.message : "Try again",
                      variant: "destructive",
                    }),
                  )
                  .finally(() => setClaimingVerify(false));
              }}
            >
              Claim +10 points
            </Button>
          )}
        </div>
      </section>

      <section className="rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <History
              className="h-4 w-4 text-[color:var(--terminal-ochre)]"
              aria-hidden
            />
            <h2 className="text-sm font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
              Points history
            </h2>
          </div>
          <p className="text-xs text-[color:var(--terminal-muted)]">
            {ledger.length > 0
              ? `${ledger.length} entries`
              : "Referrals, daily activity, bonuses"}
          </p>
        </div>

        {ledgerLoading ? (
          <p className="mt-6 text-sm text-[color:var(--terminal-muted)]">
            Loading activity…
          </p>
        ) : ledger.length === 0 ? (
          <div className="mt-6 flex flex-col items-center rounded-[12px] border border-dashed border-[color:var(--terminal-border)] px-6 py-10 text-center">
            <Coins
              className="h-7 w-7 text-[color:var(--terminal-muted)]"
              aria-hidden
            />
            <p className="mt-3 text-sm font-bold text-[color:var(--terminal-display)]">
              No ledger entries yet
            </p>
            <p className="mt-1 max-w-md text-xs text-[color:var(--terminal-muted)]">
              Earn points from referrals, completing your profile, and daily
              activity.
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-[color:var(--terminal-border)]/70 rounded-[12px] border border-[color:var(--terminal-border)]/80">
            {ledger.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm first:rounded-t-[12px] last:rounded-b-[12px]"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[color:var(--terminal-display)]">
                    {formatLedgerLabel(row.type)}
                  </p>
                  <p className="text-xs text-[color:var(--terminal-muted)]">
                    {formatLedgerWhen(row.created_at)}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 font-mono font-bold tabular-nums",
                    row.amount >= 0
                      ? "text-[color:var(--terminal-lime)]"
                      : "text-[color:var(--terminal-ochre)]",
                  )}
                >
                  {row.amount >= 0 ? `+${row.amount}` : row.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
