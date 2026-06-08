import type http from "node:http";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SchemaTables as T } from "@workspace/db-schema";
import {
  createStripeIdentitySession,
  handleStripeIdentityWebhookHttp,
  isStripeIdentityWebhookPath,
  isLegacyStripeIdentityWebhookPath,
  processRegistrationDocument,
  resolveStripeSecretKeyForStartup,
  sendBusinessEmailVerification,
  consumeBusinessEmailLaunchToken,
} from "@workspace/verification-automation";

export async function handleVerificationHttp(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  opts: {
    url: string;
    method: string | undefined;
    cronSecret: string | undefined;
    supabase: SupabaseClient;
    readBody: () => Promise<string>;
  },
): Promise<boolean> {
  const auth = req.headers.authorization ?? "";
  const authorized = opts.cronSecret && auth === `Bearer ${opts.cronSecret}`;

  if (
    opts.url === "/v1/verification/send-business-email" &&
    opts.method === "POST"
  ) {
    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders(req));
      res.end();
      return true;
    }

    const raw = await opts.readBody();
    let body: { verification_id?: string; token?: string } = {};
    try {
      body = JSON.parse(raw || "{}") as {
        verification_id?: string;
        token?: string;
      };
    } catch {
      res.writeHead(400, {
        ...corsHeaders(req),
        "Content-Type": "application/json",
      });
      res.end(JSON.stringify({ error: "invalid json" }));
      return true;
    }

    let emailAuthorized =
      opts.cronSecret && auth === `Bearer ${opts.cronSecret}`;
    let authDetail = "missing_authorization";
    if (!emailAuthorized && body.verification_id) {
      const launchToken = auth.startsWith("Bearer ")
        ? auth.slice(7).trim()
        : "";
      if (launchToken) {
        const consumed = await consumeBusinessEmailLaunchToken(
          opts.supabase,
          launchToken,
          body.verification_id,
        );
        emailAuthorized = consumed.ok;
        if (!consumed.ok) authDetail = consumed.reason;
      }
    }

    if (!emailAuthorized) {
      res.writeHead(401, {
        ...corsHeaders(req),
        "Content-Type": "application/json",
      });
      res.end(JSON.stringify({ error: "unauthorized", detail: authDetail }));
      return true;
    }
    if (!body.verification_id || !body.token) {
      res.writeHead(400, {
        ...corsHeaders(req),
        "Content-Type": "application/json",
      });
      res.end(JSON.stringify({ error: "verification_id and token required" }));
      return true;
    }
    try {
      const result = await sendBusinessEmailVerification({
        supabase: opts.supabase,
        verificationId: body.verification_id,
        token: body.token,
        publicAppUrl:
          process.env.MARKETPLACE_PUBLIC_URL ?? "http://localhost:5173",
        resendApiKey: process.env.RESEND_API_KEY,
      });
      res.writeHead(200, {
        ...corsHeaders(req),
        "Content-Type": "application/json",
      });
      res.end(
        JSON.stringify({
          ok: true,
          sent_via_resend: result.sentViaResend,
          dev_link: result.devLink ?? null,
        }),
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      res.writeHead(500, {
        ...corsHeaders(req),
        "Content-Type": "application/json",
      });
      res.end(JSON.stringify({ error: message }));
    }
    return true;
  }

  if (
    opts.url === "/v1/verification/process-registration" &&
    opts.method === "POST"
  ) {
    if (!authorized) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "unauthorized" }));
      return true;
    }
    const body = JSON.parse((await opts.readBody()) || "{}") as {
      document_id?: string;
    };
    if (!body.document_id) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "document_id required" }));
      return true;
    }
    try {
      await processRegistrationDocument(opts.supabase, body.document_id);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: message }));
      return true;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return true;
  }

  if (opts.url === "/v1/identity/session" && opts.method === "POST") {
    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders(req));
      res.end();
      return true;
    }

    const raw = await opts.readBody();
    let body: { session_id?: string } = {};
    try {
      body = JSON.parse(raw || "{}") as { session_id?: string };
    } catch {
      res.writeHead(400, {
        ...corsHeaders(req),
        "Content-Type": "application/json",
      });
      res.end(JSON.stringify({ error: "invalid json" }));
      return true;
    }

    let authorized = opts.cronSecret && auth === `Bearer ${opts.cronSecret}`;
    if (!authorized && body.session_id) {
      const launchToken = auth.startsWith("Bearer ")
        ? auth.slice(7).trim()
        : "";
      if (launchToken) {
        const { data, error } = await opts.supabase.rpc(
          "consume_identity_launch_token",
          {
            p_token: launchToken,
            p_session_id: body.session_id,
          },
        );
        authorized = !error && data === true;
      }
    }

    if (!authorized) {
      res.writeHead(401, {
        ...corsHeaders(req),
        "Content-Type": "application/json",
      });
      res.end(JSON.stringify({ error: "unauthorized" }));
      return true;
    }
    if (!body.session_id) {
      res.writeHead(400, {
        ...corsHeaders(req),
        "Content-Type": "application/json",
      });
      res.end(JSON.stringify({ error: "session_id required" }));
      return true;
    }

    const { data: idSession } = await opts.supabase
      .from(T.trust.identitySessions)
      .select("startup_id, person_verification_profile_id")
      .eq("id", body.session_id)
      .maybeSingle();

    let stripeKey = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
    if (idSession?.startup_id) {
      const sellerKey = await resolveStripeSecretKeyForStartup(
        opts.supabase,
        idSession.startup_id as string,
      );
      if (sellerKey) stripeKey = sellerKey;
    }

    if (!stripeKey) {
      res.writeHead(503, {
        ...corsHeaders(req),
        "Content-Type": "application/json",
      });
      res.end(
        JSON.stringify({
          error: idSession?.person_verification_profile_id
            ? "Platform Stripe is not configured for identity verification."
            : "Connect your Stripe API key in step 1 (Revenue) first. Identity verification uses your Stripe account (encrypted server-side), not a platform key.",
        }),
      );
      return true;
    }
    const publicAppUrl =
      process.env.MARKETPLACE_PUBLIC_URL?.trim() || "http://localhost:5173";
    const result = await createStripeIdentitySession(
      opts.supabase,
      body.session_id,
      {
        stripeSecretKey: stripeKey,
        publicAppUrl,
      },
    );
    res.writeHead(200, {
      ...corsHeaders(req),
      "Content-Type": "application/json",
    });
    res.end(JSON.stringify({ ok: true, ...result }));
    return true;
  }

  if (isLegacyStripeIdentityWebhookPath(opts.url) && opts.method === "POST") {
    res.writeHead(410, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: "deprecated_path",
        canonical: "/api/webhooks/stripe/identity",
      }),
    );
    return true;
  }

  if (isStripeIdentityWebhookPath(opts.url) && opts.method === "POST") {
    const raw = await opts.readBody();
    const sigHeader = req.headers["stripe-signature"];
    const stripeSignatureHeader =
      typeof sigHeader === "string" ? sigHeader : undefined;
    const result = await handleStripeIdentityWebhookHttp(opts.supabase, {
      rawBody: raw,
      stripeSignatureHeader,
      webhookSecret: process.env.STRIPE_IDENTITY_WEBHOOK_SECRET?.trim(),
      isProduction: process.env.NODE_ENV === "production",
    });
    const headers: Record<string, string> = {};
    if (result.contentType) headers["Content-Type"] = result.contentType;
    res.writeHead(result.status, headers);
    res.end(result.body);
    return true;
  }

  if (
    opts.url === "/v1/verification/revalidation-sweep" &&
    opts.method === "POST"
  ) {
    if (!authorized) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "unauthorized" }));
      return true;
    }
    const body = JSON.parse((await opts.readBody()) || "{}") as {
      limit?: number;
    };
    const { data, error } = await opts.supabase.rpc(
      "run_verification_revalidation_sweep",
      {
        p_limit: body.limit ?? 200,
      },
    );
    if (error) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: error.message }));
      return true;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, result: data }));
    return true;
  }

  return false;
}

function corsHeaders(req: http.IncomingMessage): Record<string, string> {
  const origin = req.headers.origin ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    Vary: "Origin",
  };
}
