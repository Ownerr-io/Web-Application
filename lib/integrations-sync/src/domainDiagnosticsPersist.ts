import type { SupabaseClient } from "@supabase/supabase-js";
import { SchemaTables as T } from "@workspace/db-schema";
import type { DomainDnsDiagnostic } from "@workspace/integrations-core";

export async function persistDomainDnsDiagnostic(
  supabase: SupabaseClient,
  input: {
    startupId: string;
    challengeId: string | null;
    enteredDomain: string;
    verificationHost: string;
    diagnostic: DomainDnsDiagnostic;
    resolverObservations?: Record<string, unknown>;
    workerHealth?: Record<string, unknown> | null;
  },
): Promise<void> {
  const d = input.diagnostic;
  const { error } = await supabase.from(T.trust.domainDnsDiagnostics).insert({
    startup_id: input.startupId,
    challenge_id: input.challengeId,
    entered_domain: input.enteredDomain,
    verification_host: input.verificationHost,
    status: d.status,
    severity: d.severity,
    title: d.title,
    description: d.description,
    next_action: d.next_action,
    queried_host: d.queried_host,
    expected_token: d.expected_token,
    found_records: d.found_records,
    nameservers: d.nameservers,
    resolver_observations: {
      ...input.resolverObservations,
      sibling_host: d.sibling_host ?? null,
      authoritative_found_records: d.authoritative_found_records ?? [],
      public_found_records: d.public_found_records ?? [],
    },
    worker_health: input.workerHealth ?? null,
    checked_at: d.checked_at,
  });
  if (error) {
    throw new Error(`domain_dns_diagnostics insert failed: ${error.message}`);
  }
}

export async function captureSyncWorkerHealthSnapshot(
  supabase: SupabaseClient,
  input: {
    batchStartedAt: number;
    processed: number;
    batchOk: boolean;
  },
): Promise<void> {
  const { count, error: countErr } = await supabase
    .from(T.trust.integrationJobs)
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (countErr) return;

  const pending = count ?? 0;
  const elapsedSec =
    input.processed > 0
      ? (Date.now() - input.batchStartedAt) / 1000 / input.processed
      : null;

  let engineStatus: "online" | "offline" | "degraded" = "online";
  if (!input.batchOk) engineStatus = "degraded";
  if (pending > 50) engineStatus = "degraded";

  await supabase.from(T.system.syncWorkerHealthSnapshots).insert({
    engine_status: engineStatus,
    queue_pending: pending,
    avg_processing_seconds: elapsedSec,
    last_success_at: input.processed > 0 ? new Date().toISOString() : null,
    details: { processed: input.processed, batch_ok: input.batchOk },
  });
}
