import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * Whether the signed-in user is a platform admin (public.users.role = 'admin').
 * Uses Supabase RPC `is_platform_admin` (SECURITY DEFINER); falls back to a direct read.
 */
export async function fetchPlatformAdminFromDb(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const supabase = getSupabase();
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user) return false;

  const { data, error } = await supabase.rpc("is_platform_admin");
  if (!error) return Boolean(data);

  if (import.meta.env.DEV) {
    console.warn(
      "[platformAdmin] is_platform_admin RPC failed; falling back to users.role read",
      error.message,
    );
  }

  const { data: row, error: rowErr } = await supabase
    .from("users")
    .select("role")
    .eq("auth_user_id", authData.user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (rowErr) return false;
  return row?.role === "admin";
}
