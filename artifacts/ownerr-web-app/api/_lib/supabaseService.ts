import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  assertApiSecretsConfigured,
  assertServerRuntime,
} from "./serverRuntimeGuard.js";

let cached: SupabaseClient | null = null;

export function getSupabaseServiceClient(): SupabaseClient {
  assertServerRuntime("getSupabaseServiceClient");
  assertApiSecretsConfigured();

  if (cached) return cached;

  const url = process.env.SUPABASE_URL!.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim();

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
