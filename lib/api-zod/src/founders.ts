import { z } from "zod";

export const FounderSocialLinksSchema = z.object({
  linkedin: z.string().optional(),
  twitter: z.string().optional(),
  instagram: z.string().optional(),
  whatsapp: z.string().optional(),
});

export const CreateFounderSubmissionBody = z.object({
  founderName: z.string().min(1).max(120),
  startupName: z.string().min(1).max(160),
  tagline: z.string().min(1).max(280),
  description: z.string().min(1).max(4000),
  website: z.string().url().optional().or(z.literal("")),
  socialLinks: FounderSocialLinksSchema.optional(),
  founderPhoto: z.string().optional(),
  category: z.string().max(80).optional(),
  location: z.string().max(120).optional(),
  siteOrigin: z.string().url().optional(),
  /** PNG as data URL or raw base64 — stored for LinkedIn OG / card.png endpoint */
  shareCardPngBase64: z.string().max(4_000_000).optional(),
});

export const FounderSubmissionResponse = z.object({
  id: z.string().uuid(),
  founderName: z.string(),
  startupName: z.string(),
  tagline: z.string(),
  description: z.string(),
  website: z.string().nullable().optional(),
  socialLinks: FounderSocialLinksSchema,
  founderPhoto: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  referralCode: z.string(),
  referralLink: z.string(),
  shareCardUrl: z.string().nullable().optional(),
  visitCount: z.number().int(),
  referralSignupCount: z.number().int(),
  createdAt: z.string(),
});

export const TrackReferralBody = z.object({
  referralCode: z.string().min(4).max(32),
  eventType: z.enum(["visit", "signup"]),
  sourcePlatform: z.string().max(64).optional(),
});

export const TrackReferralResponse = z.object({
  ok: z.literal(true),
  visitCount: z.number().int().optional(),
  referralSignupCount: z.number().int().optional(),
});

export const FounderAnalyticsResponse = z.object({
  totalFounders: z.number().int(),
  totalReferralClicks: z.number().int(),
  totalConversions: z.number().int(),
  topFounders: z.array(
    z.object({
      id: z.string().uuid(),
      founderName: z.string(),
      startupName: z.string(),
      referralCode: z.string(),
      visitCount: z.number().int(),
      referralSignupCount: z.number().int(),
      viralScore: z.number(),
    }),
  ),
  topStartups: z.array(
    z.object({
      startupName: z.string(),
      founders: z.number().int(),
      visitCount: z.number().int(),
      referralSignupCount: z.number().int(),
    }),
  ),
  trafficSources: z.array(
    z.object({
      sourcePlatform: z.string(),
      count: z.number().int(),
    }),
  ),
});

export type CreateFounderSubmissionBody = z.infer<typeof CreateFounderSubmissionBody>;
export type FounderSubmissionResponse = z.infer<typeof FounderSubmissionResponse>;
