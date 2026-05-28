import type { AuthRole } from "@/lib/auth/types";
import { inferAuthRoleFromMarketplaceAppPath } from "@/lib/auth/marketplaceDeskRole";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

/** Align JWT user_metadata.role with the desk URL the user is opening. */
export async function syncMarketplaceDeskRoleForPath(
  returnTo: string | null,
): Promise<AuthRole | null> {
  if (!returnTo || !isSupabaseConfigured()) return null;
  const role = inferAuthRoleFromMarketplaceAppPath(returnTo);
  if (!role) return null;
  const supabase = getSupabase();
  const { error } = await supabase.auth.updateUser({ data: { role } });
  if (error) throw error;
  await supabase.auth.refreshSession();
  return role;
}
