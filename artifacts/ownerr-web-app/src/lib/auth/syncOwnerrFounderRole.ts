import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

/** OWNERR OS desk routes require founder role in JWT metadata for legacy guards. */
export async function syncOwnerrFounderRole(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  const { error } = await supabase.auth.updateUser({
    data: { role: "founder" },
  });
  if (error) throw error;
  await supabase.auth.refreshSession();
}
