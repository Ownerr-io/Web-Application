import { getSupabase } from "@/lib/supabase/client";
import { SchemaTables as T } from "@/lib/supabase/schemaTables";
import { normalizeVerificationDomain } from "@/lib/marketplace/normalizeVerificationDomain";
import {
  verificationDebugLog,
  verificationDebugStep,
} from "@/lib/observability/verificationDebug";

export type VerificationDimension = {
  dimension: string;
  status: string;
  computed_at: string;
  summary: Record<string, unknown>;
};

export type IntegrationConnectionSummary = {
  provider: string;
  status: string;
  health_status: string;
  last_sync_at: string | null;
  last_error: string | null;
};

export async function fetchStartupVerificationSummary(slug: string): Promise<{
  dimensions: VerificationDimension[];
  connections: IntegrationConnectionSummary[];
}> {
  const { data, error } = await getSupabase().rpc(
    "startup_verification_summary",
    { p_startup_slug: slug },
  );
  if (error) throw new Error(error.message);
  const row = (data ?? {}) as {
    dimensions?: VerificationDimension[];
    connections?: IntegrationConnectionSummary[];
  };
  return {
    dimensions: row.dimensions ?? [],
    connections: row.connections ?? [],
  };
}

export async function connectProviderApiKey(input: {
  startupId: string;
  providerSlug: string;
  apiKey: string;
  externalAccountId?: string;
}): Promise<{ connectionId: string }> {
  return verificationDebugStep(
    "integration",
    "integration_connect_api_key",
    async () => {
      const { data, error } = await getSupabase().rpc(
        "integration_connect_api_key",
        {
          p_startup_id: input.startupId,
          p_provider_slug: input.providerSlug,
          p_api_key: input.apiKey,
          p_external_account_id: input.externalAccountId ?? null,
        },
      );
      if (error) throw new Error(error.message);
      const row = data as { connection_id?: string };
      if (!row.connection_id) throw new Error("Connect failed");
      return { connectionId: row.connection_id };
    },
    {
      startup_id: input.startupId,
      provider: input.providerSlug,
      has_external_id: Boolean(input.externalAccountId),
      api_key: input.apiKey,
    },
  );
}

export async function disconnectIntegration(
  connectionId: string,
): Promise<void> {
  const { error } = await getSupabase().rpc("integration_disconnect", {
    p_connection_id: connectionId,
  });
  if (error) throw new Error(error.message);
}

export async function requestIntegrationSync(
  connectionId: string,
): Promise<void> {
  await verificationDebugStep(
    "integration",
    "integration_request_sync (enqueue job)",
    async () => {
      const { data, error } = await getSupabase().rpc(
        "integration_request_sync",
        {
          p_connection_id: connectionId,
        },
      );
      if (error) throw new Error(error.message);
      verificationDebugLog("integration", "Sync job enqueued", {
        connection_id: connectionId,
        job_id: data,
      });
    },
    { connection_id: connectionId },
  );
}

export async function beginDomainVerification(input: {
  startupId: string;
  domain: string;
  method: "txt" | "cname";
}): Promise<{
  challengeId: string;
  host: string;
  expectedRecord: string;
  method: string;
  domain?: string;
}> {
  const normalized = normalizeVerificationDomain(input.domain);
  return verificationDebugStep(
    "domain",
    "domain_verification_begin",
    async () => {
      const { data, error } = await getSupabase().rpc(
        "domain_verification_begin",
        {
          p_startup_id: input.startupId,
          p_domain: normalized,
          p_method: input.method,
        },
      );
      if (error) throw new Error(error.message);
      const row = data as {
        challenge_id: string;
        domain?: string;
        host: string;
        expected_record: string;
        method: string;
      };
      return {
        challengeId: row.challenge_id,
        host: row.host,
        expectedRecord: row.expected_record,
        method: row.method,
        domain: row.domain,
      };
    },
    { startup_id: input.startupId, domain: normalized, method: input.method },
  );
}

let lastPendingDomainLogKey = "";

export async function fetchDomainVerificationPending(
  startupId: string,
): Promise<{
  challengeId: string;
  domain: string;
  host: string;
  expectedRecord: string;
  method: string;
} | null> {
  const { data, error } = await getSupabase().rpc(
    "domain_verification_pending",
    {
      p_startup_id: startupId,
    },
  );
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as {
    challenge_id: string;
    domain: string;
    host: string;
    expected_record: string;
    method: string;
  };
  const result = {
    challengeId: row.challenge_id,
    domain: row.domain,
    host: row.host,
    expectedRecord: row.expected_record,
    method: row.method,
  };
  const logKey = `${result.challengeId}:${result.expectedRecord}`;
  if (logKey !== lastPendingDomainLogKey) {
    lastPendingDomainLogKey = logKey;
    verificationDebugLog("domain", "Pending DNS challenge loaded", {
      startup_id: startupId,
      ...result,
    });
  }
  return result;
}

export async function fetchLatestDomainDnsCheck(startupId: string): Promise<{
  status: string;
  checkedAt: string | null;
  host: string | null;
  expected: string | null;
  cnames: string[] | null;
  txtRecords: string[] | null;
  error: string | null;
} | null> {
  const { data, error } = await getSupabase()
    .from(T.trust.verificationResults)
    .select("status, computed_at, summary, evidence_ref")
    .eq("startup_id", startupId)
    .eq("dimension", "domain")
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    verificationDebugLog(
      "domain",
      "Latest DNS check query failed",
      { message: error.message, code: error.code },
      "warn",
    );
    return null;
  }
  if (!data) return null;

  const summary = (data.summary ?? {}) as Record<string, unknown>;
  const evidenceRoot = (data.evidence_ref ?? {}) as Record<string, unknown>;
  const nested =
    evidenceRoot.evidence && typeof evidenceRoot.evidence === "object"
      ? (evidenceRoot.evidence as Record<string, unknown>)
      : null;
  const evidence = nested ?? evidenceRoot;

  const cnames = Array.isArray(evidence.cnames)
    ? (evidence.cnames as string[])
    : null;
  const perRecord = Array.isArray(evidence.per_record)
    ? (evidence.per_record as string[])
    : null;

  const expectedFromEvidence = (
    obj: Record<string, unknown> | null,
  ): string | null => {
    if (!obj) return null;
    if (typeof obj.expected_record === "string") return obj.expected_record;
    if (typeof obj.expected === "string") return obj.expected;
    return null;
  };

  let expected =
    expectedFromEvidence(evidence) ??
    expectedFromEvidence(nested) ??
    expectedFromEvidence(evidenceRoot) ??
    (typeof summary.expected_record === "string"
      ? summary.expected_record
      : null);

  if (!expected) {
    const { data: pendingRow } = await getSupabase().rpc(
      "domain_verification_pending",
      {
        p_startup_id: startupId,
      },
    );
    if (pendingRow && typeof pendingRow === "object" && pendingRow !== null) {
      const er = (pendingRow as { expected_record?: string }).expected_record;
      if (typeof er === "string" && er.length > 0) expected = er;
    }
  }

  const result = {
    status: data.status,
    checkedAt: data.computed_at,
    host: typeof summary.host === "string" ? summary.host : null,
    expected,
    cnames,
    txtRecords: perRecord,
    error: typeof evidence.error === "string" ? evidence.error : null,
  };
  verificationDebugLog("domain", "Latest DNS check loaded", {
    startup_id: startupId,
    ...result,
    ownerrTxtPresent:
      expected && perRecord
        ? perRecord.some(
            (t) => t.includes("ownerr-verification") || t.includes(expected),
          )
        : null,
  });
  return result;
}

export async function listVerificationProviders(): Promise<
  {
    id: string;
    slug: string;
    category: string;
    display_name: string;
    auth_type: string;
    config_schema?: Record<string, unknown>;
  }[]
> {
  const { data, error } = await getSupabase()
    .from(T.trust.providers)
    .select("id, slug, category, display_name, auth_type, config_schema")
    .eq("is_enabled", true)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function completeOAuthIntegration(input: {
  startupId: string;
  providerSlug: string;
  tokenBundle: Record<string, unknown>;
}): Promise<void> {
  const { error } = await getSupabase().rpc("integration_complete_oauth", {
    p_startup_id: input.startupId,
    p_provider_slug: input.providerSlug,
    p_token_bundle: input.tokenBundle,
  });
  if (error) throw new Error(error.message);
}

export async function listStartupIntegrationConnections(
  startupId: string,
): Promise<
  {
    id: string;
    status: string;
    health_status: string;
    last_sync_at: string | null;
    last_error: string | null;
    providerSlug: string;
    providerName: string;
  }[]
> {
  const { data, error } = await getSupabase()
    .from(T.trust.integrations)
    .select(
      "id, status, health_status, last_sync_at, last_error, trust_providers(slug, display_name)",
    )
    .eq("startup_id", startupId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const vp = row.trust_providers as
      | { slug: string; display_name: string }
      | { slug: string; display_name: string }[]
      | null;
    const provider = Array.isArray(vp) ? vp[0] : vp;
    return {
      id: row.id,
      status: row.status,
      health_status: row.health_status,
      last_sync_at: row.last_sync_at,
      last_error: row.last_error,
      providerSlug: provider?.slug ?? "unknown",
      providerName: provider?.display_name ?? provider?.slug ?? "Provider",
    };
  });
}

export async function fetchStartupIdBySlug(
  slug: string,
): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from(T.marketplace.companies)
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}
