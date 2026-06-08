import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import type {
  AcquisitionStage,
  BidStatus,
  SellerOfferRow,
} from "@/lib/marketplace/types";
import { useOfferActions, useBidDetail } from "@/hooks/marketplace/useOffers";
import { useState } from "react";
import { OfferTimeline } from "@/components/marketplace/OfferTimeline";
import { OpenConversationButton } from "@/components/marketplace/OpenConversationButton";
import { OfferBuyerStatusBanner } from "@/components/marketplace/OfferBuyerStatusBanner";
import { offerStatusLabel } from "@/lib/marketplace/offerStatusUi";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  countered: "Countered",
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "Withdrawn",
  expired: "Expired",
  superseded: "Superseded",
  closed_due_to_accepted_offer: "Closed",
  due_diligence: "Due diligence",
  closed: "Closed",
};

function statusTone(status: BidStatus): string {
  if (status === "accepted" || status === "closed") return "text-emerald-600";
  if (status === "declined" || status === "withdrawn")
    return "text-muted-foreground";
  if (status === "countered") return "text-brand-orange";
  return "text-foreground";
}

type Props = {
  offer: SellerOfferRow;
  startupSlug: string;
  mode: "buyer" | "seller";
  trustScore?: number | null;
};

export function OfferCard({ offer, startupSlug, mode, trustScore }: Props) {
  const actions = useOfferActions();
  const { data: detail } = useBidDetail(offer.id);
  const [counterAmount, setCounterAmount] = useState("");
  const [showCounter, setShowCounter] = useState(false);

  const canNegotiate = ["submitted", "under_review", "countered"].includes(
    offer.status,
  );
  const buyerAcceptCounter =
    mode === "buyer" &&
    offer.status === "countered" &&
    offer.lastActorRole === "seller";
  const sellerCanAccept =
    mode === "seller" &&
    ["submitted", "under_review", "countered"].includes(offer.status);

  async function sendCounter() {
    const amount = Number(counterAmount.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) return;
    await actions.counter.mutateAsync({ bidId: offer.id, amount });
    setShowCounter(false);
    setCounterAmount("");
  }

  const stages: AcquisitionStage[] = [
    "accepted",
    "due_diligence",
    "legal_review",
    "asset_transfer",
    "payment_pending",
    "closed",
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">
            {mode === "seller" ? offer.buyerName : "Your offer"}
          </p>
          <p
            className={cn(
              "text-sm font-bold tabular-nums",
              statusTone(offer.status),
            )}
          >
            {formatCurrency(offer.amount)} ·{" "}
            {mode === "buyer"
              ? offerStatusLabel(offer.status)
              : (STATUS_LABEL[offer.status] ?? offer.status)}
          </p>
          {trustScore != null ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              Listing trust score {Math.round(trustScore)}/100
            </p>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(offer.updatedAt).toLocaleString()}
        </p>
      </div>

      {mode === "buyer" ? (
        <OfferBuyerStatusBanner
          status={offer.status}
          amount={offer.amount}
          lastActorRole={offer.lastActorRole}
          acquisitionStage={offer.acquisitionStage}
        />
      ) : null}

      {offer.message ? (
        <p className="text-sm text-foreground/90 whitespace-pre-wrap">
          {offer.message}
        </p>
      ) : null}

      {mode === "seller" &&
      (offer.status === "accepted" || offer.acquisitionStage) ? (
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-xs">
          <p className="font-semibold text-emerald-800 dark:text-emerald-300">
            Offer accepted · Due diligence in progress
          </p>
          <p className="text-muted-foreground mt-1">
            Stage: {offer.acquisitionStage ?? "accepted"}
          </p>
          {mode === "seller" && offer.status === "accepted" ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {stages.slice(1).map((stage) => (
                <Button
                  key={stage}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px]"
                  disabled={actions.advanceStage.isPending}
                  onClick={() =>
                    void actions.advanceStage.mutateAsync({
                      bidId: offer.id,
                      stage,
                    })
                  }
                >
                  → {stage.replace(/_/g, " ")}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {detail?.versions?.length ? (
        <OfferTimeline versions={detail.versions} />
      ) : null}

      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
        <OpenConversationButton
          mode={mode}
          bidId={offer.id}
          conversationId={offer.conversationId}
          startupSlug={startupSlug}
        />

        {mode === "buyer" && canNegotiate ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={actions.withdraw.isPending}
            onClick={() => void actions.withdraw.mutateAsync(offer.id)}
          >
            Withdraw
          </Button>
        ) : null}

        {buyerAcceptCounter ? (
          <Button
            type="button"
            size="sm"
            disabled={actions.acceptCounter.isPending}
            onClick={() => void actions.acceptCounter.mutateAsync(offer.id)}
          >
            Accept counter
          </Button>
        ) : null}

        {mode === "seller" && canNegotiate ? (
          <>
            <Button
              type="button"
              size="sm"
              className="btn-marketplace-primary"
              disabled={actions.accept.isPending}
              onClick={() => void actions.accept.mutateAsync(offer.id)}
            >
              Accept
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setShowCounter((v) => !v)}
            >
              Counter
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={actions.decline.isPending}
              onClick={() =>
                void actions.decline.mutateAsync({ bidId: offer.id })
              }
            >
              Decline
            </Button>
          </>
        ) : null}

        {sellerCanAccept && !canNegotiate ? null : null}
      </div>

      {showCounter && mode === "seller" ? (
        <div className="flex flex-wrap items-end gap-2 border-t pt-3">
          <div className="flex-1 min-w-[140px]">
            <Label htmlFor={`counter-${offer.id}`} className="text-xs">
              Counter amount
            </Label>
            <Input
              id={`counter-${offer.id}`}
              inputMode="decimal"
              value={counterAmount}
              onChange={(e) => setCounterAmount(e.target.value)}
            />
          </div>
          <Button type="button" size="sm" onClick={() => void sendCounter()}>
            Send counter
          </Button>
        </div>
      ) : null}

      {mode === "buyer" &&
      showCounter &&
      canNegotiate &&
      offer.lastActorRole === "seller" ? (
        <div className="flex flex-wrap items-end gap-2 border-t pt-3">
          <div className="flex-1 min-w-[140px]">
            <Label className="text-xs">Your counter</Label>
            <Input
              inputMode="decimal"
              value={counterAmount}
              onChange={(e) => setCounterAmount(e.target.value)}
            />
          </div>
          <Button type="button" size="sm" onClick={() => void sendCounter()}>
            Submit counter
          </Button>
        </div>
      ) : null}

      {mode === "buyer" &&
      canNegotiate &&
      offer.lastActorRole === "seller" &&
      !buyerAcceptCounter ? (
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 text-xs"
          onClick={() => setShowCounter(true)}
        >
          Submit a counter offer
        </Button>
      ) : null}
    </div>
  );
}
