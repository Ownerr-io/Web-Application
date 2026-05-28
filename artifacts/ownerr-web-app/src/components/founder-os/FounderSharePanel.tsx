import { useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { FounderSubmissionRecord } from "@/lib/founderTypes";
import { buildReferralLink } from "@/lib/founderReferral";
import {
  getFounderSharePageUrl,
  getPublicShareOrigin,
  OWNERR_OS_SHARE_CARD_PATH,
} from "@/lib/founderShareUrls";
import { cn } from "@/lib/utils";

type Props = {
  record: FounderSubmissionRecord;
  prominent?: boolean;
  compact?: boolean;
};

export function FounderSharePanel({ record, prominent, compact }: Props) {
  const { toast } = useToast();
  const [copiedReferral, setCopiedReferral] = useState(false);
  const referralUrl = buildReferralLink(
    getPublicShareOrigin(),
    record.referralCode,
  );
  const sharePageUrl = getFounderSharePageUrl(record);

  async function copyReferralLink() {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopiedReferral(true);
      toast({ title: "Referral link copied" });
      window.setTimeout(() => setCopiedReferral(false), 2000);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  }

  async function copySharePage() {
    try {
      await navigator.clipboard.writeText(sharePageUrl);
      toast({ title: "Public share link copied to clipboard" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  }

  return (
    <div
      className={cn(
        "space-y-6",
        compact
          ? "py-0"
          : prominent &&
              "rounded-[12px] border border-[color:var(--terminal-border)] p-4 sm:p-6",
      )}
    >
      <section className="rounded-[12px] border border-[color:var(--terminal-border)] p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
          Referral link
        </p>
        <div className="mt-2 flex gap-2">
          <Input
            readOnly
            value={referralUrl}
            className="border-[color:var(--terminal-border)] text-xs"
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="shrink-0 border-[color:var(--terminal-border)]"
            onClick={() => void copyReferralLink()}
            aria-label="Copy referral link"
          >
            <Copy
              className={cn(
                "h-4 w-4",
                copiedReferral && "text-[color:var(--brand-lime)]",
              )}
            />
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          className="mt-3 w-full border-[color:var(--terminal-border)] font-bold"
          onClick={() => void copySharePage()}
        >
          <Share2 className="mr-2 h-4 w-4" aria-hidden />
          Copy public share link
        </Button>
        <p className="mt-2 text-xs text-[color:var(--terminal-muted)]">
          Invitees land on your join page. The share link is for social previews
          with your listing.
        </p>
      </section>

      <section>
        <h2 className="text-sm font-bold text-[color:var(--terminal-display)]">
          Share card
        </h2>
        <img
          src={OWNERR_OS_SHARE_CARD_PATH}
          alt="OWNERR OS share card"
          className="mt-3 w-full rounded-[10px] border border-[color:var(--terminal-border)]"
          width={1200}
          height={630}
        />
      </section>
    </div>
  );
}
