import { getSupabase } from "@/lib/supabase/client";
import { SchemaTables as T } from "@/lib/supabase/schemaTables";
import {
  resolveSyncWorkerBusinessEmailUrl,
  resolveSyncWorkerIdentitySessionUrl,
  resolveSyncWorkerProcessJobsUrl,
} from "@/lib/syncWorkerClient";
import type { PostgrestError } from "@supabase/supabase-js";
import {
  verificationDebugLog,
  verificationDebugStep,
} from "@/lib/observability/verificationDebug";

const ASYNC_VERIFICATION_NOT_CONFIGURED =
  "Async verification (identity, business email, revenue jobs) is not configured. Marketplace inbox and offers work without it.";

function formatRpcError(error: PostgrestError, fallback: string): string {
  if (error.code === "PGRST202") {
    return `${fallback} (API parameter mismatch — refresh and try again.)`;
  }
  if (error.message) return error.message;
  return fallback;
}

function parseRpcJsonRecord(data: unknown): Record<string, unknown> {
  if (data == null) return {};
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data) as unknown;
      return typeof parsed === "object" &&
        parsed !== null &&
        !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  if (typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return {};
}

export type ListingLifecycle =
  | "draft"
  | "verification_required"
  | "verification_in_progress"
  | "verification_failed"
  | "verification_review"
  | "verified"
  | "published"
  | "suspended"
  | "under_contract";

export type ListingVerificationGates = {
  identity_status: string;
  identity_verified_at: string | null;
  domain_status: string;
  domain_verified_at: string | null;
  verified_domain: string | null;
  business_email_status: string;
  business_email_verified_at: string | null;
  business_email: string | null;
  revenue_status: string;
  revenue_verified_at: string | null;
  verified_revenue_amount: number | null;
  revenue_source_provider: string | null;
  revenue_currency: string | null;
  revenue_evidence_at: string | null;
  verified_mrr: number | null;
  verified_arr: number | null;
  registration_status: string;
  registration_verified_at: string | null;
  fraud_risk?: string;
};

export type ListingVerificationSnapshot = {
  startup_id: string;
  slug: string;
  listing_lifecycle: ListingLifecycle;
  visibility: string;
  gates: ListingVerificationGates;
  can_publish: boolean;
};

export type PublicVerificationTimeline = {
  slug: string;
  listing_lifecycle: ListingLifecycle;
  is_public: boolean;
  trust: { score: number; level: string; computed_at: string } | null;
  verified_revenue_amount: number | null;
  revenue_source_provider: string | null;
  revenue_currency: string | null;
  verified_mrr: number | null;
  verified_arr: number | null;
  verified_domain: string | null;
  revenue_verified_at: string | null;
  domain_verified_at: string | null;
  identity_verified_at: string | null;
  business_email_verified_at: string | null;
  registration_verified_at: string | null;
  published_at: string | null;
  badges: {
    founder_verified: boolean;
    domain_verified: boolean;
    business_email_verified: boolean;
    revenue_verified: boolean;
    business_verified: boolean;
    marketplace_published: boolean;
  };
};

export async function fetchListingVerificationSnapshotBySlug(
  slug: string,
): Promise<ListingVerificationSnapshot | null> {
  const { data: row, error: slugErr } = await getSupabase()
    .from(T.marketplace.companies)
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (slugErr) throw new Error(slugErr.message);
  if (!row?.id) return null;
  const { data, error } = await getSupabase().rpc(
    "listing_verification_snapshot",
    {
      p_startup_id: row.id,
    },
  );
  if (error) throw new Error(error.message);
  return data as ListingVerificationSnapshot;
}

export async function fetchPublicVerificationTimeline(
  slug: string,
): Promise<PublicVerificationTimeline | null> {
  const { data, error } = await getSupabase().rpc(
    "listing_verification_timeline_public",
    { p_startup_slug: slug },
  );
  if (error) throw new Error(error.message);
  return (data as PublicVerificationTimeline | null) ?? null;
}

export async function submitListingForVerification(
  slug: string,
): Promise<ListingVerificationSnapshot> {
  return verificationDebugStep(
    "submit",
    "founder_submit_listing_for_verification",
    async () => {
      const { data, error } = await getSupabase().rpc(
        "founder_submit_listing_for_verification",
        { p_slug: slug },
      );
      if (error) throw new Error(error.message);
      return data as ListingVerificationSnapshot;
    },
    { slug },
  );
}

export async function requestListingPublish(
  slug: string,
): Promise<ListingVerificationSnapshot> {
  const { data, error } = await getSupabase().rpc("founder_request_publish", {
    p_slug: slug,
  });
  if (error) throw new Error(error.message);
  return data as ListingVerificationSnapshot;
}

export type SubmitBusinessEmailResult = {
  email: string;
  sentViaResend: boolean;
  devLink?: string;
};

export async function submitBusinessEmail(
  startupId: string,
  email: string,
): Promise<SubmitBusinessEmailResult> {
  const trimmedId = startupId?.trim();
  const trimmedEmail = email?.trim();
  if (!trimmedId)
    throw new Error("Startup not found. Reload the page and try again.");
  if (!trimmedEmail) throw new Error("Enter your work email address.");

  const { data: submitData, error: submitError } = await getSupabase().rpc(
    "founder_submit_business_email",
    {
      p_startup_id: trimmedId,
      p_email: trimmedEmail,
    },
  );
  if (submitError) {
    throw new Error(
      formatRpcError(submitError, "Could not send business email verification"),
    );
  }

  const submitRow = parseRpcJsonRecord(submitData);
  const verificationId = submitRow.verification_id;
  if (typeof verificationId !== "string" || !verificationId.trim()) {
    throw new Error(
      "Verification record was not created. Apply latest migrations and try again.",
    );
  }

  const { data: launchData, error: launchError } = await getSupabase().rpc(
    "founder_launch_business_email_send",
    { p_verification_id: verificationId.trim() },
  );
  if (launchError) {
    throw new Error(
      formatRpcError(
        launchError,
        "Could not launch business email send. Configure verification invoke URLs in Supabase platform_internal_config if you need this gate.",
      ),
    );
  }

  const launchRow = parseRpcJsonRecord(launchData);
  if (launchRow.configured === false) {
    const msg =
      typeof launchRow.message === "string" && launchRow.message.trim()
        ? launchRow.message.trim()
        : ASYNC_VERIFICATION_NOT_CONFIGURED;
    throw new Error(msg);
  }

  const clientLaunch = launchRow.client_launch as
    | {
        endpoint?: string;
        launch_token?: string;
        email_token?: string;
      }
    | undefined;

  if (
    !clientLaunch?.endpoint ||
    !clientLaunch.launch_token ||
    !clientLaunch.email_token
  ) {
    throw new Error(
      "Business email launch payload missing. Apply migration 20260702370000.",
    );
  }

  const endpoint = resolveSyncWorkerBusinessEmailUrl(clientLaunch.endpoint);
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${clientLaunch.launch_token}`,
      },
      body: JSON.stringify({
        verification_id: verificationId.trim(),
        token: clientLaunch.email_token,
      }),
    });
  } catch (cause) {
    throw new Error(
      `Could not reach the verification endpoint at ${endpoint}. For local verification dev use npm run dev:with-verification-worker.`,
      { cause },
    );
  }

  const workerBody = (await res.json().catch(() => ({}))) as {
    error?: string;
    detail?: string;
    dev_link?: string | null;
    sent_via_resend?: boolean;
  };

  if (!res.ok) {
    const reason =
      typeof workerBody.detail === "string" && workerBody.detail.trim()
        ? workerBody.detail.trim()
        : typeof workerBody.error === "string"
          ? workerBody.error
          : `Worker returned ${res.status}`;
    throw new Error(reason);
  }

  const sentEmail =
    typeof launchRow.email === "string" ? launchRow.email : trimmedEmail;

  return {
    email: sentEmail,
    sentViaResend: workerBody.sent_via_resend === true,
    devLink:
      typeof workerBody.dev_link === "string" && workerBody.dev_link.trim()
        ? workerBody.dev_link.trim()
        : undefined,
  };
}

export async function refreshListingGatesFromEvidence(
  startupId: string,
): Promise<void> {
  await verificationDebugStep(
    "gates",
    "refresh_listing_gates_from_evidence",
    async () => {
      const { error } = await getSupabase().rpc(
        "refresh_listing_gates_from_evidence",
        {
          p_startup_id: startupId,
        },
      );
      if (error) throw new Error(error.message);
    },
    { startup_id: startupId },
  );
}

export type SyncWorkerInvokeResult =
  | {
      ok: true;
      skipped?: boolean;
      processed?: number;
      workerBody?: Record<string, unknown>;
    }
  | { ok: false; message: string };

/** Drain queued integration jobs via sync worker (required for DNS checks in local dev). */
export async function invokeSyncWorkerProcessJobs(
  startupId: string,
): Promise<SyncWorkerInvokeResult> {
  const trimmedId = startupId?.trim();
  if (!trimmedId) {
    verificationDebugLog("worker", "invoke skipped (empty startup id)");
    return { ok: true, skipped: true };
  }

  verificationDebugLog("worker", "founder_invoke_sync_worker", {
    startup_id: trimmedId,
  });

  const { data, error } = await getSupabase().rpc(
    "founder_invoke_sync_worker",
    {
      p_startup_id: trimmedId,
    },
  );
  if (error) {
    const message = formatRpcError(
      error,
      "Could not queue worker. Run npm run platform:set-integration-secrets.",
    );
    verificationDebugLog("worker", "RPC failed", { message }, "error");
    return { ok: false, message };
  }

  const row = parseRpcJsonRecord(data);
  if (row.configured === false) {
    const message =
      typeof row.message === "string" && row.message.trim()
        ? row.message.trim()
        : ASYNC_VERIFICATION_NOT_CONFIGURED;
    verificationDebugLog(
      "worker",
      "Async verification not configured",
      { message },
      "warn",
    );
    return { ok: false, message };
  }

  const clientLaunch = row.client_launch as
    | { endpoint?: string; launch_token?: string; startup_id?: string }
    | undefined;

  if (
    !clientLaunch ||
    typeof clientLaunch.endpoint !== "string" ||
    typeof clientLaunch.launch_token !== "string"
  ) {
    verificationDebugLog(
      "worker",
      "No client_launch in RPC response (server-side worker only?)",
      { keys: Object.keys(row) },
      "warn",
    );
    return { ok: true, skipped: true };
  }

  const endpoint = resolveSyncWorkerProcessJobsUrl(clientLaunch.endpoint);
  const startup_id =
    typeof clientLaunch.startup_id === "string"
      ? clientLaunch.startup_id
      : trimmedId;

  verificationDebugLog("worker", "POST /v1/process-jobs", {
    endpoint,
    startup_id,
    max_jobs: 24,
    launch_token: clientLaunch.launch_token,
  });

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${clientLaunch.launch_token}`,
      },
      body: JSON.stringify({ max_jobs: 24, startup_id }),
    });
  } catch (e) {
    const message =
      "Could not reach the verification endpoint. Ensure SUPABASE_SERVICE_ROLE_KEY is set on the host and /api/sync-worker is deployed.";
    verificationDebugLog(
      "worker",
      "Fetch failed",
      { endpoint, error: e instanceof Error ? e.message : String(e) },
      "error",
    );
    return { ok: false, message };
  }

  const json = (await res.json().catch(() => ({}))) as {
    error?: string;
    processed?: number;
    ok?: boolean;
  };
  if (!res.ok) {
    const message = json.error ?? `Sync worker returned ${res.status}`;
    verificationDebugLog(
      "worker",
      "Worker HTTP error",
      { status: res.status, json },
      "error",
    );
    return { ok: false, message };
  }

  verificationDebugLog("worker", "Worker HTTP success", {
    status: res.status,
    processed: json.processed,
    body: json,
  });
  return {
    ok: true,
    processed: typeof json.processed === "number" ? json.processed : undefined,
    workerBody: json as Record<string, unknown>,
  };
}

export async function confirmBusinessEmailVerification(
  token: string,
): Promise<void> {
  const { error } = await getSupabase().rpc(
    "confirm_business_email_verification",
    {
      p_token: token,
    },
  );
  if (error) throw new Error(error.message);
}

export async function beginIdentityVerification(
  startupId: string,
  provider = "stripe_identity",
): Promise<{ session_id: string }> {
  const trimmedId = startupId?.trim();
  if (!trimmedId) {
    throw new Error("Startup not found. Reload the page and try again.");
  }

  const { data, error } = await getSupabase().rpc(
    "founder_begin_identity_verification",
    {
      p_startup_id: trimmedId,
      p_provider: provider,
    },
  );
  if (error) {
    throw new Error(
      formatRpcError(error, "Could not create identity verification session"),
    );
  }

  const row = parseRpcJsonRecord(data);
  const sessionId = row.session_id;
  if (typeof sessionId !== "string" || !sessionId.trim()) {
    throw new Error(
      "Identity session was not created. Confirm migrations are applied and try again.",
    );
  }
  return { session_id: sessionId.trim() };
}

export async function launchIdentityVerification(
  sessionId: string,
): Promise<string | null> {
  const trimmed = sessionId?.trim();
  if (!trimmed) {
    throw new Error("Missing identity session. Tap Verify identity again.");
  }

  const { data, error } = await getSupabase().rpc(
    "founder_launch_identity_verification",
    {
      p_session_id: trimmed,
    },
  );
  if (error) {
    const msg = formatRpcError(error, "Could not launch identity verification");
    throw new Error(msg);
  }

  const row = parseRpcJsonRecord(data);
  if (row.configured === false) {
    const msg =
      typeof row.message === "string" && row.message.trim()
        ? row.message.trim()
        : ASYNC_VERIFICATION_NOT_CONFIGURED;
    throw new Error(msg);
  }

  const clientLaunch = row.client_launch as
    | { endpoint?: string; launch_token?: string }
    | undefined;

  if (
    clientLaunch &&
    typeof clientLaunch.endpoint === "string" &&
    typeof clientLaunch.launch_token === "string"
  ) {
    const endpoint = resolveSyncWorkerIdentitySessionUrl(clientLaunch.endpoint);
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${clientLaunch.launch_token}`,
        },
        body: JSON.stringify({ session_id: trimmed }),
      });
    } catch {
      throw new Error(
        "Could not reach the identity verification endpoint. Configure platform_internal_config invoke URLs or use npm run dev:with-verification-worker locally.",
      );
    }
    const json = (await res.json().catch(() => ({}))) as {
      url?: string;
      error?: string;
    };
    if (!res.ok) {
      throw new Error(
        json.error ??
          (res.status === 0
            ? "Could not reach the verification endpoint. Check platform_internal_config or local dev:with-verification-worker."
            : `Verification endpoint returned ${res.status}`),
      );
    }
    if (typeof json.url === "string" && json.url) {
      return json.url;
    }
  }

  return null;
}

export async function pollIdentityRedirectUrl(
  sessionId: string,
  maxAttempts = 20,
): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const { data } = await getSupabase()
      .from(T.trust.identitySessions)
      .select("redirect_url, status")
      .eq("id", sessionId)
      .maybeSingle();
    if (data?.redirect_url) return data.redirect_url as string;
    if (data?.status === "verified" || data?.status === "failed") return null;
    await new Promise((r) => setTimeout(r, 800));
  }
  return null;
}

export async function fetchAdminListingVerificationQueue(): Promise<
  Record<string, unknown>
> {
  const { data, error } = await getSupabase().rpc(
    "admin_listing_verification_queue",
  );
  if (error) throw new Error(error.message);
  return (data ?? {}) as Record<string, unknown>;
}

export async function deleteFounderListingBySlug(slug: string): Promise<void> {
  const trimmed = slug?.trim();
  if (!trimmed) throw new Error("Listing not found");
  const { error } = await getSupabase().rpc("founder_delete_startup", {
    p_slug: trimmed,
  });
  if (error) {
    throw new Error(formatRpcError(error, "Could not delete listing"));
  }
}
