export type NetworkMemberRow = {
  id: string;
  userId: string;
  username: string;
  email: string;
  fullName: string;
  status: string;
  verificationStatus: string;
  platformRole: string;
  referralCode: string;
  createdAt: string;
  lastLoginAt: string | null;
  onboardingCompleted: boolean;
  profileCompletionScore: number;
  userType: string | null;
  headline: string | null;
  points: number;
  walletBalance: number;
  referralsMade: number;
  referralsReceived: number;
};

export type NetworkMemberDetail = {
  account: {
    userId: string;
    authUserId: string;
    username: string;
    email: string;
    fullName: string;
    status: string;
    verificationStatus: string;
    platformRole: string;
    referralCode: string;
    referredByUserId: string | null;
    createdAt: string;
    lastLoginAt: string | null;
    trustScore: number;
  };
  profile: {
    headline?: string | null;
    bio?: string | null;
    userType?: string | null;
    location?: string | null;
    remotePreference?: string | null;
    experienceLevel?: string | null;
    skillTags?: string[];
    industries?: string[];
    onboardingCompleted?: boolean;
    profileCompletionScore?: number;
    visibility?: string;
    updatedAt?: string;
  };
  scores: {
    points: number;
    referralsScore: number;
    completionScore: number;
    verificationScore: number;
    activityScore: number;
    networkScore: number;
    updatedAt: string;
  } | null;
  wallet: {
    balance: number;
    totalEarned: number;
    totalSpent: number;
    lockedBalance: number;
  } | null;
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    source: string | null;
    createdAt: string;
  }>;
  referralsMade: Array<{
    id: string;
    status: string;
    source: string | null;
    rewardAmount: number;
    createdAt: string;
    referredUsername: string;
  }>;
  referralsReceived: Array<{
    id: string;
    status: string;
    source: string | null;
    createdAt: string;
    referrerUsername: string;
  }>;
  badges: Array<{ badgeSlug: string; awardedAt: string }>;
};

export type NetworkCharts = {
  signupsByDay: { day: string; count: number }[];
  referralsByDay: { day: string; count: number }[];
  walletVolumeByDay: { day: string; volume: number }[];
  referralStatusBreakdown: { status: string; count: number }[];
  profileCompletionBuckets: { bucket: string; count: number }[];
};

export type MemberListFilter =
  | "all"
  | "verification_pending"
  | "incomplete_profile"
  | "inactive"
  | "suspended";
