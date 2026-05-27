export type FounderSocialLinks = {
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  whatsapp?: string;
};

export type FounderSubmissionRecord = {
  id: string;
  founderName: string;
  startupName: string;
  tagline: string;
  description: string;
  website?: string | null;
  socialLinks: FounderSocialLinks;
  founderPhoto?: string | null;
  category?: string | null;
  location?: string | null;
  referralCode: string;
  referralLink: string;
  shareCardUrl?: string | null;
  visitCount: number;
  referralSignupCount: number;
  createdAt: string;
};

export type CreateFounderInput = {
  founderName: string;
  startupName: string;
  tagline: string;
  description: string;
  website?: string;
  socialLinks?: FounderSocialLinks;
  founderPhoto?: string;
  category?: string;
  location?: string;
  /** data URL or base64 PNG for OG / LinkedIn card endpoint */
  shareCardPngBase64?: string;
};

export type FounderAnalytics = {
  totalFounders: number;
  totalReferralClicks: number;
  totalConversions: number;
  topFounders: Array<{
    id: string;
    founderName: string;
    startupName: string;
    referralCode: string;
    visitCount: number;
    referralSignupCount: number;
    viralScore: number;
  }>;
  topStartups: Array<{
    startupName: string;
    founders: number;
    visitCount: number;
    referralSignupCount: number;
  }>;
  trafficSources: Array<{ sourcePlatform: string; count: number }>;
};
