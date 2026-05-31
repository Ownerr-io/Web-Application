import type { FounderAnalytics } from "@/lib/founderTypes";

export type FunnelStage = {
  stage: string;
  count: number;
  note?: string;
};

export type AdminPlatformIntelligence = {
  totalUsers: number;
  newUsersToday: number;
  newUsersWeek: number;
  newUsersMonth: number;
  activeUsers7d: number;
  activeUsers30d: number;
  growthPercentWeek: number;
  marketplaceUsers: number;
  ownerrOsUsers: number;
  ownerrNetworkUsers: number;
  multiProductUsers: number;
  referralSignups: number;
  organicSignups: number;
  referralConversionPercent: number;
  returningUsers: number;
  profileCompletionRate: number;
  dailySignups: { day: string; count: number }[];
  weeklyGrowth: { week: string; count: number }[];
  productAdoption: { product: string; count: number }[];
  trackingGaps?: string[];
};

export type AdminNetworkSummary = {
  totalUsers: number;
  newUsers7d: number;
  newUsers30d: number;
  onboardingCompleted: number;
  verifiedUsers: number;
  platformAdmins: number;
  totalReferrals: number;
  completedReferrals: number;
  walletTransactions: number;
  walletVolume: number;
  totalPoints: number;
  averageWalletBalance?: number;
  funnel?: FunnelStage[];
  topReferrers?: { label: string; count: number }[];
  topEarners?: { label: string; earned: number }[];
  mostActiveUsers?: { label: string; score: number }[];
  fastestGrowingUsers?: { label: string; referrals7d: number }[];
  referralsByDay?: { day: string; count: number }[];
  referralsBySource?: { source: string; count: number }[];
  userHealth?: { flag: string; count: number; note?: string }[];
};

export type AdminMarketplaceIndustryRow = {
  industry: string;
  count: number;
};

export type AdminMarketplaceStartupRow = {
  startupId: string;
  title: string;
  views: number;
  interestCount: number;
  bidCount: number;
  conversationCount: number;
  daysListed: number;
  conversionRate: number;
};

export type AdminMarketplaceSummary = {
  totalListings: number;
  publishedListings: number;
  draftListings: number;
  archivedListings: number;
  verifiedListings: number;
  totalSubmissions: number;
  pendingSubmissions: number;
  avgSubmissionScore: number;
  topIndustries: AdminMarketplaceIndustryRow[];
  funnel?: FunnelStage[];
  dealPipeline?: { status: string; count: number }[];
  startupPerformance?: AdminMarketplaceStartupRow[];
  industryAnalytics?: {
    industry: string;
    listingCount: number;
    interestCount: number;
    bidCount: number;
  }[];
  topBuyers?: {
    buyerProfileId: string;
    label: string;
    interests: number;
    bids: number;
  }[];
  trackingGaps?: string[];
};

export type AdminOsSummary = {
  totalListings: number;
  publishedListings: number;
  draftListings: number;
  founderAnalytics: FounderAnalytics;
  founderFunnel?: FunnelStage[];
  trackingGaps?: string[];
};

export type AdminPlatformSummary = {
  network: AdminNetworkSummary;
  marketplace: AdminMarketplaceSummary;
  ownerrOs: AdminOsSummary;
  platform?: AdminPlatformIntelligence;
  generatedAt: string;
};

export type AdminOperationsGovernance = {
  pendingSubmissions: number;
  draftListings: number;
  openBids: number;
  pendingReferrals: number;
  onboardingIncomplete: number;
  newUsers24h: number;
  platformAdmins: number;
};

export type AdminOperationsSummary = {
  auditLogsAvailable: boolean;
  auditLogsNote: string;
  activityFeed: { type: string; at: string; label: string }[];
  moderation: {
    suspendedUsers: number;
    flaggedProfiles: number;
    suspendedMarketplaceProfiles: number;
    flaggedListingsNote?: string;
  };
  governance?: AdminOperationsGovernance;
};

export type AdminSystemTableCount = {
  name: string;
  rows: number;
  group?: string;
};

export type AdminSystemHealth = {
  tableCounts: AdminSystemTableCount[];
  productSessionsTotal: number;
  productSessionsActive24h: number;
  usersTotal?: number;
  usersDeleted?: number;
  platformAdmins?: number;
  storageUsageAvailable: boolean;
  authFailuresAvailable: boolean;
  apiErrorsAvailable: boolean;
  rpcErrorsAvailable: boolean;
  notes?: string[];
};
