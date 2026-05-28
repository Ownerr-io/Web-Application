import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod";

export const founderSocialLinksSchema = z.object({
  linkedin: z.string().optional(),
  twitter: z.string().optional(),
  instagram: z.string().optional(),
  whatsapp: z.string().optional(),
});

export type FounderSocialLinks = z.infer<typeof founderSocialLinksSchema>;

export const founderSubmissionsTable = pgTable(
  "founder_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    founderName: text("founder_name").notNull(),
    startupName: text("startup_name").notNull(),
    tagline: text("tagline").notNull(),
    description: text("description").notNull(),
    website: text("website"),
    socialLinks: jsonb("social_links").$type<FounderSocialLinks>().default({}),
    founderPhoto: text("founder_photo"),
    category: text("category"),
    location: text("location"),
    referralCode: text("referral_code").notNull(),
    referralLink: text("referral_link").notNull(),
    shareCardUrl: text("share_card_url"),
    visitCount: integer("visit_count").notNull().default(0),
    referralSignupCount: integer("referral_signup_count").notNull().default(0),
    authUserId: uuid("auth_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    referralCodeIdx: uniqueIndex("founder_submissions_referral_code_idx").on(
      table.referralCode,
    ),
    createdAtIdx: index("founder_submissions_created_at_idx").on(
      table.createdAt,
    ),
    authUserCreatedIdx: index("founder_submissions_auth_user_created_idx").on(
      table.authUserId,
      table.createdAt,
    ),
  }),
);

export const founderReferralEventsTable = pgTable(
  "founder_referral_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    founderId: uuid("founder_id")
      .notNull()
      .references(() => founderSubmissionsTable.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    sourcePlatform: text("source_platform"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    founderIdIdx: index("founder_referral_events_founder_id_idx").on(
      table.founderId,
    ),
    eventTypeIdx: index("founder_referral_events_event_type_idx").on(
      table.eventType,
    ),
  }),
);

export type InsertFounderSubmission = {
  founderName: string;
  startupName: string;
  tagline: string;
  description: string;
  website?: string | null;
  socialLinks?: FounderSocialLinks;
  founderPhoto?: string | null;
  category?: string | null;
  location?: string | null;
  referralCode: string;
  referralLink: string;
  shareCardUrl?: string | null;
  authUserId?: string | null;
};
export type FounderSubmission = typeof founderSubmissionsTable.$inferSelect;
export type FounderReferralEvent =
  typeof founderReferralEventsTable.$inferSelect;
