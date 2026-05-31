export type MarketplaceBuyerRow = {
  id: string;
  profileId: string;
  authUserId: string;
  status: string;
  createdAt: string;
  email: string;
  username: string;
  fullName: string;
  interestCount: number;
  bidCount: number;
  conversationCount: number;
  closedDeals: number;
  lastActivityAt: string | null;
};

export type MarketplaceSellerRow = {
  id: string;
  profileId: string;
  authUserId: string;
  status: string;
  createdAt: string;
  email: string;
  username: string;
  fullName: string;
  listingCount: number;
  publishedCount: number;
  inboundInterests: number;
  inboundBids: number;
  pendingVerifications: number;
  lastActivityAt: string | null;
};

export type MarketplaceBuyerDetail = {
  profile: {
    profileId: string;
    authUserId: string;
    status: string;
    deskRole: string;
    metadata: Record<string, unknown>;
    createdAt: string;
    userId: string | null;
    email: string;
    username: string;
    fullName: string;
  };
  interests: Array<{
    interestId: string;
    startupId: string;
    startupTitle: string;
    industry: string | null;
    status: string;
    message: string | null;
    createdAt: string;
  }>;
  bids: Array<{
    bidId: string;
    startupId: string;
    startupTitle: string;
    amount: number;
    currency: string;
    status: string;
    message: string | null;
    createdAt: string;
  }>;
  conversations: Array<{
    conversationId: string;
    startupId: string;
    startupTitle: string;
    status: string;
    createdAt: string;
  }>;
};

export type MarketplaceSellerDetail = {
  profile: MarketplaceBuyerDetail["profile"];
  listings: Array<{
    sellerListingId: string;
    startupId: string;
    startupTitle: string;
    industry: string | null;
    startupStatus: string;
    listingStatus: string;
    publishedAt: string | null;
    updatedAt: string;
    interestCount: number;
    bidCount: number;
  }>;
  verificationRequests: Array<{
    requestId: string;
    startupId: string;
    startupTitle: string;
    status: string;
    submittedAt: string;
  }>;
};

export type MarketplaceCharts = {
  interestsByDay: { day: string; count: number }[];
  bidsByDay: { day: string; count: number }[];
  listingStatusBreakdown: { status: string; count: number }[];
  funnel: { stage: string; count: number; note?: string }[];
};
