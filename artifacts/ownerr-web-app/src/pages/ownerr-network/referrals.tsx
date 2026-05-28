import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  Download,
  ExternalLink,
  Link2,
  Medal,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShareButton } from "@/components/share/ShareButton";
import { useOwnerrNetworkAuth } from "@/hooks/useOwnerrNetworkAuth";
import { buildOwnerrNetworkReferralLink } from "@/lib/ownerr-network/referral";
import { fetchReferrals, fetchUserBadges } from "@/lib/ownerr-network/api";
import type { OwnerrNetworkBadge } from "@/lib/ownerr-network/types";
import { useToast } from "@/hooks/use-toast";
import { trackOwnerrNetworkEvent } from "@/lib/ownerr-network/analytics";
import { buildOwnerrNetworkSharePayload } from "@/lib/share/buildSharePayload";
import {
  getShareCardPreviewPath,
  downloadShareCard,
} from "@/lib/share/downloadShareCard";
import { OWNERR_NETWORK_SOCIAL_LINKS } from "@/lib/ownerr-network/social";
import { PRODUCT_ROUTES } from "@/routing/routeRegistry";

export default function OwnerrNetworkReferralsPage() {
  const { toast } = useToast();
  const { profile, networkProfile } = useOwnerrNetworkAuth();
  const [badges, setBadges] = useState<OwnerrNetworkBadge[]>([]);
  const [referralCount, setReferralCount] = useState(0);

  useEffect(() => {
    if (!profile) return;
    void fetchUserBadges(profile.id).then(setBadges);
    void fetchReferrals(profile.id).then((rows) =>
      setReferralCount(rows.length),
    );
  }, [profile]);

  const referralLink = useMemo(() => {
    if (!profile) return "";
    return buildOwnerrNetworkReferralLink(
      window.location.origin,
      profile.referral_code,
    );
  }, [profile]);

  const sharePayload = useMemo(() => {
    if (!profile) return null;
    const publicProfileUrl = `${window.location.origin}${PRODUCT_ROUTES.ownerrNetworkShare(profile.username)}`;
    return buildOwnerrNetworkSharePayload({
      username: profile.username,
      displayName: networkProfile?.display_name ?? profile.name,
      headline: networkProfile?.goals,
      referralLink,
      publicProfileUrl,
    });
  }, [profile, networkProfile, referralLink]);

  if (!profile || !sharePayload) return null;

  const userId = profile.id;
  const payload = sharePayload;

  async function copyText() {
    await navigator.clipboard.writeText(payload.text);
    toast({ title: "Share message copied" });
    void trackOwnerrNetworkEvent(
      "share_intent",
      { target: "copy_text" },
      userId,
    );
  }

  async function copyLink() {
    await navigator.clipboard.writeText(payload.referralUrl);
    toast({ title: "Invite link copied" });
    void trackOwnerrNetworkEvent(
      "share_intent",
      { target: "copy_link" },
      userId,
    );
  }

  function onShared() {
    toast({
      title: "Share sheet opened",
      description: "Choose an app to send your message and card.",
    });
    void trackOwnerrNetworkEvent(
      "share_intent",
      { target: "native_share" },
      userId,
    );
  }

  return (
    <div className="w-full max-w-none min-w-0 space-y-6 sm:space-y-8">
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--terminal-lime)]">
          Referral
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[color:var(--terminal-display)]">
          @{profile.username}
        </h1>
        <p className="text-sm text-[color:var(--terminal-muted)]">
          Invite founders and earn network credits
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-5">
          <div className="flex items-center gap-2">
            <Users
              className="h-4 w-4 text-[color:var(--terminal-ochre)]"
              aria-hidden
            />
            <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
              Total referrals
            </p>
          </div>
          <p className="mt-2 text-3xl font-bold tabular-nums text-[color:var(--terminal-lime)]">
            {profile.total_referrals}
          </p>
        </div>
        <div className="rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-5">
          <div className="flex items-center gap-2">
            <Link2
              className="h-4 w-4 text-[color:var(--terminal-ochre)]"
              aria-hidden
            />
            <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
              Tracked invites
            </p>
          </div>
          <p className="mt-2 text-3xl font-bold tabular-nums text-[color:var(--terminal-display)]">
            {referralCount}
          </p>
        </div>
      </section>

      <section className="rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
          Referral link &amp; share card
        </p>
        <p className="mt-2 text-xs text-[color:var(--terminal-muted)]">
          Share opens your phone or computer&apos;s apps with your pitch, invite
          link, socials, and card image when supported.
        </p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start">
          <img
            src={getShareCardPreviewPath()}
            alt="Ownerr Network share card preview"
            className="w-full max-w-[220px] shrink-0 rounded-[10px] border border-[color:var(--terminal-border)]"
          />
          <div className="min-w-0 flex-1 space-y-3">
            <Input
              readOnly
              value={referralLink}
              className="border-[color:var(--terminal-border)] text-xs"
            />
            <ShareButton
              payload={payload}
              onShared={onShared}
              onCopyText={copyText}
              onCopyLink={copyLink}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="font-bold"
                onClick={() => void copyText()}
              >
                <Copy className="mr-2 h-4 w-4" aria-hidden />
                Copy text
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="font-bold"
                onClick={() => void copyLink()}
              >
                <Link2 className="mr-2 h-4 w-4" aria-hidden />
                Copy link
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="font-bold"
                onClick={() => {
                  void downloadShareCard();
                  toast({ title: "Share card downloaded" });
                }}
              >
                <Download className="mr-2 h-4 w-4" aria-hidden />
                Download card
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
          Follow Ownerr Network
        </p>
        <p className="mt-2 text-xs text-[color:var(--terminal-muted)]">
          Tag us when you post your referral — we amplify founders in the
          community.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {OWNERR_NETWORK_SOCIAL_LINKS.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant="outline"
              className="font-bold"
              asChild
            >
              <a href={item.href} target="_blank" rel="noopener noreferrer">
                {item.label}
                <ExternalLink
                  className="ml-2 h-3.5 w-3.5 opacity-70"
                  aria-hidden
                />
              </a>
            </Button>
          ))}
        </div>
      </section>

      <section className="rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-5">
        <div className="flex items-center gap-2">
          <Medal
            className="h-4 w-4 text-[color:var(--terminal-ochre)]"
            aria-hidden
          />
          <h2 className="text-sm font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
            Badges
          </h2>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {badges.length === 0 ? (
            <p className="text-sm text-[color:var(--terminal-muted)]">
              Complete referrals and onboarding to unlock badges.
            </p>
          ) : (
            badges.map((b) => (
              <span
                key={b.id}
                className="rounded-full border border-[color:var(--terminal-ochre)]/40 bg-[color:var(--terminal-ochre)]/10 px-3 py-1 text-xs font-bold text-[color:var(--terminal-display)]"
              >
                {b.name}
              </span>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
