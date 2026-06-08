import type { BidStatus } from "@/lib/marketplace/types";
import { formatCurrency } from "@/lib/utils";

export function offerStatusLabel(status: BidStatus | string): string {
  const map: Record<string, string> = {
    submitted: "Waiting on seller",
    under_review: "Seller reviewing",
    countered: "Seller countered",
    accepted: "Accepted by seller",
    declined: "Declined by seller",
    rejected: "Declined by seller",
    withdrawn: "Withdrawn",
    expired: "Expired",
    superseded: "Another offer accepted",
    closed_due_to_accepted_offer: "Closed",
    due_diligence: "Due diligence",
    closed: "Deal closed",
    draft: "Draft",
  };
  return map[status] ?? String(status);
}

export type BuyerOfferBanner = {
  tone: "info" | "success" | "warning" | "muted";
  title: string;
  body: string;
};

export function buyerOfferStatusBanner(input: {
  status: BidStatus;
  amount: number;
  lastActorRole?: string | null;
  acquisitionStage?: string | null;
}): BuyerOfferBanner | null {
  const amt = formatCurrency(input.amount);
  switch (input.status) {
    case "submitted":
      return {
        tone: "info",
        title: "Waiting on the founder",
        body: `Your ${amt} offer was sent. You'll see updates here when they accept, counter, or decline.`,
      };
    case "under_review":
      return {
        tone: "info",
        title: "Seller is reviewing",
        body:
          input.lastActorRole === "buyer"
            ? "You accepted their counter. The founder will confirm next steps."
            : `Your ${amt} offer is under review.`,
      };
    case "countered":
      if (input.lastActorRole === "seller") {
        return {
          tone: "warning",
          title: "Founder sent a counter offer",
          body: `New amount: ${amt}. Accept their counter, reply with your own counter, or withdraw.`,
        };
      }
      return {
        tone: "info",
        title: "Counter sent",
        body: `Your counter of ${amt} is with the founder.`,
      };
    case "accepted":
      return {
        tone: "success",
        title: "Offer accepted",
        body: `The founder accepted your ${amt} offer. Due diligence is in progress${
          input.acquisitionStage
            ? ` (stage: ${input.acquisitionStage.replace(/_/g, " ")})`
            : ""
        }.`,
      };
    case "declined":
    case "rejected":
      return {
        tone: "muted",
        title: "Offer declined",
        body: `The founder declined your ${amt} offer. This chat is read-only. Submit a new offer on the listing to reopen messaging.`,
      };
    case "withdrawn":
      return {
        tone: "muted",
        title: "You withdrew this offer",
        body: "This offer is no longer active.",
      };
    case "superseded":
    case "closed_due_to_accepted_offer":
      return {
        tone: "muted",
        title: "Offer closed",
        body: "Another buyer's offer was accepted on this listing.",
      };
    case "closed":
      return {
        tone: "success",
        title: "Deal closed",
        body: "This acquisition has completed.",
      };
    default:
      return null;
  }
}

export function buyerNeedsAction(
  status: BidStatus,
  lastActorRole?: string | null,
): boolean {
  if (status === "countered" && lastActorRole === "seller") return true;
  return false;
}

export function isWaitingOnSeller(status: BidStatus): boolean {
  return status === "submitted" || status === "under_review";
}
