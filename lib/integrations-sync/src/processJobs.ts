import type { SupabaseClient } from "@supabase/supabase-js";
import { SchemaTables as T } from "@workspace/db-schema";
import { getProviderAdapter } from "@workspace/integrations-core";
import {
  verificationWorkerError,
  verificationWorkerLog,
  verificationWorkerWarn,
} from "./verificationLog.js";

export type SyncJobClaim = {
  job_id: string;
  connection_id: string;
  job_type: string;
  payload: Record<string, unknown>;
};

async function persistMetrics(
  supabase: SupabaseClient,
  startupId: string,
  connectionId: string,
  result: Awaited<
    ReturnType<NonNullable<ReturnType<typeof getProviderAdapter>>["sync"]>
  >,
) {
  for (const row of result.financialMetrics ?? []) {
    await supabase.from(T.trust.financialMetrics).upsert(
      {
        startup_id: startupId,
        period_start: row.periodStart,
        period_end: row.periodEnd,
        granularity: row.granularity,
        mrr: row.mrr,
        arr: row.arr,
        net_revenue: row.netRevenue,
        refunds: row.refunds,
        currency: row.currency,
        source_connection_id: connectionId,
      },
      {
        onConflict: "startup_id,period_start,granularity,source_connection_id",
      },
    );
  }
  for (const row of result.trafficMetrics ?? []) {
    await supabase.from(T.trust.trafficMetrics).upsert(
      {
        startup_id: startupId,
        period_start: row.periodStart,
        period_end: row.periodEnd,
        sessions: row.sessions,
        users: row.users,
        pageviews: row.pageviews,
        source: row.source,
        connection_id: connectionId,
      },
      { onConflict: "startup_id,period_start,connection_id" },
    );
  }
  for (const row of result.accountingMetrics ?? []) {
    await supabase.from(T.trust.accountingMetrics).upsert(
      {
        startup_id: startupId,
        period_start: row.periodStart,
        period_end: row.periodEnd,
        revenue: row.revenue,
        cogs: row.cogs,
        opex: row.opex,
        net_income: row.netIncome,
        currency: row.currency,
        connection_id: connectionId,
      },
      { onConflict: "startup_id,period_start,connection_id" },
    );
  }
  for (const row of result.bankMetrics ?? []) {
    await supabase.from(T.trust.bankMetrics).upsert(
      {
        startup_id: startupId,
        period_start: row.periodStart,
        period_end: row.periodEnd,
        inflows: row.inflows,
        outflows: row.outflows,
        balance_avg: row.balanceAvg,
        currency: row.currency,
        connection_id: connectionId,
      },
      { onConflict: "startup_id,period_start,connection_id" },
    );
  }

  if (result.verifiedRevenue) {
    const m = result.verifiedRevenue;
    const { error: vrmErr } = await supabase
      .from(T.trust.verifiedRevenueMetrics)
      .upsert(
        {
          startup_id: startupId,
          connection_id: connectionId,
          source_provider: m.source_provider,
          verified_revenue_amount: m.verified_revenue_amount,
          annualized_revenue: m.annualized_revenue,
          customer_count: m.customer_count,
          transaction_count: m.transaction_count,
          currency: m.currency,
          verification_status: m.verification_status,
          evidence_timestamp: m.evidence_timestamp,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "startup_id,connection_id" },
      );
    if (vrmErr) {
      verificationWorkerError(
        "sync-job",
        "verified_revenue_metrics upsert failed",
        {
          startup_id: startupId,
          connection_id: connectionId,
          error: vrmErr.message,
        },
      );
      throw new Error(vrmErr.message);
    }
  }
}

export async function processIntegrationSyncJob(
  supabase: SupabaseClient,
  job: SyncJobClaim,
): Promise<void> {
  verificationWorkerLog("sync-job", "Processing job", {
    job_id: job.job_id,
    job_type: job.job_type,
    connection_id: job.connection_id,
    payload_keys: Object.keys(job.payload ?? {}),
  });

  const { data: conn, error: connErr } = await supabase
    .from(T.trust.integrations)
    .select("id, startup_id, provider_id, external_account_id, sync_cursor")
    .eq("id", job.connection_id)
    .single();

  if (connErr || !conn) {
    verificationWorkerError("sync-job", "Connection missing", {
      job_id: job.job_id,
      error: connErr?.message,
    });
    await supabase.rpc("complete_integration_sync_job", {
      p_job_id: job.job_id,
      p_success: false,
      p_error: connErr?.message ?? "connection missing",
    });
    return;
  }

  const { data: providerRow } = await supabase
    .from(T.trust.providers)
    .select("slug")
    .eq("id", conn.provider_id)
    .single();
  const providerSlug = providerRow?.slug ?? "";

  const { data: secretBundle, error: secErr } = await supabase.rpc(
    "worker_get_connection_secrets",
    { p_connection_id: job.connection_id },
  );

  const adapter = getProviderAdapter(providerSlug);
  if (!adapter) {
    await supabase.rpc("complete_integration_sync_job", {
      p_job_id: job.job_id,
      p_success: false,
      p_error: `No adapter for ${providerSlug}`,
    });
    return;
  }

  let jobPayload = job.payload ?? {};
  if (providerSlug === "domain") {
    verificationWorkerLog("domain", "Resolving domain challenge for job", {
      startup_id: conn.startup_id,
      challenge_id: jobPayload.challenge_id,
    });
    if (jobPayload.challenge_id) {
      const { data: ch } = await supabase
        .from(T.trust.domainChallenges)
        .select("host, expected_record, method")
        .eq("id", jobPayload.challenge_id)
        .single();
      if (ch) {
        jobPayload = { ...jobPayload, ...ch };
        verificationWorkerLog("domain", "Loaded challenge by id", {
          host: ch.host,
          method: ch.method,
          expected_record: ch.expected_record,
        });
      }
    } else {
      const { data: ch } = await supabase
        .from(T.trust.domainChallenges)
        .select("id, host, expected_record, method")
        .eq("startup_id", conn.startup_id)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (ch) {
        jobPayload = {
          ...jobPayload,
          challenge_id: ch.id,
          host: ch.host,
          expected_record: ch.expected_record,
          method: ch.method,
          sync_type: "domain_check",
        };
        verificationWorkerLog("domain", "Using latest pending challenge", {
          challenge_id: ch.id,
          host: ch.host,
          method: ch.method,
          expected_record: ch.expected_record,
        });
      } else {
        verificationWorkerWarn("domain", "No pending domain challenge found", {
          startup_id: conn.startup_id,
        });
      }
    }
  }

  const secret =
    secretBundle && typeof secretBundle === "object" && "secret" in secretBundle
      ? String((secretBundle as { secret: string }).secret)
      : "";

  if (providerSlug !== "domain" && (!secret || secErr)) {
    await supabase.rpc("complete_integration_sync_job", {
      p_job_id: job.job_id,
      p_success: false,
      p_error: secErr?.message ?? "missing credentials",
    });
    return;
  }

  const result = await adapter.sync({
    connectionId: job.connection_id,
    startupId: conn.startup_id,
    providerSlug,
    secret,
    externalAccountId: conn.external_account_id,
    syncCursor: (conn.sync_cursor as Record<string, unknown>) ?? {},
    jobPayload,
  });

  verificationWorkerLog("sync-job", "Adapter finished", {
    job_id: job.job_id,
    provider: providerSlug,
    verification_status: result.verificationStatus,
    connection_status: result.connectionStatus,
    health_status: result.healthStatus,
    last_error: result.lastError,
    verified_revenue_amount: result.verifiedRevenue?.verified_revenue_amount,
    verified_revenue_status: result.verifiedRevenue?.verification_status,
    domain_pass:
      providerSlug === "domain"
        ? (result.syncCursor as { pass?: boolean } | undefined)?.pass
        : undefined,
    domain_evidence:
      providerSlug === "domain"
        ? (result.syncCursor as { evidence?: unknown })?.evidence
        : undefined,
  });

  await persistMetrics(supabase, conn.startup_id, job.connection_id, result);

  if (result.verificationDimension && result.verificationStatus) {
    if (providerSlug === "domain" && jobPayload.challenge_id) {
      const pass = result.syncCursor?.pass === true;
      verificationWorkerLog(
        "domain",
        pass ? "DNS check passed" : "DNS check failed",
        {
          challenge_id: jobPayload.challenge_id,
          host: jobPayload.host,
          expected_record: jobPayload.expected_record,
          evidence: result.syncCursor,
        },
      );
      await supabase.rpc("domain_verification_apply_result", {
        p_challenge_id: jobPayload.challenge_id as string,
        p_pass: pass,
        p_evidence: result.syncCursor ?? {},
      });
    } else {
      const { data: provider } = await supabase
        .from(T.trust.providers)
        .select("id")
        .eq("slug", providerSlug)
        .single();

      await supabase.from(T.trust.verificationResults).insert({
        startup_id: conn.startup_id,
        provider_id: provider?.id ?? null,
        connection_id: job.connection_id,
        dimension: result.verificationDimension,
        status: result.verificationStatus,
        summary: result.verificationSummary ?? {},
        evidence_ref: result.syncCursor ?? {},
        valid_from:
          result.verificationStatus === "pass"
            ? new Date().toISOString()
            : null,
        valid_until:
          result.verificationStatus === "pass"
            ? new Date(
                Date.now() +
                  (result.verificationDimension === "revenue"
                    ? 30 * 864e5
                    : 30 * 864e5),
              ).toISOString()
            : null,
      });
    }
  }

  await supabase
    .from(T.trust.integrations)
    .update({
      status: result.connectionStatus,
      health_status: result.healthStatus,
      last_sync_at: new Date().toISOString(),
      last_error: result.lastError ?? null,
      sync_cursor: result.syncCursor ?? conn.sync_cursor,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.connection_id);

  await supabase.rpc("refresh_listing_gates_from_evidence", {
    p_startup_id: conn.startup_id,
  });

  const syncOk =
    result.connectionStatus !== "error" && result.verificationStatus !== "fail";

  await supabase.rpc("complete_integration_sync_job", {
    p_job_id: job.job_id,
    p_success: syncOk,
    p_records_written: result.recordsWritten,
    p_error: result.lastError ?? null,
    p_sync_payload: result.verificationSummary ?? {},
  });

  verificationWorkerLog("sync-job", "Job complete", {
    job_id: job.job_id,
    provider: providerSlug,
    success: syncOk,
  });
}

export async function claimAndProcessOneJob(
  supabase: SupabaseClient,
  workerId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("claim_integration_sync_job", {
    p_worker_id: workerId,
  });
  if (error) {
    throw new Error(error.message);
  }
  if (!data) return false;

  const job = data as SyncJobClaim;
  try {
    await processIntegrationSyncJob(supabase, job);
  } catch (e) {
    await supabase.rpc("complete_integration_sync_job", {
      p_job_id: job.job_id,
      p_success: false,
      p_error: e instanceof Error ? e.message : String(e),
    });
  }
  return true;
}

export async function runIntegrationSyncBatch(
  supabase: SupabaseClient,
  options: { workerId: string; maxJobs: number },
): Promise<{ processed: number }> {
  verificationWorkerLog("batch", "Starting sync batch", {
    worker_id: options.workerId,
    max_jobs: options.maxJobs,
  });
  let processed = 0;
  for (let i = 0; i < options.maxJobs; i++) {
    const got = await claimAndProcessOneJob(supabase, options.workerId);
    if (!got) break;
    processed += 1;
  }
  verificationWorkerLog("batch", "Batch finished", { processed });
  return { processed };
}
