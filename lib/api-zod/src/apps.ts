import { z } from "zod";

export const AppSlugSchema = z.enum(["ownerr_os", "marketplace", "ownerr_network"]);
export type AppSlug = z.infer<typeof AppSlugSchema>;

export const MembershipStatusSchema = z.enum(["active", "invited", "suspended"]);
export type MembershipStatus = z.infer<typeof MembershipStatusSchema>;

export const UserAppMembershipSchema = z.object({
  appSlug: AppSlugSchema,
  role: z.string(),
  status: MembershipStatusSchema,
  profileId: z.string().uuid().nullable(),
});

export const PlatformUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  preferredAppSlug: AppSlugSchema.nullable(),
});

export const AppsMeResponseSchema = z.object({
  user: PlatformUserSchema,
  memberships: z.array(UserAppMembershipSchema),
  defaultApp: AppSlugSchema.nullable(),
  hasMultipleApps: z.boolean(),
});

export const SelectAppBodySchema = z.object({
  appSlug: AppSlugSchema,
});

export const SelectAppResponseSchema = z.object({
  ok: z.literal(true),
  redirectPath: z.string(),
  appSlug: AppSlugSchema,
});

export const AppLauncherCardSchema = z.object({
  appSlug: AppSlugSchema,
  title: z.string(),
  description: z.string(),
  enterPath: z.string(),
});

export const AppLauncherResponseSchema = z.object({
  cards: z.array(AppLauncherCardSchema),
});

export const CreateMembershipBodySchema = z.object({
  appSlug: AppSlugSchema,
});

export const CreateMembershipResponseSchema = z.object({
  membership: UserAppMembershipSchema,
  redirectPath: z.string(),
});

export type AppsMeResponse = z.infer<typeof AppsMeResponseSchema>;
export type AppLauncherResponse = z.infer<typeof AppLauncherResponseSchema>;
export type UserAppMembership = z.infer<typeof UserAppMembershipSchema>;
export type SelectAppResponse = z.infer<typeof SelectAppResponseSchema>;
export type CreateMembershipResponse = z.infer<typeof CreateMembershipResponseSchema>;
