export {
  submitOffer,
  counterOffer,
  acceptOffer,
  acceptCounterOffer,
  declineOffer,
  withdrawOffer,
  advanceAcquisitionStage,
  listBuyerOffers,
  listSellerOfferGroups,
  fetchBidDetail,
  ensureConversationForBid,
} from "@/lib/marketplace/offerService";

import { instrumentedRpc } from "@/lib/api/rpcTelemetry";

export async function buyerOfferDashboard() {
  return instrumentedRpc<Record<string, unknown>>(
    "marketplace_buyer_offer_dashboard",
    {},
  );
}

export async function sellerOfferDashboard() {
  return instrumentedRpc<Record<string, unknown>>(
    "marketplace_seller_offer_dashboard",
    {},
  );
}
