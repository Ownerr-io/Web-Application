import type { AuthRole } from "@/lib/auth/types";

export type Category =
  | "Content Creation"
  | "Mobile Apps"
  | "SaaS"
  | "Education"
  | "Crypto & Web3"
  | "Developer Tools"
  | "Artificial Intelligence"
  | "Health"
  | "Marketing"
  | "Customer Support"
  | "Social Media";

export interface Startup {
  slug: string;
  name: string;
  category: Category;
  revenue: number;
  peakMrr?: number;
  price?: number;
  multiple?: number;
  forSale: boolean;
  founderHandle: string;
  /** Supabase auth user id when loaded from DB (for ownership checks). */
  founderUserId?: string | null;
  founderDisplayName?: string;
  listingUsername?: string;
  description: string;
  monthlyRevenueSeries: { month: string; value: number }[];
  logoColor: string;
  foundedYear: number;
  ttmProfit?: number;
  customers: number;
  momGrowth: number;
  listingViews?: number;
  listingFavorites?: number;
  revenueGrowth30dPct?: number | null;
  askingPriceStrike?: number;
  businessScore: number;
  lendScore: number;
  acquisitionPower: number;
  revenueVerified: boolean;
  revenueProvider: string | null;
  domainVerified: boolean;
  /** Public company site (verified domain or metadata); used for Visit links. */
  companyWebsiteUrl?: string | null;
  listingCreatedAt?: string | null;
  listingUpdatedAt?: string | null;
  /** Raw metadata from DB (seller intake, listing fields). */
  metadata?: Record<string, unknown>;
  trafficVerified: boolean;
  trafficMonthlyVisitors: number | null;
  trafficTrend: "up" | "down" | "flat" | null;
}

export type StartupSeed = Omit<
  Startup,
  | "businessScore"
  | "lendScore"
  | "acquisitionPower"
  | "revenueVerified"
  | "revenueProvider"
  | "domainVerified"
  | "trafficVerified"
  | "trafficMonthlyVisitors"
  | "trafficTrend"
> &
  Partial<
    Pick<
      Startup,
      | "revenueVerified"
      | "revenueProvider"
      | "domainVerified"
      | "trafficVerified"
      | "trafficMonthlyVisitors"
      | "trafficTrend"
    >
  >;

export interface FeedEvent {
  id: string;
  timestamp: string;
  content: string;
}

export interface Founder {
  handle: string;
  name: string;
  twitter: string;
  avatarSeed: string;
  bio: string;
  startupSlugs: string[];
  skills: string[];
  lookingForCofounder: boolean;
}

export type DeskMarketplaceRole = "buyer" | "seller";

export type TimeSeriesPoint = {
  label: string;
  timestamp: string;
  value: number;
};

export type VerificationStatus =
  | "unverified"
  | "pending"
  | "verified"
  | "failed";

export type VerificationSnapshot = {
  status: VerificationStatus;
  provider: string | null;
  updatedAt: string | null;
  requestedAt: string | null;
  note: string;
  sourceLabel?: string;
  mode?: "manual" | "google_analytics" | "dns_txt";
  expectedValue?: string | null;
};

export type TrustLabel = "High Trust" | "Medium Trust" | "Low Trust";

export type DealRelationshipStage =
  | "interested"
  | "contacted"
  | "negotiating"
  | "closed"
  | "withdrawn";

export type BidStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "countered"
  | "accepted"
  | "rejected"
  | "declined"
  | "withdrawn"
  | "expired"
  | "superseded"
  | "closed_due_to_accepted_offer"
  | "due_diligence"
  | "closed";

export type AcquisitionStage =
  | "accepted"
  | "due_diligence"
  | "legal_review"
  | "asset_transfer"
  | "payment_pending"
  | "closed";

export type MarketplaceBid = {
  id: string;
  startupId: string;
  startupSlug: string;
  buyerProfileId: string;
  buyerAuthUserId: string;
  buyerDisplayName: string;
  amount: number;
  currency: string;
  status: BidStatus;
  message: string | null;
  proofOfFunds?: string | null;
  expiresAt?: string | null;
  conversationId?: string | null;
  acquisitionStage?: AcquisitionStage | null;
  lastActorRole?: "buyer" | "seller" | null;
  acceptedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BidVersion = {
  versionNumber: number;
  actorRole: "buyer" | "seller" | "system";
  actorUserId: string | null;
  amount: number;
  currency: string;
  message: string | null;
  proofOfFunds: string | null;
  createdAt: string;
};

export type BuyerOfferRow = MarketplaceBid & {
  startupTitle: string;
  trustScore: number | null;
  listingLifecycle: string;
  offersOpen: boolean;
};

export type SellerOfferRow = {
  id: string;
  buyerName: string;
  buyerAuthUserId: string;
  amount: number;
  currency: string;
  status: BidStatus;
  message: string | null;
  proofOfFunds: string | null;
  expiresAt: string | null;
  conversationId: string | null;
  acquisitionStage: AcquisitionStage | null;
  lastActorRole: string | null;
  createdAt: string;
  updatedAt: string;
  acceptedAt: string | null;
};

export type SellerOfferStartupGroup = {
  startupId: string;
  startupSlug: string;
  startupTitle: string;
  listingLifecycle: string;
  offersOpen: boolean;
  offerCount: number;
  highestOffer: number | null;
  latestActivity: string;
  offers: SellerOfferRow[];
};

export type InboxThread = {
  conversationId: string;
  startupSlug: string;
  startupTitle: string;
  buyerName: string;
  sellerName: string;
  lastMessage: string;
  updatedAt: string;
  unreadCount: number;
  /** open = messaging allowed; closed = read-only (e.g. after offer declined). */
  status: "open" | "closed" | "archived";
};

export type ConversationMessage = {
  id: string;
  conversationId: string;
  senderUserId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export type ClaimSpotRole = "founder" | "investor";

export type ClaimSpotEntry = {
  id: string;
  name: string;
  handle: string;
  email: string;
  avatarUrl: string;
  role: ClaimSpotRole;
  claimedAt: string;
  tagline?: string;
};

export type MarketplaceThreadMessage = {
  id: string;
  senderUserId: string;
  senderName: string;
  senderRole: AuthRole;
  body: string;
  createdAt: string;
};

export type MarketplaceInterestRecord = {
  id: string;
  listingId: string;
  buyerUserId: string;
  buyerName: string;
  buyerRole: AuthRole;
  email: string;
  offerAmount: number | null;
  createdAt: string;
  updatedAt: string;
  stage: DealRelationshipStage;
  messages: MarketplaceThreadMessage[];
  /** Latest structured offer status from bids, when present. */
  offerBidStatus?: BidStatus | null;
  /** Set when interest syncs to conversations/messages for inbox. */
  conversationId?: string;
};

export type MarketplaceListing = Startup & {
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
  nicheTags: string[];
  keywords: string[];
  revenueHistory: TimeSeriesPoint[];
  trafficHistory: TimeSeriesPoint[];
  growthPct: number;
  trustScore: number;
  trustLabel: TrustLabel;
  verification: {
    revenue: VerificationSnapshot;
    domain: VerificationSnapshot;
    traffic: VerificationSnapshot;
  };
};

export type StartupRow = {
  id: string;
  slug: string;
  founder_user_id: string | null;
  founder_handle: string | null;
  title: string;
  tagline: string | null;
  description: string;
  industry: string | null;
  asking_price: number | null;
  currency: string;
  annual_revenue: number | null;
  profit: number | null;
  growth_rate: number | null;
  team_size: number | null;
  founded_year: number | null;
  verified: boolean;
  visibility: string;
  status: string;
  listing_lifecycle?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};
