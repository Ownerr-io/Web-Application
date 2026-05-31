export type FounderListFilter =
  | "all"
  | "high_performers"
  | "no_visits"
  | "has_signups";

export type OwnerrOsFounderRow = {
  id: string;
  founderId: string;
  founderName: string;
  startupName: string;
  referralCode: string;
  visitCount: number;
  signupCount: number;
  conversionRate: number;
  viralScore: number;
  category: string | null;
  location: string | null;
  createdAt: string;
};

export type OwnerrOsFounderDetail = {
  founder: {
    founderId: string;
    authUserId: string | null;
    founderName: string;
    startupName: string;
    tagline: string;
    description: string;
    website: string | null;
    socialLinks: Record<string, string> | null;
    category: string | null;
    location: string | null;
    referralCode: string;
    referralLink: string;
    shareCardUrl: string | null;
    visitCount: number;
    signupCount: number;
    createdAt: string;
  };
  recentEvents: {
    eventType: string;
    sourcePlatform: string | null;
    createdAt: string;
  }[];
  trafficBySource: { source: string; count: number }[];
  osListings: {
    id: string;
    title: string;
    status: string;
    visibility: string;
    updatedAt: string;
  }[];
};

export type OwnerrOsCharts = {
  submissionsByDay: { day: string; count: number }[];
  visitsByDay: { day: string; count: number }[];
  signupsByDay: { day: string; count: number }[];
  trafficSources: { source: string; count: number }[];
  listingStatusBreakdown: { status: string; count: number }[];
  founderFunnel: { stage: string; count: number; note?: string }[];
};
