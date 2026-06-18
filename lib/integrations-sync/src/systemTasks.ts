import type { SupabaseClient } from "@supabase/supabase-js";
import { SchemaTables as T } from "@workspace/db-schema";
import { probeDomainVerification } from "@workspace/integrations-core";
import {
  verificationWorkerError,
  verificationWorkerLog,
  verificationWorkerWarn,
} from "./verificationLog.js";

type SysTaskRow = {
  id: string;
  task_type: string;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
};

const TASK_ID_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseClaimedSysTaskRow(data: unknown): SysTaskRow | null {
  if (data == null) return null;
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;
  if (!row || typeof row !== "object") return null;
  const idRaw = row.id;
  if (idRaw == null || idRaw === "") return null;
  const id = String(idRaw);
  if (!TASK_ID_UUID.test(id)) return null;
  const taskTypeRaw = row.task_type;
  if (typeof taskTypeRaw !== "string" || !taskTypeRaw.trim()) return null;
  return {
    id,
    task_type: taskTypeRaw,
    payload: (row.payload as Record<string, unknown>) ?? {},
    attempts: typeof row.attempts === "number" ? row.attempts : 0,
    max_attempts: typeof row.max_attempts === "number" ? row.max_attempts : 5,
  };
}

async function claimOneTask(
  supabase: SupabaseClient,
  workerId: string,
): Promise<SysTaskRow | null> {
  const { data, error } = await supabase.rpc("claim_sys_worker_task", {
    p_worker_id: workerId,
  });
  if (error) throw new Error(error.message);
  return parseClaimedSysTaskRow(data);
}

async function completeTask(
  supabase: SupabaseClient,
  taskId: string,
  ok: boolean,
  errorMessage?: string,
): Promise<void> {
  await supabase.rpc("complete_sys_worker_task", {
    p_task_id: taskId,
    p_success: ok,
    p_error: ok ? null : (errorMessage ?? "task failed"),
  });
}

async function upsertAlert(
  supabase: SupabaseClient,
  input: { severity: string; category: string; message: string; details?: any },
): Promise<void> {
  try {
    await supabase.from(T.system.platformAlerts).insert({
      severity: input.severity,
      category: input.category,
      message: input.message,
      details: input.details ?? {},
    });
  } catch {
    /* alerts optional */
  }
}

async function runMvRefresh(supabase: SupabaseClient): Promise<void> {
  await supabase.rpc("run_marketplace_materialized_view_refresh");
}

async function runDomainRevalidation(
  supabase: SupabaseClient,
  input: { challengeId: string; startupId: string; graceDays?: number },
): Promise<void> {
  const graceDays =
    typeof input.graceDays === "number" && input.graceDays > 0
      ? input.graceDays
      : 7;

  const { data: ch, error } = await supabase
    .from(T.trust.domainChallenges)
    .select(
      "id,startup_id,host,expected_record,method,domain,verified_at,last_revalidated_at,revalidation_fail_count",
    )
    .eq("id", input.challengeId)
    .maybeSingle();
  if (error || !ch) {
    throw new Error(error?.message ?? "domain challenge not found");
  }

  const host = String((ch as any).host);
  const expected = String((ch as any).expected_record);
  const method = String((ch as any).method) as "txt" | "cname";
  const verifiedAt = (ch as any).verified_at as string | null;

  const probe = await probeDomainVerification({
    host,
    expected,
    method,
  });

  const passed = probe.pass === true;
  const reason = passed ? null : probe.diagnostic.status;

  await supabase.from(T.trust.domainRevalidationRuns).insert({
    startup_id: input.startupId,
    challenge_id: input.challengeId,
    host,
    expected_token: expected,
    passed,
    reason,
    evidence: probe.evidence ?? {},
  });

  const failCountPrev =
    typeof (ch as any).revalidation_fail_count === "number"
      ? (ch as any).revalidation_fail_count
      : 0;

  // Schedule next revalidation based on 24h/7d/30d cadence.
  // We keep this simple and deterministic: after verify or revalidate, set revalidate_after to 24h.
  const next = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await supabase
    .from(T.trust.domainChallenges)
    .update({
      last_revalidated_at: new Date().toISOString(),
      revalidate_after: next,
      last_revalidation_status: passed ? "pass" : "fail",
      revalidation_fail_count: passed ? 0 : failCountPrev + 1,
    })
    .eq("id", input.challengeId);

  if (!passed) {
    // Grace logic: do not revoke immediately. Only expire verified challenge after grace period
    // since last verified_at (or last successful revalidation).
    if (verifiedAt) {
      const verifiedMs = Date.parse(verifiedAt);
      const ageDays = (Date.now() - verifiedMs) / 86400000;
      if (ageDays > graceDays) {
        await supabase
          .from(T.trust.domainChallenges)
          .update({ status: "expired" })
          .eq("id", input.challengeId)
          .eq("status", "verified");
        await upsertAlert(supabase, {
          severity: "warning",
          category: "domain_revalidation",
          message: `Domain verification expired after repeated failures (startup ${input.startupId})`,
          details: {
            challenge_id: input.challengeId,
            diagnostic: probe.diagnostic,
          },
        });
      } else {
        await upsertAlert(supabase, {
          severity: "warning",
          category: "domain_revalidation",
          message: `Domain revalidation failed (within grace period; not revoked yet)`,
          details: {
            challenge_id: input.challengeId,
            diagnostic: probe.diagnostic,
          },
        });
      }
    }
  }
}

export async function runSystemTasksBatch(
  supabase: SupabaseClient,
  options: { workerId: string; maxTasks: number },
): Promise<{ processedTasks: number }> {
  let processed = 0;
  for (let i = 0; i < options.maxTasks; i++) {
    const task = await claimOneTask(supabase, options.workerId);
    if (!task) break;
    try {
      verificationWorkerLog("sys-task", "Processing task", {
        task_id: task.id,
        task_type: task.task_type,
      });

      if (task.task_type === "marketplace_materialized_view_refresh") {
        await runMvRefresh(supabase);
      } else if (task.task_type === "domain_revalidation") {
        const payload = task.payload ?? {};
        const challengeId = String(payload.challenge_id ?? "");
        const startupId = String(payload.startup_id ?? "");
        if (!challengeId || !startupId) {
          throw new Error("missing challenge_id/startup_id");
        }
        await runDomainRevalidation(supabase, { challengeId, startupId });
      } else {
        verificationWorkerWarn("sys-task", "Unknown task type", {
          task_type: task.task_type,
        });
      }

      await completeTask(supabase, task.id, true);
      processed += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      verificationWorkerError("sys-task", "Task failed", {
        task_id: task.id,
        task_type: task.task_type,
        error: msg,
      });
      await completeTask(supabase, task.id, false, msg);
      await upsertAlert(supabase, {
        severity: "error",
        category: "worker_task_failed",
        message: `System task failed: ${task.task_type}`,
        details: { task_id: task.id, error: msg },
      });
    }
  }
  return { processedTasks: processed };
}
