export type OwnerrNetworkUser = {
  id: string;
  auth_user_id: string;
  name: string;
  username: string;
  email: string;
  profile_image: string | null;
  referral_code: string;
  referred_by: string | null;
  points: number;
  wallet_balance: number;
  total_earned: number;
  total_referrals: number;
  leaderboard_rank: number | null;
  subscription_status: string;
  profile_verified: boolean;
  last_daily_reward_at: string | null;
  signup_source: string | null;
  created_at: string;
};

export type OwnerrNetworkProfileRow = {
  id: string;
  auth_user_id: string;
  display_name: string | null;
  username: string | null;
  user_type: string | null;
  skill_tags: string[];
  work_preference: string | null;
  goals: string | null;
  experience_level: string | null;
  availability: string | null;
  seriousness_score: string | null;
  onboarding_completed_at: string | null;
  profile_completion_pct: number;
  profile_verified?: boolean;
};

export type OwnerrNetworkLedgerRow = {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  idempotency_key: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type OwnerrNetworkBadge = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

export type OwnerrNetworkReferralRow = {
  id: string;
  referrer_id: string;
  referee_id: string;
  status: string;
  created_at: string;
  completed_at: string | null;
};

export type LeaderboardEntry = Pick<
  OwnerrNetworkUser,
  "id" | "username" | "name" | "profile_image" | "points" | "total_referrals"
> & {
  network_score?: number;
  profile_completion_pct?: number;
  profile_verified?: boolean;
  user_type?: string | null;
  skill_tags?: string[];
  goals?: string | null;
  work_preference?: string | null;
  experience_level?: string | null;
  availability?: string | null;
};

export type DiscoverProfile = {
  user_id: string;
  auth_user_id: string;
  name: string;
  username: string;
  profile_image: string | null;
  user_type: string | null;
  skill_tags: string[];
  work_preference: string | null;
  goals: string | null;
  experience_level: string | null;
  availability: string | null;
  points: number;
  total_referrals: number;
  profile_verified: boolean;
  profile_completion_pct: number;
  network_score: number;
};
