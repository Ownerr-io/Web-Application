import { useMemo, useState } from "react";
import type { Startup } from "@/lib/marketplace/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatShortCurrency } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useRequireAuth } from "@/lib/platform/requireAuth";
import { useCreateBid, useStartupBids } from "@/hooks/marketplace/useBids";
import {
  highestActiveBidAmount,
  minNextBidAmount,
} from "@/lib/marketplace/bidService";
import { CircleDollarSign } from "lucide-react";

function listingBasePrice(startup: Startup): number {
  return startup.price ?? Math.round(startup.revenue * 12 * 3);
}

export function AcquireBidPanel({
  startup,
  compact,
}: {
  startup: Startup;
  compact?: boolean;
}) {
  const { currentUser } = useAuth();
  const { requireSession } = useRequireAuth();
  const { data: bids = [] } = useStartupBids(startup.slug);
  const createBid = useCreateBid();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

  const base = listingBasePrice(startup);
  const highest = useMemo(() => highestActiveBidAmount(bids), [bids]);
  const minBid = useMemo(
    () => minNextBidAmount(base, highest),
    [base, highest],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(amount.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(parsed) || parsed < minBid) return;
    requireSession(() => {
      void createBid
        .mutateAsync({
          startupSlug: startup.slug,
          amount: parsed,
          message: message.trim() || undefined,
        })
        .then(() => {
          setAmount("");
          setMessage("");
        });
    });
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className={cn("space-y-2", compact && "text-xs")}
    >
      <div className="flex items-center justify-between gap-2 text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CircleDollarSign className="h-3.5 w-3.5" />
          {highest != null
            ? `High bid ${formatShortCurrency(highest)}`
            : `From ${formatShortCurrency(minBid)}`}
        </span>
        {!currentUser ? (
          <span className="text-[10px]">Sign in to bid</span>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label htmlFor={`bid-amt-${startup.slug}`} className="sr-only">
            Bid amount
          </Label>
          <Input
            id={`bid-amt-${startup.slug}`}
            inputMode="decimal"
            placeholder={String(minBid)}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={createBid.isPending}
          />
        </div>
        <Button
          type="submit"
          size={compact ? "sm" : "default"}
          disabled={createBid.isPending}
        >
          {createBid.isPending ? "Submitting…" : "Place bid"}
        </Button>
      </div>
      {!compact ? (
        <div>
          <Label
            htmlFor={`bid-msg-${startup.slug}`}
            className="text-xs text-muted-foreground"
          >
            Message (optional)
          </Label>
          <Textarea
            id={`bid-msg-${startup.slug}`}
            rows={2}
            className="mt-1"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={createBid.isPending}
          />
        </div>
      ) : null}
    </form>
  );
}
