import { Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SharePayload } from "@/lib/share/buildSharePayload";
import {
  openPlatformShare,
  SHARE_PLATFORM_OPTIONS,
  type SharePlatformId,
} from "@/lib/share/platformShareLinks";

type Props = {
  payload: SharePayload;
  onAction?: () => void;
};

function platformIcon(id: SharePlatformId) {
  if (id === "email") return <Mail className="h-4 w-4" aria-hidden />;
  return <MessageCircle className="h-4 w-4" aria-hidden />;
}

export function SharePlatformButtons({ payload, onAction }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {SHARE_PLATFORM_OPTIONS.map((platform) => (
        <Button
          key={platform.id}
          type="button"
          variant="outline"
          className="h-auto min-h-11 flex-col gap-1 py-3 font-bold"
          onClick={() => {
            openPlatformShare(platform.id, payload);
            onAction?.();
          }}
        >
          {platformIcon(platform.id)}
          <span className="text-xs">{platform.label}</span>
        </Button>
      ))}
    </div>
  );
}
