import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const APP_SLUGS = ["ownerr_os", "marketplace", "unemployed"] as const;
export type AppSlugDb = (typeof APP_SLUGS)[number];

export const MEMBERSHIP_STATUSES = ["active", "invited", "suspended"] as const;
export type MembershipStatusDb = (typeof MEMBERSHIP_STATUSES)[number];

export const platformUsersTable = pgTable(
  "platform_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authUserId: uuid("auth_user_id").notNull().unique(),
    email: text("email").notNull(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    preferredAppSlug: text("preferred_app_slug"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    authUserIdx: index("platform_users_auth_user_id_idx").on(table.authUserId),
    preferredAppSlugIdx: index("platform_users_preferred_app_slug_idx").on(
      table.preferredAppSlug,
    ),
    createdAtIdx: index("platform_users_created_at_idx").on(table.createdAt),
  }),
);

export const userAppAccessTable = pgTable(
  "user_app_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authUserId: uuid("auth_user_id").notNull(),
    appSlug: text("app_slug").$type<AppSlugDb>().notNull(),
    role: text("role").notNull().default("member"),
    status: text("status")
      .$type<MembershipStatusDb>()
      .notNull()
      .default("active"),
    profileId: uuid("profile_id"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    authAppUnique: uniqueIndex("user_app_access_auth_user_app_slug_key").on(
      table.authUserId,
      table.appSlug,
    ),
    authUserIdx: index("user_app_access_auth_user_id_idx").on(table.authUserId),
    appSlugIdx: index("user_app_access_app_slug_idx").on(table.appSlug),
    statusIdx: index("user_app_access_status_idx").on(table.status),
    profileIdIdx: index("user_app_access_profile_id_idx").on(table.profileId),
    authUserStatusIdx: index("user_app_access_auth_user_status_idx").on(
      table.authUserId,
      table.status,
    ),
    createdAtIdx: index("user_app_access_created_at_idx").on(table.createdAt),
  }),
);

export const ownerrProfilesTable = pgTable(
  "ownerr_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authUserId: uuid("auth_user_id").notNull().unique(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    authUserIdx: index("ownerr_profiles_auth_user_id_idx").on(table.authUserId),
    createdAtIdx: index("ownerr_profiles_created_at_idx").on(table.createdAt),
  }),
);

export const marketplaceProfilesTable = pgTable(
  "marketplace_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authUserId: uuid("auth_user_id").notNull().unique(),
    deskRole: text("desk_role"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    authUserIdx: index("marketplace_profiles_auth_user_id_idx").on(
      table.authUserId,
    ),
    deskRoleIdx: index("marketplace_profiles_desk_role_idx").on(table.deskRole),
    createdAtIdx: index("marketplace_profiles_created_at_idx").on(
      table.createdAt,
    ),
  }),
);

export const unemployedProfilesTable = pgTable(
  "unemployed_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authUserId: uuid("auth_user_id").notNull().unique(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    authUserIdx: index("unemployed_profiles_auth_user_id_idx").on(
      table.authUserId,
    ),
    createdAtIdx: index("unemployed_profiles_created_at_idx").on(
      table.createdAt,
    ),
  }),
);
