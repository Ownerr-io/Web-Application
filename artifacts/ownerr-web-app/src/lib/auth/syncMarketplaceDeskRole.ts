import type { AuthRole } from "@/lib/auth/types";
import { inferAuthRoleFromMarketplaceAppPath } from "@/lib/auth/marketplaceDeskRole";
import {
  ensureBuyerProfile,
  ensureSellerProfile,
} from "@/lib/marketplace/profiles";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

/** Align JWT metadata with the desk URL and ensure the matching marketplace profile row exists. */
export async function syncMarketplaceDeskRoleForPath(
  returnTo: string | null,
): Promise<AuthRole | null> {
  if (!returnTo || !isSupabaseConfigured()) return null;
  const role = inferAuthRoleFromMarketplaceAppPath(returnTo);
  if (!role) return null;
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    if (role === "buyer") await ensureBuyerProfile(user);
    else await ensureSellerProfile(user);
  }
  const { error } = await supabase.auth.updateUser({
    data: { role, desk_role: role === "founder" ? "seller" : "buyer" },
  });
  if (error) throw error;
  await supabase.auth.refreshSession();
  return role;
}
