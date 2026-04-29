import type { DealStage, MockListingBidRecord } from "@/lib/mockBiddingTypes";

/** Stages while bids are still open (no accepted deal yet). */
export const BIDDING_OPEN_STAGES: DealStage[] = ["BID_PLACED", "RESET"];

/** Ordered pipeline after a bid is accepted (mock escrow / closing). */
export const DEAL_CLOSING_FLOW: DealStage[] = [
  "BID_ACCEPTED",
  "ESCROW_FUNDED",
  "DUE_DILIGENCE",
  "CONTRACTS_SIGNED",
  "ASSETS_TRANSFERRED",
  "PAYMENT_RELEASED",
];

export const DEAL_STAGE_LABEL: Record<DealStage, string> = {
  BID_PLACED: "Collecting bids",
  BID_ACCEPTED: "Bid accepted",
  ESCROW_FUNDED: "Escrow funded",
  DUE_DILIGENCE: "Due diligence",
  CONTRACTS_SIGNED: "Contracts signed",
  ASSETS_TRANSFERRED: "Assets transferred",
  PAYMENT_RELEASED: "Payment released",
  RESET: "Reset",
};

/** Legacy IndexedDB values → current `DealStage`. */
const LEGACY_STAGE_MAP: Record<string, DealStage> = {
  SELLER_ACCEPTED: "BID_ACCEPTED",
  IN_PROGRESS: "DUE_DILIGENCE",
  COMPLETED: "PAYMENT_RELEASED",
};

export function normalizeDealStage(stage: string | undefined | null): DealStage | null {
  if (stage == null || stage === "") return null;
  return LEGACY_STAGE_MAP[stage] ?? (stage as DealStage);
}

/** Normalize legacy `DealStage` values loaded from IndexedDB. */
export function migrateListingBidRecord(record: MockListingBidRecord): MockListingBidRecord {
  const out = record;
  if (out.deal) {
    const next = normalizeDealStage(out.deal.stage as string);
    if (next && next !== out.deal.stage) {
      out.deal = { ...out.deal, stage: next };
    }
  }
  out.bids = out.bids.map((bid) => ({
    ...bid,
    relationshipStage: bid.relationshipStage ?? "interested",
  }));
  return out;
}

export function dealBlocksNewBids(stage: DealStage | null | undefined): boolean {
  if (stage == null) return false;
  return !BIDDING_OPEN_STAGES.includes(stage);
}

export function nextClosingStage(current: DealStage): DealStage | null {
  const i = DEAL_CLOSING_FLOW.indexOf(current);
  if (i < 0 || i >= DEAL_CLOSING_FLOW.length - 1) return null;
  return DEAL_CLOSING_FLOW[i + 1]!;
}

export function closingProgress(current: DealStage): { done: number; total: number } {
  const i = DEAL_CLOSING_FLOW.indexOf(current);
  if (i < 0) return { done: 0, total: DEAL_CLOSING_FLOW.length };
  return { done: i + 1, total: DEAL_CLOSING_FLOW.length };
}

export function approvalLogMessage(
  _fromStage: DealStage,
  toStage: DealStage,
  buyerName: string,
  sellerLabel: string,
): string {
  switch (toStage) {
    case "ESCROW_FUNDED":
      return `[Ownerr] Approved — Escrow funded (mock). Recorded: ${DEAL_STAGE_LABEL.ESCROW_FUNDED}.`;
    case "DUE_DILIGENCE":
      return `[Buyer: ${buyerName}] Approved — Due diligence complete (mock). Recorded: ${DEAL_STAGE_LABEL.DUE_DILIGENCE}.`;
    case "CONTRACTS_SIGNED":
      return `[Seller: ${sellerLabel}] + [Buyer: ${buyerName}] Approved — Contracts signed (mock). Recorded: ${DEAL_STAGE_LABEL.CONTRACTS_SIGNED}.`;
    case "ASSETS_TRANSFERRED":
      return `[Seller: ${sellerLabel}] Approved — Assets transferred (mock). Recorded: ${DEAL_STAGE_LABEL.ASSETS_TRANSFERRED}.`;
    case "PAYMENT_RELEASED":
      return `[Ownerr] Approved — Payment released to seller (mock). Recorded: ${DEAL_STAGE_LABEL.PAYMENT_RELEASED}. Deal closed.`;
    default:
      return `Stage updated — ${DEAL_STAGE_LABEL[toStage]}`;
  }
}

export function nextApprovalButtonLabel(current: DealStage): string {
  const next = nextClosingStage(current);
  if (!next) return "Pipeline complete";
  return `Approve: ${DEAL_STAGE_LABEL[next]}`;
}
