/**
 * Live smoke: every revenue-class provider adapter hits real vendor APIs.
 *
 * Credentials (in order):
 * 1. REVENUE_SMOKE_* env vars (see .env.example)
 * 2. Best integration_connections row per slug (service role + worker_get_connection_secrets)
 *
 * Set REVENUE_SMOKE_STRICT=1 to fail when any catalog provider lacks credentials.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx/esm --test scripts/revenue-providers.smoke.mjs
 */
import assert from "node:assert/strict";
import { describe, it, after } from "node:test";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import {
  REVENUE_SMOKE_PROFILES,
  resolveExternalFromEnv,
  resolveSecretFromEnv,
} from "./revenue-providers.smoke.config.mjs";

const databaseUrl =
  process.env.DATABASE_URL_MIGRATE?.trim() ??
  process.env.DATABASE_URL?.trim() ??
  process.env.DATABASE_URL_POOLER?.trim();

const supabaseUrl = process.env.SUPABASE_URL?.trim() ?? process.env.VITE_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const strict = process.env.REVENUE_SMOKE_STRICT === "1";
/** When true, missing env/DB creds still call vendor APIs (expect auth/validation errors, not mocks). */
const probeWhenUnconfigured =
  process.env.REVENUE_SMOKE_PROBE_UNCONFIGURED !== "0";

const { getProviderAdapter, listRevenueProviderCapabilities } = await import(
  "../lib/integrations-core/src/index.ts"
);

/** @type {Map<string, { connectionId: string; startupSlug: string; status: string; externalAccountId: string | null }>} */
const dbConnectionsBySlug = new Map();

/** @type {Array<Record<string, unknown>>} */
const reportRows = [];

function pgClient() {
  return new pg.Client({
    connectionString: databaseUrl,
    ssl: databaseUrl?.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
  });
}

async function loadDbConnectionIndex() {
  if (!databaseUrl) return;
  const client = pgClient();
  await client.connect();
  try {
    const slugs = listRevenueProviderCapabilities().map((p) => p.slug);
    const { rows } = await client.query(
      `
      SELECT DISTINCT ON (vp.slug)
        vp.slug,
        ic.id AS connection_id,
        ic.status,
        ic.external_account_id,
        s.slug AS startup_slug
      FROM public.integration_connections ic
      JOIN public.verification_providers vp ON vp.id = ic.provider_id
      JOIN public.startups s ON s.id = ic.startup_id
      WHERE vp.slug = ANY($1::text[])
      ORDER BY vp.slug,
        CASE ic.status
          WHEN 'connected' THEN 0
          WHEN 'degraded' THEN 1
          WHEN 'pending' THEN 2
          ELSE 3
        END,
        ic.last_sync_at DESC NULLS LAST
      `,
      [slugs],
    );
    for (const row of rows) {
      dbConnectionsBySlug.set(row.slug, {
        connectionId: row.connection_id,
        startupSlug: row.startup_slug,
        status: row.status,
        externalAccountId: row.external_account_id,
      });
    }
  } finally {
    await client.end();
  }
}

async function secretFromDb(connectionId) {
  if (!supabaseUrl || !serviceKey) return null;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("worker_get_connection_secrets", {
    p_connection_id: connectionId,
  });
  if (error || !data || typeof data !== "object" || !("secret" in data)) return null;
  return String(data.secret);
}

async function resolveLiveCredentials(profile) {
  const envSecret = resolveSecretFromEnv(profile);
  if (envSecret?.invalidJson) {
    return {
      kind: "invalid_env",
      message: `${envSecret.env} is not valid JSON for OAuth token bundle`,
    };
  }
  if (envSecret?.value) {
    return {
      kind: "env",
      secret: envSecret.value,
      externalAccountId: resolveExternalFromEnv(profile),
      label: envSecret.env,
    };
  }

  const db = dbConnectionsBySlug.get(profile.slug);
  if (!db) return { kind: "missing" };

  const secret = await secretFromDb(db.connectionId);
  if (!secret) {
    return {
      kind: "missing",
      message: `DB connection ${db.connectionId} (${db.startupSlug}) has no decryptable secret`,
    };
  }
  return {
    kind: "db",
    secret,
    externalAccountId: db.externalAccountId ?? resolveExternalFromEnv(profile),
    label: `connection:${db.connectionId.slice(0, 8)}… (${db.startupSlug}, ${db.status})`,
  };
}

function classifyResult(_slug, syncResult) {
  const amount = syncResult.verifiedRevenue?.verified_revenue_amount ?? 0;
  const status = syncResult.verificationStatus ?? "unknown";
  const lastError = syncResult.lastError ?? null;

  if (lastError && /not yet wired|coming soon|OAuth flow not yet/i.test(lastError)) {
    return "adapter_not_production";
  }
  if (status === "fail") return "api_fail";
  if (status === "pass" && amount > 0) return "production_ready";
  if (status === "pass" && amount === 0) return "api_ok_zero_revenue";
  if (status === "partial") return "api_ok_partial";
  return "unknown";
}

async function runProviderSmoke(profile) {
  const cap = listRevenueProviderCapabilities().find((p) => p.slug === profile.slug);
  const adapter = getProviderAdapter(profile.slug);
  const base = {
    slug: profile.slug,
    displayName: cap?.displayName ?? profile.slug,
    revenueClass: cap?.revenueClass ?? "?",
  };

  if (!adapter) {
    return { ...base, outcome: "no_adapter", skipped: true };
  }

  const creds = await resolveLiveCredentials(profile);
  if (creds.kind === "missing" || creds.kind === "invalid_env") {
    if (probeWhenUnconfigured && !strict && !profile.oauthJson) {
      return runAdapterProbe(profile, base, {
        secret: "",
        externalAccountId: resolveExternalFromEnv(profile),
        label: "probe:no_credentials",
        probeReason: creds.message ?? "no env or DB connection",
      });
    }
    if (probeWhenUnconfigured && !strict && profile.oauthJson) {
      return runAdapterProbe(profile, base, {
        secret: '{"access_token":""}',
        externalAccountId: resolveExternalFromEnv(profile),
        label: "probe:empty_oauth_bundle",
        probeReason: "OAuth token bundle not configured",
      });
    }
    return {
      ...base,
      outcome: "skipped_no_credentials",
      skipped: true,
      detail: creds.message ?? "Set REVENUE_SMOKE_* env or connect provider in seller desk",
    };
  }

  if (cap?.requiresExternalAccount && !creds.externalAccountId?.trim()) {
    if (probeWhenUnconfigured && !strict) {
      return runAdapterProbe(profile, base, {
        secret: creds.secret,
        externalAccountId: null,
        label: `${creds.label} + probe:missing_external`,
        probeReason: `Requires external account (${cap.externalAccountLabel ?? "id"})`,
      });
    }
    return {
      ...base,
      outcome: "skipped_missing_external_account",
      skipped: true,
      credentialSource: creds.label,
      detail: `Requires external account (${cap.externalAccountLabel ?? "id"})`,
    };
  }

  return executeAdapterSync(profile, base, creds);
}

async function runAdapterProbe(profile, base, probe) {
  const row = await executeAdapterSync(profile, base, {
    kind: "probe",
    secret: probe.secret,
    externalAccountId: probe.externalAccountId,
    label: probe.label,
  });
  return {
    ...row,
    probed: true,
    probeReason: probe.probeReason,
    outcome:
      row.outcome === "adapter_not_production"
        ? "adapter_not_production"
        : row.outcome === "api_fail"
          ? "probe_api_reachable"
          : row.outcome,
  };
}

async function executeAdapterSync(profile, base, creds) {
  const adapter = getProviderAdapter(profile.slug);
  const started = Date.now();
  let syncResult;
  try {
    syncResult = await adapter.sync({
      connectionId: "smoke-live",
      startupId: "00000000-0000-0000-0000-000000000000",
      providerSlug: profile.slug,
      secret: creds.secret,
      externalAccountId: creds.externalAccountId ?? null,
      syncCursor: {},
      jobPayload: {},
    });
  } catch (e) {
    return {
      ...base,
      outcome: "adapter_threw",
      credentialSource: creds.label,
      durationMs: Date.now() - started,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  const outcome = classifyResult(profile.slug, syncResult);
  return {
    ...base,
    outcome,
    credentialSource: creds.label,
    durationMs: Date.now() - started,
    verificationStatus: syncResult.verificationStatus,
    connectionStatus: syncResult.connectionStatus,
    healthStatus: syncResult.healthStatus,
    verifiedRevenueAmount: syncResult.verifiedRevenue?.verified_revenue_amount ?? null,
    verificationRevenueStatus: syncResult.verifiedRevenue?.verification_status ?? null,
    transactionCount: syncResult.verifiedRevenue?.transaction_count ?? null,
    currency: syncResult.verifiedRevenue?.currency ?? null,
    lastError: syncResult.lastError ?? null,
  };
}

function printReport() {
  console.log("\n--- Revenue provider live smoke report ---");
  for (const row of reportRows) {
    const amt = row.verifiedRevenueAmount != null ? String(row.verifiedRevenueAmount) : "—";
    console.log(
      `${String(row.slug).padEnd(16)} ${String(row.outcome).padEnd(24)} amt=${String(amt).padStart(10)} ${row.credentialSource ? `[${row.credentialSource}]` : ""}`,
    );
    if (row.lastError) console.log(`  error: ${row.lastError}`);
    if (row.probeReason) console.log(`  probe: ${row.probeReason}`);
    if (row.detail) console.log(`  note: ${row.detail}`);
  }
  console.log("---\n");
}

describe("revenue providers live smoke (real APIs)", () => {
  it("loads DB connection index", async () => {
    await loadDbConnectionIndex();
    assert.ok(REVENUE_SMOKE_PROFILES.length >= 18);
  });

  for (const profile of REVENUE_SMOKE_PROFILES) {
    it(`live sync: ${profile.slug}`, async () => {
      const row = await runProviderSmoke(profile);
      reportRows.push(row);

      if (row.skipped) {
        if (strict) {
          assert.fail(
            `${profile.slug}: ${row.outcome} — ${row.detail ?? "no credentials"}`,
          );
        }
        console.log(`[skip] ${profile.slug}: ${row.detail ?? row.outcome}`);
        return;
      }

      assert.notEqual(row.outcome, "adapter_threw", row.error ?? "adapter threw");
      assert.notEqual(row.outcome, "no_adapter", "missing adapter registration");

      if (row.outcome === "adapter_not_production") {
        console.warn(`[blocked] ${profile.slug}: ${row.lastError}`);
        return;
      }

      if (row.outcome === "api_fail" || row.outcome === "probe_api_reachable") {
        assert.ok(row.lastError, `${profile.slug}: expected lastError when verification fails`);
        console.warn(`[${row.outcome}] ${profile.slug}: ${row.lastError}`);
        return;
      }

      assert.ok(
        ["production_ready", "api_ok_zero_revenue", "api_ok_partial"].includes(row.outcome),
        `${profile.slug}: unexpected outcome ${row.outcome}`,
      );
      assert.ok(row.verificationStatus, `${profile.slug}: missing verificationStatus`);
      console.log(
        `[ok] ${profile.slug} ${row.outcome} amount=${row.verifiedRevenueAmount} status=${row.verificationStatus}`,
      );
    });
  }

  after(() => {
    printReport();
    const tested = reportRows.filter((r) => !r.skipped).length;
    const skipped = reportRows.filter((r) => r.skipped).length;
    const ready = reportRows.filter((r) => r.outcome === "production_ready").length;
    const probed = reportRows.filter((r) => r.probed).length;
    console.log(
      `Summary: tested=${tested} skipped=${skipped} probed=${probed} production_ready=${ready} total=${reportRows.length}`,
    );
  });
});
