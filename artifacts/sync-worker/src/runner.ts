import { claimAndProcessOneJob } from "@workspace/integrations-sync";
import { pollMs, supabase, workerId } from "./client.js";
import "./httpServer.js";

const revalidationMs = Number(process.env.REVALIDATION_SWEEP_MS ?? 3_600_000);

async function runRevalidationSweep() {
  try {
    const { data, error } = await supabase.rpc(
      "run_verification_revalidation_sweep",
      {
        p_limit: 150,
      },
    );
    if (error) {
      console.error("revalidation sweep", error.message);
      return;
    }
    if (data && typeof data === "object") {
      console.info("revalidation sweep", data);
    }
  } catch (e) {
    console.error("revalidation sweep", e instanceof Error ? e.message : e);
  }
}

async function tick() {
  try {
    await claimAndProcessOneJob(supabase, workerId);
  } catch (e) {
    console.error("claim error", e instanceof Error ? e.message : e);
  }
}

console.info(`Sync worker ${workerId} polling every ${pollMs}ms`);
setInterval(() => {
  void tick();
}, pollMs);
setInterval(() => {
  void runRevalidationSweep();
}, revalidationMs);
void tick();
void runRevalidationSweep();
