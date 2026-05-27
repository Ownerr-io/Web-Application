import { useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Copy,
  Download,
  Instagram,
  Linkedin,
  MessageCircle,
  Share2,
} from "lucide-react";
import { FaXTwitter } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { FounderSubmissionRecord } from "@/lib/founderTypes";
import { buildShareCaptions, shareUrlForPlatform } from "@/lib/founderShareCopy";
import { buildReferralLink } from "@/lib/founderReferral";
import { getFounderSharePageUrl, getPublicShareOrigin, OWNERR_OS_SHARE_CARD_PATH } from "@/lib/founderShareUrls";
import { OwnerrOsShareSocialButtons } from "@/components/founder-os/OwnerrOsShareSocialButtons";
import { cn } from "@/lib/utils";

type Props = {
  record: FounderSubmissionRecord;
  prominent?: boolean;
  compact?: boolean;
};

type SocialPlatform = "linkedin" | "twitter" | "whatsapp" | "instagram";

export function FounderSharePanel({ record, prominent, compact }: Props) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const captions = buildShareCaptions(record);
  const sharePageUrl = getFounderSharePageUrl(record);
  const referralUrl = buildReferralLink(getPublicShareOrigin(), record.referralCode);
  const shareCardSrc = OWNERR_OS_SHARE_CARD_PATH;

  async function fetchShareImageBlob(): Promise<Blob | null> {
    try {
      const res = await fetch(shareCardSrc);
      if (!res.ok) return null;
      return await res.blob();
    } catch {
      return null;
    }
  }

  async function downloadShareImage() {
    try {
      const blob = await fetchShareImageBlob();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "ownerr-os-share-card.jpeg";
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const a = document.createElement("a");
        a.href = shareCardSrc;
        a.download = "ownerr-os-share-card.jpeg";
        a.click();
      }
      toast({ title: "Saved — add this image when you post for max reach" });
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    }
  }

  async function tryNativeShareWithCard(platform: SocialPlatform): Promise<boolean> {
    const blob = await fetchShareImageBlob();
    if (!blob || !navigator.share) return false;

    const text =
      platform === "instagram" ? captions.instagram : captions[platform];
    const file = new File([blob], "ownerr-os-share-card.jpeg", { type: "image/jpeg" });
    const payload: ShareData = {
      title: `${record.startupName} on OWNERR OS`,
      text,
      url: sharePageUrl,
      files: [file],
    };

    if (!navigator.canShare?.(payload)) return false;

    try {
      await navigator.share(payload);
      return true;
    } catch {
      return false;
    }
  }

  async function nativeShare() {
    const usedNative = await tryNativeShareWithCard("linkedin");
    if (usedNative) return;
    try {
      await navigator.clipboard.writeText(`${captions.generic}\n\n${sharePageUrl}`);
      window.open(sharePageUrl, "_blank", "noopener,noreferrer");
      toast({
        title: "Share pack ready",
        description: "Caption copied. Your link opens the OWNERR OS share page with the card preview.",
      });
    } catch {
      toast({ title: "Share failed", variant: "destructive" });
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      toast({ title: "Referral link copied — send it to every founder you know" });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  }

  async function copyCaption(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Caption copied — paste and post!" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  }

  async function shareToPlatform(platform: SocialPlatform) {
    const caption =
      platform === "instagram" ? captions.instagram : captions[platform];

    if (await tryNativeShareWithCard(platform)) {
      toast({ title: "Pick your app — your card image is attached where supported" });
      return;
    }

    await copyCaption(caption);

    if (platform === "instagram") {
      toast({
        title: "Instagram ready",
        description:
          "Caption copied. Post using the card above, or use “Share from phone…” — we won’t auto-download.",
      });
      return;
    }

    window.open(shareUrlForPlatform(record, platform), "_blank", "noopener,noreferrer");

    const platformLabel =
      platform === "linkedin" ? "LinkedIn" : platform === "twitter" ? "X" : "WhatsApp";

    toast({
      title: `Opening ${platformLabel} — let's go`,
      description:
        "Paste the caption if needed. The shared link opens the OWNERR OS page with this card as the preview.",
    });
  }

  return (
    <div
      className={cn(
        "space-y-6",
        compact ? "py-0" : prominent && "rounded-[12px] border border-[color:var(--terminal-ochre)]/20 bg-[color:var(--terminal-ochre)]/[0.04] p-4 sm:p-6",
      )}
    >
      <p className="text-sm font-bold text-[color:var(--terminal-lime)]">
        Amplify your listing — multiple ways to reach more people
      </p>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="overflow-hidden rounded-[10px] border border-[color:var(--terminal-border)] shadow-lg ring-1 ring-[color:var(--terminal-ochre)]/20"
      >
        <img
          src={shareCardSrc}
          alt="OWNERR OS — Chance to win up to $250k"
          className="w-full object-cover"
          width={1200}
          height={630}
        />
      </motion.div>

      <OwnerrOsShareSocialButtons />

      <p className="text-xs font-black uppercase tracking-widest text-[color:var(--terminal-muted)]">
        Boost reach now
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          className="h-12 justify-start rounded-[10px] bg-[#0A66C2] font-bold text-white hover:bg-[#0A66C2]/90"
          onClick={() => void shareToPlatform("linkedin")}
        >
          <Linkedin className="mr-2 h-5 w-5" />
          Share on LinkedIn
        </Button>
        <Button
          type="button"
          className="h-12 justify-start rounded-[10px] bg-[color:var(--terminal-surface-2)] font-bold text-[color:var(--terminal-fg)] ring-1 ring-[color:var(--terminal-border)] hover:bg-[color:var(--terminal-bg)]"
          onClick={() => void shareToPlatform("twitter")}
        >
          <FaXTwitter className="mr-2 h-5 w-5" />
          Post on X
        </Button>
        <Button
          type="button"
          className="h-12 justify-start rounded-[10px] bg-[#25D366] font-bold text-[#0b0b0c] hover:bg-[#25D366]/90"
          onClick={() => void shareToPlatform("whatsapp")}
        >
          <MessageCircle className="mr-2 h-5 w-5" />
          Share on WhatsApp
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 justify-start rounded-[10px] border-[color:var(--terminal-border)] font-bold"
          onClick={() => void shareToPlatform("instagram")}
        >
          <Instagram className="mr-2 h-5 w-5" />
          Instagram caption
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => void downloadShareImage()}
          className="bg-[color:var(--terminal-ochre)] font-bold text-[color:var(--brand-accent-ink)]"
        >
          <Download className="mr-2 h-4 w-4" />
          Download share image
        </Button>
        <Button
          type="button"
          variant="outline"
          className="border-[color:var(--terminal-border)] font-bold"
          onClick={() => void nativeShare()}
        >
          <Share2 className="mr-2 h-4 w-4" />
          Share from phone…
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
          Your referral link — more founders = more reach for you
        </p>
        <div className="flex gap-2">
          <Input
            readOnly
            value={referralUrl}
            className="border-[color:var(--terminal-border)] bg-[color:var(--terminal-bg)] text-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => void copyLink()}
            className="shrink-0 border-[color:var(--terminal-border)]"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
