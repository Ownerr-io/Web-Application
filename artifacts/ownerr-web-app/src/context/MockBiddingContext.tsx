import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getAllMockListingBidRecordsDB,
  getMockListingBidRecordDB,
  putMockListingBidRecordDB,
} from "@/lib/db";
import { bidderDisplayName } from "@/lib/mockBiddingBidders";
import {
  approvalLogMessage,
  dealBlocksNewBids,
  migrateListingBidRecord,
  nextClosingStage,
} from "@/lib/mockBiddingPipeline";
import type { ActivityLog, Bid, Deal, MockListingBidRecord } from "@/lib/mockBiddingTypes";

const MAX_BIDDERS = 3;

function genId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? String(Date.now())}`;
}

function emptyRecord(listingId: string): MockListingBidRecord {
  return {
    listingId,
    bids: [],
    deal: null,
    activityLog: [],
    resetHistory: [],
  };
}

function pushLog(record: MockListingBidRecord, message: string): void {
  const entry: ActivityLog = {
    id: genId("log"),
    listingId: record.listingId,
    message,
    timestamp: new Date().toISOString(),
  };
  record.activityLog.unshift(entry);
}

function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export type PlaceBidResult = { ok: true } | { ok: false; error: string };

export type MockBiddingContextValue = {
  version: number;
  getRecord: (listingId: string) => MockListingBidRecord;
  activeBids: (listingId: string) => Bid[];
  highestActiveAmount: (listingId: string, basePrice: number) => number;
  minNextBid: (listingId: string, basePrice: number) => number;
  placeBid: (listingId: string, userId: string, amount: number, basePrice: number) => Promise<PlaceBidResult>;
  acceptBid: (
    listingId: string,
    bidId: string,
    opts?: { sellerLabel?: string },
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  rejectBid: (listingId: string, bidId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  updateBidStage: (
    listingId: string,
    bidId: string,
    stage: Bid["relationshipStage"],
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  approveDealStep: (
    listingId: string,
    opts?: { sellerLabel?: string },
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  resetListing: (listingId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const MockBiddingContext = createContext<MockBiddingContextValue | null>(null);

export function MockBiddingProvider({ children }: { children: ReactNode }) {
  const [map, setMap] = useState<Map<string, MockListingBidRecord>>(new Map());
  const [version, setVersion] = useState(0);

  const mergeLoaded = useCallback((rows: MockListingBidRecord[]) => {
    setMap((prev) => {
      const next = new Map(prev);
      for (const r of rows) {
        const cloned = structuredClone(r);
        next.set(cloned.listingId, migrateListingBidRecord(cloned));
      }
      return next;
    });
    setVersion((v) => v + 1);
  }, []);

  const refresh = useCallback(async () => {
    const rows = await getAllMockListingBidRecordsDB();
    mergeLoaded(rows);
  }, [mergeLoaded]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const persist = useCallback(async (record: MockListingBidRecord) => {
    await putMockListingBidRecordDB(record);
    setMap((prev) => {
      const next = new Map(prev);
      next.set(record.listingId, record);
      return next;
    });
    setVersion((v) => v + 1);
  }, []);

  const getRecord = useCallback(
    (listingId: string): MockListingBidRecord => {
      const existing = map.get(listingId);
      if (existing) return existing;
      return emptyRecord(listingId);
    },
    [map],
  );

  const activeBids = useCallback(
    (listingId: string) => getRecord(listingId).bids.filter((b) => b.status === "ACTIVE"),
    [getRecord],
  );

  const highestActiveAmount = useCallback(
    (listingId: string, basePrice: number) => {
      const act = activeBids(listingId);
      if (act.length === 0) return basePrice;
      return Math.max(...act.map((b) => b.amount));
    },
    [activeBids],
  );

  const minNextBid = useCallback(
    (listingId: string, basePrice: number) => highestActiveAmount(listingId, basePrice) + 1,
    [highestActiveAmount],
  );

  const placeBid = useCallback(
    async (listingId: string, userId: string, amount: number, basePrice: number): Promise<PlaceBidResult> => {
      const raw = await getMockListingBidRecordDB(listingId);
      const record = raw ? structuredClone(raw) : emptyRecord(listingId);

      if (record.deal && dealBlocksNewBids(record.deal.stage)) {
        return {
          ok: false,
          error:
            "This listing has an accepted deal in progress. Complete or reset the pipeline to place new bids.",
        };
      }

      const act = record.bids.filter((b) => b.status === "ACTIVE");
      const bidders = new Set(act.map((b) => b.userId));

      if (act.some((b) => b.userId === userId)) {
        return { ok: false, error: "This user already has an active bid on this listing." };
      }
      if (bidders.size >= MAX_BIDDERS && !bidders.has(userId)) {
        return { ok: false, error: `Only ${MAX_BIDDERS} different bidders are allowed per listing.` };
      }

      const floor = act.length === 0 ? basePrice : Math.max(...act.map((b) => b.amount));
      if (amount <= floor) {
        return {
          ok: false,
          error: `Bid must be greater than ${formatMoney(floor)}.`,
        };
      }

      const bid: Bid = {
        id: genId("bid"),
        listingId,
        userId,
        amount,
        status: "ACTIVE",
        relationshipStage: "interested",
        createdAt: new Date().toISOString(),
      };
      record.bids.push(bid);

      const name = bidderDisplayName(userId);
      pushLog(record, `${name} placed ${formatMoney(amount)}`);

      if (!record.deal || record.deal.stage === "RESET") {
        record.deal = {
          id: genId("deal"),
          listingId,
          acceptedBidId: null,
          stage: "BID_PLACED",
          updatedAt: new Date().toISOString(),
        };
      } else {
        record.deal = { ...record.deal, stage: "BID_PLACED", updatedAt: new Date().toISOString() };
      }

      await persist(record);
      return { ok: true };
    },
    [persist],
  );

  const acceptBid = useCallback(
    async (listingId: string, bidId: string, opts?: { sellerLabel?: string }) => {
      const raw = await getMockListingBidRecordDB(listingId);
      if (!raw) return { ok: false as const, error: "No bids on this listing yet." };
      const record = structuredClone(raw);
      const bid = record.bids.find((b) => b.id === bidId);
      if (!bid || bid.status !== "ACTIVE") {
        return { ok: false as const, error: "No active bid to accept." };
      }

      for (const b of record.bids) {
        if (b.id === bidId) b.status = "ACCEPTED";
        else if (b.status === "ACTIVE") b.status = "REJECTED";
      }

      record.deal = {
        id: record.deal?.id ?? genId("deal"),
        listingId,
        acceptedBidId: bidId,
        stage: "BID_ACCEPTED",
        updatedAt: new Date().toISOString(),
      };

      const winner = bidderDisplayName(bid.userId);
      const sellerLabel = opts?.sellerLabel?.trim() || "Seller";
      pushLog(
        record,
        `[Seller: ${sellerLabel}] Bid accepted — ${winner} @ ${formatMoney(bid.amount)}. Tracking: Escrow, due diligence, contracts, assets, payment (approve each step).`,
      );
      await persist(record);
      return { ok: true as const };
    },
    [persist],
  );

  const rejectBid = useCallback(
    async (listingId: string, bidId: string) => {
      const raw = await getMockListingBidRecordDB(listingId);
      if (!raw) return { ok: false as const, error: "No bidding data." };
      const record = structuredClone(raw);
      const bid = record.bids.find((b) => b.id === bidId);
      if (!bid || bid.status !== "ACTIVE") {
        return { ok: false as const, error: "Only active bids can be rejected." };
      }
      bid.status = "REJECTED";
      pushLog(record, `Seller rejected ${bidderDisplayName(bid.userId)} (${formatMoney(bid.amount)})`);
      await persist(record);
      return { ok: true as const };
    },
    [persist],
  );

  const approveDealStep = useCallback(
    async (listingId: string, opts?: { sellerLabel?: string }) => {
      const raw = await getMockListingBidRecordDB(listingId);
      if (!raw?.deal) return { ok: false as const, error: "No deal to advance." };
      const record = structuredClone(raw);
      const deal = record.deal;
      if (!deal) return { ok: false as const, error: "No deal." };
      if (!deal.acceptedBidId) {
        return { ok: false as const, error: "Accept a bid before advancing the pipeline." };
      }
      if (deal.stage === "RESET") {
        return { ok: false as const, error: "Deal was reset." };
      }

      const next = nextClosingStage(deal.stage);
      if (!next) {
        return { ok: false as const, error: "Pipeline is already complete (payment released)." };
      }

      const acceptedBid = record.bids.find((b) => b.id === deal.acceptedBidId);
      const buyerName = acceptedBid ? bidderDisplayName(acceptedBid.userId) : "Buyer";
      const sellerLabel = opts?.sellerLabel?.trim() || "Seller";
      const fromStage = deal.stage;
      const msg = approvalLogMessage(fromStage, next, buyerName, sellerLabel);

      record.deal = {
        ...deal,
        stage: next,
        updatedAt: new Date().toISOString(),
      };
      pushLog(record, msg);
      await persist(record);
      return { ok: true as const };
    },
    [persist],
  );

  const updateBidStage = useCallback(
    async (listingId: string, bidId: string, stage: Bid["relationshipStage"]) => {
      const raw = await getMockListingBidRecordDB(listingId);
      if (!raw) return { ok: false as const, error: "No bidding data." };
      const record = structuredClone(raw);
      const bid = record.bids.find((item) => item.id === bidId);
      if (!bid) return { ok: false as const, error: "Bid not found." };
      bid.relationshipStage = stage;
      pushLog(record, `${bidderDisplayName(bid.userId)} moved to ${stage}.`);
      await persist(record);
      return { ok: true as const };
    },
    [persist],
  );

  const resetListing = useCallback(
    async (listingId: string) => {
      const raw = await getMockListingBidRecordDB(listingId);
      const record = raw ? structuredClone(raw) : emptyRecord(listingId);
      const prior = record.deal;
      const cleared = record.bids.length;
      record.resetHistory.push({
        at: new Date().toISOString(),
        clearedBidCount: cleared,
        priorDealStage: prior?.stage ?? null,
        priorAcceptedBidId: prior?.acceptedBidId ?? null,
      });
      record.bids = [];
      record.deal = {
        id: genId("deal"),
        listingId,
        acceptedBidId: null,
        stage: "RESET",
        updatedAt: new Date().toISOString(),
      };
      pushLog(
        record,
        prior
          ? `[Ownerr] Bidding reset (prior pipeline: ${prior.stage}). All bids cleared.`
          : "[Ownerr] Bidding reset. All bids cleared.",
      );
      await persist(record);
    },
    [persist],
  );

  const value = useMemo<MockBiddingContextValue>(
    () => ({
      version,
      getRecord,
      activeBids,
      highestActiveAmount,
      minNextBid,
      placeBid,
      acceptBid,
      rejectBid,
      updateBidStage,
      approveDealStep,
      resetListing,
      refresh,
    }),
    [
      version,
      getRecord,
      activeBids,
      highestActiveAmount,
      minNextBid,
      placeBid,
      acceptBid,
      rejectBid,
      updateBidStage,
      approveDealStep,
      resetListing,
      refresh,
    ],
  );

  return <MockBiddingContext.Provider value={value}>{children}</MockBiddingContext.Provider>;
}

export function useMockBidding(): MockBiddingContextValue {
  const ctx = useContext(MockBiddingContext);
  if (!ctx) {
    throw new Error("useMockBidding must be used within MockBiddingProvider");
  }
  return ctx;
}
