import { createClient } from "@supabase/supabase-js";
import {
  claimAndProcessOneJob,
  runIntegrationSyncBatch,
} from "@workspace/integrations-sync";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const workerId = process.env.SYNC_WORKER_ID ?? "sync-worker-1";
const pollMs = Number(process.env.SYNC_POLL_MS ?? 5000);

if (!supabaseUrl || !serviceKey) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export {
  supabase,
  workerId,
  pollMs,
  claimAndProcessOneJob,
  runIntegrationSyncBatch,
};
