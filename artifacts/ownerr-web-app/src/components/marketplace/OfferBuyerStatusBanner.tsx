import { cn } from "@/lib/utils";
import type { BidStatus } from "@/lib/marketplace/types";
import {
  buyerOfferStatusBanner,
  offerStatusLabel,
} from "@/lib/marketplace/offerStatusUi";

const TONE_CLASS: Record<string, string> = {
  info: "border-border bg-muted/30",
  success: "border-emerald-500/30 bg-emerald-500/5",
  warning: "border-brand-orange/40 bg-brand-orange/5",
  muted: "border-border bg-muted/20",
};

type Props = {
  status: BidStatus;
  amount: number;
  lastActorRole?: string | null;
  acquisitionStage?: string | null;
  showChip?: boolean;
};

export function OfferBuyerStatusBanner({
  status,
  amount,
  lastActorRole,
  acquisitionStage,
  showChip = true,
}: Props) {
  const banner = buyerOfferStatusBanner({
    status,
    amount,
    lastActorRole,
    acquisitionStage,
  });
  if (!banner) return null;

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5 text-sm space-y-1",
        TONE_CLASS[banner.tone],
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {showChip ? (
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              banner.tone === "success" &&
                "border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
              banner.tone === "warning" &&
                "text-brand-orange border-brand-orange/40",
              banner.tone === "info" && "text-foreground",
              banner.tone === "muted" && "text-muted-foreground",
            )}
          >
            {offerStatusLabel(status)}
          </span>
        ) : null}
        <p className="font-semibold text-foreground">{banner.title}</p>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {banner.body}
      </p>
    </div>
  );
}
