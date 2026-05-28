import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareFallbackModal } from "@/components/share/ShareFallbackModal";
import type { SharePayload } from "@/lib/share/buildSharePayload";
import { openNativeShare } from "@/lib/share/nativeShare";
import { cn } from "@/lib/utils";

type Props = {
  payload: SharePayload;
  className?: string;
  size?: "default" | "lg";
  onShared?: () => void;
  onCopyText: () => void | Promise<void>;
  onCopyLink: () => void | Promise<void>;
};

export function ShareButton({
  payload,
  className,
  size = "lg",
  onShared,
  onCopyText,
  onCopyLink,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [fallbackOpen, setFallbackOpen] = useState(false);

  async function handleShare() {
    setBusy(true);
    try {
      const outcome = await openNativeShare(payload);
      if (outcome === "shared") {
        onShared?.();
        return;
      }
      if (outcome === "cancelled") return;
      setFallbackOpen(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        className={cn(
          "w-full font-bold",
          size === "lg" && "min-h-12 text-base",
          className,
        )}
        disabled={busy}
        onClick={() => void handleShare()}
      >
        <Share2 className="mr-2 h-5 w-5" aria-hidden />
        {busy ? "Opening share…" : "Share"}
      </Button>

      <ShareFallbackModal
        open={fallbackOpen}
        onOpenChange={setFallbackOpen}
        payload={payload}
        onCopyText={() => void onCopyText()}
        onCopyLink={() => void onCopyLink()}
      />
    </>
  );
}
