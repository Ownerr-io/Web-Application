import type { AppSlug } from "@workspace/api-zod";
import { isAppSlug } from "@/lib/auth/productLock";
import type { User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { ensureMarketplaceProfile } from "@/lib/marketplace/profiles";
import {
  fetchCurrentOwnerrNetworkUser,
  provisionOwnerrNetworkUser,
} from "@/lib/ownerr-network/api";
import {
  clearOwnerrNetworkReferral,
  getStoredOwnerrNetworkReferral,
} from "@/lib/ownerr-network/referral";
import {
  ensureNetworkTablesDetected,
  isUsersTableActive,
} from "@/lib/ownerr-network/dbTables";
import { devLog, devWarn } from "@/lib/observability/devLog";
import { logProductIssue } from "@/lib/observability/productErrors";

type DeskRole = "buyer" | "founder" | null;

function parseDeskRole(
  metadata: Record<string, unknown> | undefined,
): DeskRole {
  const role = metadata?.role;
  if (role === "buyer" || role === "founder") return role;
  return null;
}

function displayNameFromUser(user: User): string | null {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const full = meta?.full_name;
  if (typeof full === "string" && full.trim()) return full.trim();
  return null;
}

let detectedLegacySlugEnforced: boolean | null = null;

function isLegacySlugEnforced(): boolean {
  if (detectedLegacySlugEnforced !== null) return detectedLegacySlugEnforced;
  try {
    const cached = localStorage.getItem("ownerr_legacy_slug_enforced");
    if (cached === "true") {
      detectedLegacySlugEnforced = true;
      return true;
    }
    if (cached === "false") {
      detectedLegacySlugEnforced = false;
      return false;
    }
  } catch {
    void 0;
  }
  return false;
}

function setLegacySlugEnforced(val: boolean) {
  detectedLegacySlugEnforced = val;
  try {
    localStorage.setItem("ownerr_legacy_slug_enforced", val ? "true" : "false");
  } catch {
    void 0;
  }
}

async function upsertPlatformUser(
  authUserId: string,
  email: string,
  displayName: string | null,
) {
  const supabase = getSupabase();
  await ensureNetworkTablesDetected(supabase);
  const isNew = isUsersTableActive();

  if (isNew) {
    const updateData: Record<string, string> = { email };
    if (displayName) {
      updateData.full_name = displayName;
    }
    devLog(
      "[Provisioning] Updating central 'users' table for user:",
      authUserId,
    );
    const { error: userUpdateErr } = await supabase
      .from("users")
      .update(updateData)
      .eq("auth_user_id", authUserId);
    if (userUpdateErr) {
      logProductIssue("provision.ownerr", userUpdateErr, { authUserId });
      throw userUpdateErr;
    }
    return;
  }

  // Legacy schema: platform_users table
  devLog(
    "[Provisioning] Upserting 'platform_users' table for user:",
    authUserId,
  );
  const { error } = await supabase.from("platform_users").upsert(
    {
      auth_user_id: authUserId,
      email,
      display_name: displayName,
    },
    { onConflict: "auth_user_id" },
  );
  if (error) {
    logProductIssue("provision.ownerr", error, { authUserId });
    throw error;
  }
}

async function upsertMembership(
  authUserId: string,
  appSlug: AppSlug,
  role: string,
  profileId: string | null,
): Promise<void> {
  const supabase = getSupabase();
  const usesLegacy =
    appSlug === "ownerr_network" &&
    (!isUsersTableActive() || isLegacySlugEnforced());
  const targetSlug = usesLegacy ? ("unemployed" as AppSlug) : appSlug;

  devLog(
    `[Provisioning] Upserting user_app_access membership for user ${authUserId}. targetSlug: ${targetSlug} (original appSlug: ${appSlug})`,
  );
  const { error } = await supabase.from("user_app_access").upsert(
    {
      auth_user_id: authUserId,
      app_slug: targetSlug,
      role,
      status: "active",
      profile_id: profileId,
    },
    { onConflict: "auth_user_id,app_slug" },
  );
  if (error) {
    if (error.code === "23514" && targetSlug === "ownerr_network") {
      devWarn(
        "[Provisioning] Check constraint violation for 'ownerr_network' in user_app_access. Retrying with 'unemployed' and caching legacy slug mapping.",
      );
      setLegacySlugEnforced(true);
      const { error: retryErr } = await supabase.from("user_app_access").upsert(
        {
          auth_user_id: authUserId,
          app_slug: "unemployed" as AppSlug,
          role,
          status: "active",
          profile_id: profileId,
        },
        { onConflict: "auth_user_id,app_slug" },
      );
      if (retryErr) {
        logProductIssue("provision.ownerr", retryErr, {
          authUserId,
          slug: "unemployed",
        });
        throw retryErr;
      }
      return;
    }
    logProductIssue("provision.ownerr", error, { authUserId, targetSlug });
    throw error;
  }
}

export type OwnerrOsIdentityProfile = {
  id: string;
  auth_user_id: string;
  created_at: string;
  updated_at: string;
};

async function fetchCanonicalUserId(
  authUserId: string,
): Promise<string | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (error) return null;
  return data?.id ?? null;
}

/** OWNERR OS shell identity — canonical `users` row, not legacy `ownerr_profiles`. */
export async function loadOwnerrOsProviderProfile(
  authUserId: string,
): Promise<OwnerrOsIdentityProfile | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabase();
  await ensureNetworkTablesDetected(supabase);

  if (isUsersTableActive()) {
    const { data, error } = await supabase
      .from("users")
      .select("id, auth_user_id, created_at, updated_at")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (error) throw error;
    return (data as OwnerrOsIdentityProfile | null) ?? null;
  }

  const { data, error } = await supabase
    .from("ownerr_profiles")
    .select("id, auth_user_id, created_at, updated_at")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (error) throw error;
  return (data as OwnerrOsIdentityProfile | null) ?? null;
}

async function fetchOrCreateOwnerrProfileId(
  authUserId: string,
): Promise<string> {
  const supabase = getSupabase();
  await ensureNetworkTablesDetected();
  const isNewSchema = isUsersTableActive();

  if (isNewSchema) {
    const canonicalId = await fetchCanonicalUserId(authUserId);
    if (canonicalId) return canonicalId;
    throw new Error("User not found in canonical users table");
  }

  const { data: existing, error: selErr } = await supabase
    .from("ownerr_profiles")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing?.id) return existing.id;

  const { data: created, error: insErr } = await supabase
    .from("ownerr_profiles")
    .upsert({ auth_user_id: authUserId }, { onConflict: "auth_user_id" })
    .select("id")
    .single();
  if (insErr) {
    const { data: retry } = await supabase
      .from("ownerr_profiles")
      .select("id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (retry?.id) return retry.id;
    throw insErr;
  }
  return created.id;
}

async function fetchOrCreateOwnerrNetworkProfilesRow(
  authUserId: string,
  networkUserId: string | null,
): Promise<string | null> {
  const supabase = getSupabase();
  await ensureNetworkTablesDetected();
  const isNewSchema = isUsersTableActive();

  if (isNewSchema) {
    if (!networkUserId) return null;
    const { data: existing, error: selErr } = await supabase
      .from("user_profiles")
      .select("user_id")
      .eq("user_id", networkUserId)
      .maybeSingle();
    if (selErr) throw selErr;
    if (existing?.user_id) return existing.user_id;

    const { data: created, error: insErr } = await supabase
      .from("user_profiles")
      .insert({
        user_id: networkUserId,
        metadata: { ownerr_network_user_id: networkUserId },
      })
      .select("user_id")
      .single();

    if (insErr) {
      const { data: retry } = await supabase
        .from("user_profiles")
        .select("user_id")
        .eq("user_id", networkUserId)
        .maybeSingle();
      if (retry?.user_id) return retry.user_id;
      throw insErr;
    }
    return created.user_id;
  }

  const { data: existing, error: selErr } = await supabase
    .from("ownerr_network_profiles")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing?.id) return existing.id;

  const { data: created, error: insErr } = await supabase
    .from("ownerr_network_profiles")
    .upsert(
      {
        auth_user_id: authUserId,
        metadata: networkUserId
          ? { ownerr_network_user_id: networkUserId }
          : {},
      },
      { onConflict: "auth_user_id" },
    )
    .select("id")
    .single();
  if (insErr) {
    const { data: retry } = await supabase
      .from("ownerr_network_profiles")
      .select("id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (retry?.id) return retry.id;
    throw insErr;
  }
  return created.id;
}

export async function provisionOwnerrProduct(user: User): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const authUserId = user.id;
  const email = user.email ?? "";
  await upsertPlatformUser(authUserId, email, displayNameFromUser(user));
  const profileId = await fetchOrCreateOwnerrProfileId(authUserId);
  await upsertMembership(authUserId, "ownerr_os", "founder", profileId);
}

export async function provisionMarketplaceProduct(user: User): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const authUserId = user.id;
  const email = user.email ?? "";
  const deskRole =
    parseDeskRole(user.user_metadata as Record<string, unknown> | undefined) ??
    "buyer";
  const membershipRole = deskRole === "founder" ? "founder" : "buyer";
  await upsertPlatformUser(authUserId, email, displayNameFromUser(user));
  const profileRow = await ensureMarketplaceProfile(
    user,
    membershipRole === "founder" ? "seller" : "buyer",
  );
  await upsertMembership(
    authUserId,
    "marketplace",
    membershipRole,
    profileRow.id,
  );
}

export async function provisionOwnerrNetworkProduct(user: User): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const authUserId = user.id;
  const email = user.email ?? "";
  const name =
    displayNameFromUser(user) ?? user.email?.split("@")[0] ?? "Member";
  await upsertPlatformUser(authUserId, email, displayNameFromUser(user));

  let networkUserId: string | null = null;
  try {
    let row = await fetchCurrentOwnerrNetworkUser();
    if (!row) {
      const ref = getStoredOwnerrNetworkReferral();
      row = await provisionOwnerrNetworkUser(
        name,
        ref?.referralCode ?? null,
        ref?.sourcePlatform,
      );
      if (ref) clearOwnerrNetworkReferral();
    }
    networkUserId = row?.id ?? null;
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "23505") {
      const row = await fetchCurrentOwnerrNetworkUser();
      networkUserId = row?.id ?? null;
    } else {
      throw err;
    }
  }

  const profileId = await fetchOrCreateOwnerrNetworkProfilesRow(
    authUserId,
    networkUserId,
  );
  await upsertMembership(
    authUserId,
    "ownerr_network",
    "member",
    profileId ?? networkUserId,
  );
}

/** Active product memberships for auth routing (0 / 1 / N app flows). */
export async function listActiveUserAppSlugs(
  authUserId: string,
): Promise<AppSlug[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("user_app_access")
    .select("app_slug")
    .eq("auth_user_id", authUserId)
    .eq("status", "active");
  if (error) {
    logProductIssue("provision.ownerr", error, { authUserId });
    throw error;
  }
  const slugs: AppSlug[] = [];
  for (const row of data ?? []) {
    let raw = (row as { app_slug?: string }).app_slug;
    if (raw === "unemployed") {
      raw = "ownerr_network";
      devLog(
        "[Provisioning] Active 'unemployed' slug detected in database. Activating cached legacy slug mapping.",
      );
      setLegacySlugEnforced(true);
    }
    if (isAppSlug(raw)) slugs.push(raw);
  }
  return slugs;
}

export async function touchProductSession(
  authUserId: string,
  product: AppSlug,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  const usesLegacy =
    product === "ownerr_network" &&
    (!isUsersTableActive() || isLegacySlugEnforced());
  const targetProduct = usesLegacy ? ("unemployed" as AppSlug) : product;

  devLog(
    `[Provisioning] Touching product session for ${authUserId}. targetProduct: ${targetProduct} (original product: ${product})`,
  );
  const { error } = await supabase.from("product_sessions").upsert(
    {
      auth_user_id: authUserId,
      product: targetProduct,
      last_active_at: new Date().toISOString(),
    },
    { onConflict: "auth_user_id" },
  );
  if (error) {
    if (error.code === "23514" && targetProduct === "ownerr_network") {
      devWarn(
        "[Provisioning] touchProductSession check constraint violation for 'ownerr_network'. Retrying with 'unemployed' and caching.",
      );
      setLegacySlugEnforced(true);
      const { error: retryErr } = await supabase
        .from("product_sessions")
        .upsert(
          {
            auth_user_id: authUserId,
            product: "unemployed" as AppSlug,
            last_active_at: new Date().toISOString(),
          },
          { onConflict: "auth_user_id" },
        );
      if (!retryErr) return;
    }

    logProductIssue("provision.ownerr", error, { authUserId, targetProduct });
    const code = error.code ?? "";
    const status = (error as { status?: number }).status;
    const message = typeof error.message === "string" ? error.message : "";

    if (
      code === "42P01" ||
      code === "PGRST205" ||
      code === "PGRST204" ||
      status === 404 ||
      message.includes("product_sessions")
    ) {
      return;
    }
    throw error;
  }
}
