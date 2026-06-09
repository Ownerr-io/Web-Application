import type { SupabaseClient } from "@supabase/supabase-js";
import { runIntegrationSyncBatch } from "@workspace/integrations-sync";
import { syncStripeIdentitySessionsForStartup } from "@workspace/verification-automation";
import {
  consumeBusinessEmailLaunchToken,
  createStripeIdentitySession,
  processRegistrationDocument,
  resolveStripeSecretKeyForStartup,
  sendBusinessEmailVerification,
} from "@workspace/verification-automation";
import { SchemaTables as T } from "@workspace/db-schema";
import { getSupabaseServiceClient } from "./supabaseService.js";

export type SyncWorkerHttpResult = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

function json(
  status: number,
  payload: unknown,
  opts?: { origin?: string },
): SyncWorkerHttpResult {
  return {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(opts?.origin),
    },
    body: JSON.stringify(payload),
  };
}

function corsHeaders(origin?: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    Vary: "Origin",
  };
}

async function authorizeProcessJobs(
  supabase: SupabaseClient,
  authorization: string | undefined,
  cronSecret: string | undefined,
  bodyJson: { startup_id?: string },
): Promise<boolean> {
  const auth = authorization ?? "";
  if (cronSecret && auth === `Bearer ${cronSecret}`) {
    return true;
  }
  const startupId = bodyJson.startup_id;
  const launchToken = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!launchToken || !startupId) {
    return false;
  }
  const { data, error } = await supabase.rpc("consume_sync_worker_launch_token", {
    p_token: launchToken,
    p_startup_id: startupId,
  });
  return !error && data === true;
}

/**
 * Runs verification jobs on the same deploy as the Vite app (Vercel serverless or Vite dev middleware).
 * No separate sync-worker process required.
 */
export async function handleSyncWorkerHttpRequest(input: {
  /** Path after /api/sync-worker, e.g. /v1/process-jobs */
  path: string;
  method: string;
  authorization?: string;
  body: string;
  origin?: string;
}): Promise<SyncWorkerHttpResult> {
  const path = input.path.split("?")[0] ?? input.path;
  const method = input.method.toUpperCase();
  const cronSecret = process.env.SYNC_WORKER_CRON_SECRET?.trim();

  if (method === "OPTIONS") {
    return { status: 204, headers: corsHeaders(input.origin), body: "" };
  }

  if (path === "/health" && method === "GET") {
    return json(200, { ok: true }, { origin: input.origin });
  }

  let supabase: SupabaseClient;
  try {
    supabase = getSupabaseServiceClient();
  } catch (e) {
    return json(
      503,
      {
        error:
          "Verification API is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the host.",
        detail: e instanceof Error ? e.message : String(e),
      },
      { origin: input.origin },
    );
  }

  if (path === "/v1/process-jobs" && method === "POST") {
    let maxJobs = 10;
    let bodyJson: { max_jobs?: number; startup_id?: string } = {};
    try {
      if (input.body) {
        bodyJson = JSON.parse(input.body) as {
          max_jobs?: number;
          startup_id?: string;
        };
        if (typeof bodyJson.max_jobs === "number" && bodyJson.max_jobs > 0) {
          maxJobs = Math.min(50, bodyJson.max_jobs);
        }
      }
    } catch {
      /* default maxJobs */
    }

    const authorized = await authorizeProcessJobs(
      supabase,
      input.authorization,
      cronSecret,
      bodyJson,
    );
    if (!authorized) {
      return json(
        401,
        {
          error: cronSecret
            ? "unauthorized"
            : "unauthorized — set SYNC_WORKER_CRON_SECRET or use a valid launch token with startup_id",
        },
        { origin: input.origin },
      );
    }

    try {
      const result = await runIntegrationSyncBatch(supabase, {
        workerId: process.env.SYNC_WORKER_ID ?? "inline-api",
        maxJobs,
      });
      let identityPollUpdated = 0;
      if (bodyJson.startup_id) {
        identityPollUpdated = await syncStripeIdentitySessionsForStartup(
          supabase,
          bodyJson.startup_id,
        );
        if (identityPollUpdated > 0) {
          await supabase.rpc("refresh_listing_gates_from_evidence", {
            p_startup_id: bodyJson.startup_id,
          });
        }
      }
      return json(
        200,
        { ok: true, ...result, identity_poll_updated: identityPollUpdated },
        { origin: input.origin },
      );
    } catch (e) {
      return json(
        500,
        { error: e instanceof Error ? e.message : String(e) },
        { origin: input.origin },
      );
    }
  }

  if (path === "/v1/verification/send-business-email" && method === "POST") {
    let body: { verification_id?: string; token?: string } = {};
    try {
      body = JSON.parse(input.body || "{}") as {
        verification_id?: string;
        token?: string;
      };
    } catch {
      return json(400, { error: "invalid json" }, { origin: input.origin });
    }

    const auth = input.authorization ?? "";
    let emailAuthorized = cronSecret && auth === `Bearer ${cronSecret}`;
    if (!emailAuthorized && body.verification_id) {
      const launchToken = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
      if (launchToken) {
        const consumed = await consumeBusinessEmailLaunchToken(
          supabase,
          launchToken,
          body.verification_id,
        );
        emailAuthorized = consumed.ok;
      }
    }
    if (!emailAuthorized) {
      return json(401, { error: "unauthorized" }, { origin: input.origin });
    }
    if (!body.verification_id || !body.token) {
      return json(
        400,
        { error: "verification_id and token required" },
        { origin: input.origin },
      );
    }
    try {
      const result = await sendBusinessEmailVerification({
        supabase,
        verificationId: body.verification_id,
        token: body.token,
        publicAppUrl:
          process.env.MARKETPLACE_PUBLIC_URL?.trim() ??
          process.env.VITE_PUBLIC_SITE_URL?.trim() ??
          "http://localhost:5173",
        resendApiKey: process.env.RESEND_API_KEY,
      });
      return json(
        200,
        {
          ok: true,
          sent_via_resend: result.sentViaResend,
          dev_link: result.devLink ?? null,
        },
        { origin: input.origin },
      );
    } catch (e) {
      return json(
        500,
        { error: e instanceof Error ? e.message : String(e) },
        { origin: input.origin },
      );
    }
  }

  if (path === "/v1/identity/session" && method === "POST") {
    let body: { session_id?: string } = {};
    try {
      body = JSON.parse(input.body || "{}") as { session_id?: string };
    } catch {
      return json(400, { error: "invalid json" }, { origin: input.origin });
    }

    const auth = input.authorization ?? "";
    let authorized = cronSecret && auth === `Bearer ${cronSecret}`;
    if (!authorized && body.session_id) {
      const launchToken = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
      if (launchToken) {
        const { data, error } = await supabase.rpc("consume_identity_launch_token", {
          p_token: launchToken,
          p_session_id: body.session_id,
        });
        authorized = !error && data === true;
      }
    }
    if (!authorized) {
      return json(401, { error: "unauthorized" }, { origin: input.origin });
    }
    if (!body.session_id) {
      return json(400, { error: "session_id required" }, { origin: input.origin });
    }

    const { data: idSession } = await supabase
      .from(T.trust.identitySessions)
      .select("startup_id, person_verification_profile_id")
      .eq("id", body.session_id)
      .maybeSingle();

    let stripeKey = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
    if (idSession?.startup_id) {
      const sellerKey = await resolveStripeSecretKeyForStartup(
        supabase,
        idSession.startup_id as string,
      );
      if (sellerKey) stripeKey = sellerKey;
    }
    if (!stripeKey) {
      return json(
        503,
        {
          error: idSession?.person_verification_profile_id
            ? "Platform Stripe is not configured for identity verification."
            : "Connect your Stripe API key in step 1 (Revenue) first.",
        },
        { origin: input.origin },
      );
    }

    const publicAppUrl =
      process.env.MARKETPLACE_PUBLIC_URL?.trim() ??
      process.env.VITE_PUBLIC_SITE_URL?.trim() ??
      "http://localhost:5173";
    try {
      const session = await createStripeIdentitySession(
        supabase,
        body.session_id,
        { stripeSecretKey: stripeKey, publicAppUrl },
      );
      return json(200, session, { origin: input.origin });
    } catch (e) {
      return json(
        500,
        { error: e instanceof Error ? e.message : String(e) },
        { origin: input.origin },
      );
    }
  }

  if (path === "/v1/verification/process-registration" && method === "POST") {
    if (!cronSecret || input.authorization !== `Bearer ${cronSecret}`) {
      return json(401, { error: "unauthorized" }, { origin: input.origin });
    }
    let body: { document_id?: string } = {};
    try {
      body = JSON.parse(input.body || "{}") as { document_id?: string };
    } catch {
      return json(400, { error: "invalid json" }, { origin: input.origin });
    }
    if (!body.document_id) {
      return json(400, { error: "document_id required" }, { origin: input.origin });
    }
    try {
      await processRegistrationDocument(supabase, body.document_id);
      return json(200, { ok: true }, { origin: input.origin });
    } catch (e) {
      return json(
        500,
        { error: e instanceof Error ? e.message : String(e) },
        { origin: input.origin },
      );
    }
  }

  return json(404, { error: "not found" }, { origin: input.origin });
}
