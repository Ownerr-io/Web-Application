import { Copy, Download, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SharePlatformButtons } from "@/components/share/SharePlatformButtons";
import type { SharePayload } from "@/lib/share/buildSharePayload";
import { downloadShareCard } from "@/lib/share/downloadShareCard";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: SharePayload;
  onCopyText?: () => void;
  onCopyLink?: () => void;
};

export function ShareFallbackModal({
  open,
  onOpenChange,
  payload,
  onCopyText,
  onCopyLink,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-[color:var(--terminal-border)] bg-background sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share your invite</DialogTitle>
          <DialogDescription>
            Pick an app to share your message and links. On most desktop apps,
            attach the share card image manually after using Download card.
          </DialogDescription>
        </DialogHeader>

        <SharePlatformButtons
          payload={payload}
          onAction={() => onOpenChange(false)}
        />

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="secondary"
            className="w-full justify-start font-bold"
            onClick={() => {
              onCopyText?.();
            }}
          >
            <Copy className="mr-2 h-4 w-4" aria-hidden />
            Copy text
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full justify-start font-bold"
            onClick={() => {
              onCopyLink?.();
            }}
          >
            <Link2 className="mr-2 h-4 w-4" aria-hidden />
            Copy invite link
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start font-bold"
            onClick={() => void downloadShareCard()}
          >
            <Download className="mr-2 h-4 w-4" aria-hidden />
            Download card
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
