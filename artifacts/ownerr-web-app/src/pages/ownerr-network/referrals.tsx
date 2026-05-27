import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOwnerrNetworkAuth } from "@/hooks/useOwnerrNetworkAuth";
import { MARKETING_SHELL_CLASS } from "@/lib/marketingShell";
import { buildOwnerrNetworkReferralLink } from "@/lib/ownerr-network/referral";
import { fetchReferrals, fetchUserBadges } from "@/lib/ownerr-network/api";
import type { OwnerrNetworkBadge } from "@/lib/ownerr-network/types";
import { useToast } from "@/hooks/use-toast";
import { trackOwnerrNetworkEvent } from "@/lib/ownerr-network/analytics";
import { OWNERR_OS_SHARE_CARD_PATH } from "@/lib/ownerrOsShareAssets";

export default function UnemployedReferralsPage() {
  const { toast } = useToast();
  const { profile } = useOwnerrNetworkAuth();
  const [badges, setBadges] = useState<OwnerrNetworkBadge[]>([]);
  const [referralCount, setReferralCount] = useState(0);

  useEffect(() => {
    if (!profile) return;
    void fetchUserBadges(profile.id).then(setBadges);
    void fetchReferrals(profile.id).then((rows) => setReferralCount(rows.length));
  }, [profile]);

  if (!profile) return null;

  const referralLink = buildOwnerrNetworkReferralLink(window.location.origin, profile.referral_code);
  const sharePage = `${window.location.origin}/share/network/${encodeURIComponent(profile.username)}`;

  async function copyLink() {
    await navigator.clipboard.writeText(referralLink);
    toast({ title: "Referral link copied" });
    void trackOwnerrNetworkEvent("share_intent", { target: "referral" }, profile!.id);
  }

  return (
    <div className={MARKETING_SHELL_CLASS + " desk-app-theme mx-auto max-w-3xl space-y-8"}>
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--terminal-lime)]">
          Referrals
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[color:var(--terminal-display)]">Grow your network</h1>
        <p className="text-sm text-[color:var(--terminal-muted)]">
          {profile.total_referrals} total referrals · {referralCount} tracked invites
        </p>
      </header>

      <section className="rounded-[12px] border border-[color:var(--terminal-border)] p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
          Referral link
        </p>
        <div className="mt-2 flex gap-2">
          <Input readOnly value={referralLink} className="text-xs" />
          <Button size="icon" variant="outline" onClick={() => void copyLink()}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 font-mono text-xs text-[color:var(--terminal-muted)]">Code: {profile.referral_code}</p>
        <Button asChild variant="outline" className="mt-3 w-full border-[color:var(--terminal-border)]">
          <Link href={sharePage}>
            <Share2 className="mr-2 h-4 w-4" />
            Open share page
          </Link>
        </Button>
      </section>

      <section>
        <h2 className="font-bold text-[color:var(--terminal-display)]">Badges</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {badges.length === 0 ? (
            <p className="text-sm text-[color:var(--terminal-muted)]">Complete referrals and survey to earn badges.</p>
          ) : (
            badges.map((b) => (
              <span
                key={b.id}
                className="rounded-full border border-[color:var(--terminal-ochre)]/40 bg-[color:var(--terminal-ochre)]/10 px-3 py-1 text-xs font-bold"
              >
                {b.name}
              </span>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="font-bold text-[color:var(--terminal-display)]">Share card</h2>
        <img
          src={OWNERR_OS_SHARE_CARD_PATH}
          alt="Ownerr share"
          className="mt-3 w-full rounded-[10px] border border-[color:var(--terminal-border)]"
        />
      </section>
    </div>
  );
}
