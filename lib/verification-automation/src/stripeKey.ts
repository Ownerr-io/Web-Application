import type { SupabaseClient } from "@supabase/supabase-js";
import { SchemaTables as T } from "@workspace/db-schema";

/** Seller-connected Stripe secret (revenue integration), not platform env. */
export async function resolveStripeSecretKeyForStartup(
  supabase: SupabaseClient,
  startupId: string,
): Promise<string | null> {
  const { data: provider } = await supabase
    .from(T.trust.providers)
    .select("id")
    .eq("slug", "stripe")
    .maybeSingle();
  if (!provider?.id) return null;

  const { data: conn } = await supabase
    .from(T.trust.integrations)
    .select("id")
    .eq("startup_id", startupId)
    .eq("provider_id", provider.id)
    .maybeSingle();
  if (!conn?.id) return null;

  const { data: bundle, error } = await supabase.rpc(
    "worker_get_connection_secrets",
    {
      p_connection_id: conn.id,
    },
  );
  if (error || !bundle || typeof bundle !== "object") return null;

  const secret = (bundle as { secret?: unknown }).secret;
  if (typeof secret !== "string" || !secret.startsWith("sk_")) return null;
  return secret.trim();
}
