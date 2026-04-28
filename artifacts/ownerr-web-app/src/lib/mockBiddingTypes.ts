export type BidStatus = "ACTIVE" | "REJECTED" | "ACCEPTED";
export type BidRelationshipStage = "interested" | "contacted" | "negotiating" | "closed";

/**
 * Mock deal lifecycle. After a bid is accepted, `DEAL_CLOSING_FLOW` drives escrow → release.
 * `BID_PLACED` = collecting bids; `RESET` = cleared, bids open again.
 */
export type DealStage =
  | "BID_PLACED"
  | "BID_ACCEPTED"
  | "ESCROW_FUNDED"
  | "DUE_DILIGENCE"
  | "CONTRACTS_SIGNED"
  | "ASSETS_TRANSFERRED"
  | "PAYMENT_RELEASED"
  | "RESET";

export interface Bid {
  id: string;
  listingId: string;
  userId: string;
  amount: number;
  status: BidStatus;
  relationshipStage: BidRelationshipStage;
  createdAt: string;
}

export interface Deal {
  id: string;
  listingId: string;
  acceptedBidId: string | null;
  stage: DealStage;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  listingId: string;
  message: string;
  timestamp: string;
}

export interface MockBidResetSnapshot {
  at: string;
  clearedBidCount: number;
  /** May include legacy stage strings from older builds. */
  priorDealStage: string | null;
  priorAcceptedBidId: string | null;
}

export interface MockListingBidRecord {
  listingId: string;
  bids: Bid[];
  deal: Deal | null;
  activityLog: ActivityLog[];
  resetHistory: MockBidResetSnapshot[];
}

export interface MockBidderOption {
  userId: string;
  name: string;
}
