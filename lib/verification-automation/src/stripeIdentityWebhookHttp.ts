import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { applyStripeIdentityWebhook } from "./handlers.js";

/** Canonical public path (production + local via Vite proxy). */
export const STRIPE_IDENTITY_WEBHOOK_PATH = "/api/webhooks/stripe/identity";

/** @deprecated Use STRIPE_IDENTITY_WEBHOOK_PATH only. */
export const LEGACY_STRIPE_IDENTITY_WEBHOOK_PATH =
  "/v1/webhooks/identity/stripe";

export function isStripeIdentityWebhookPath(urlPath: string): boolean {
  const path = urlPath.split("?")[0];
  return (
    path === STRIPE_IDENTITY_WEBHOOK_PATH ||
    path === LEGACY_STRIPE_IDENTITY_WEBHOOK_PATH
  );
}

export function isLegacyStripeIdentityWebhookPath(urlPath: string): boolean {
  const path = urlPath.split("?")[0];
  return path === LEGACY_STRIPE_IDENTITY_WEBHOOK_PATH;
}

const DEFAULT_TOLERANCE_SEC = 300;

export type StripeIdentityWebhookHttpResult = {
  status: number;
  body: string;
  contentType?: string;
};

export function verifyStripeWebhookSignature(
  payload: string,
  header: string,
  secret: string,
  toleranceSeconds = DEFAULT_TOLERANCE_SEC,
): boolean {
  const parts = header.split(",").reduce(
    (acc, piece) => {
      const [k, v] = piece.split("=");
      if (k === "t") acc.t = v;
      if (k === "v1") acc.v1.push(v);
      return acc;
    },
    { t: "", v1: [] as string[] },
  );
  if (!parts.t || parts.v1.length === 0) return false;

  const timestamp = Number.parseInt(parts.t, 10);
  if (!Number.isFinite(timestamp)) return false;
  const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (age > toleranceSeconds) return false;

  const signed = `${parts.t}.${payload}`;
  const expected = createHmac("sha256", secret)
    .update(signed, "utf8")
    .digest("hex");
  return parts.v1.some((sig) => {
    try {
      const a = Buffer.from(sig, "hex");
      const b = Buffer.from(expected, "hex");
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  });
}

export async function handleStripeIdentityWebhookHttp(
  supabase: SupabaseClient,
  opts: {
    rawBody: string;
    stripeSignatureHeader: string | undefined;
    webhookSecret: string | undefined;
    isProduction: boolean;
  },
): Promise<StripeIdentityWebhookHttpResult> {
  const requestId = randomUUID();
  const started = Date.now();
  const json = { "Content-Type": "application/json" };
  const { rawBody, stripeSignatureHeader, webhookSecret, isProduction } = opts;

  if (isProduction && !webhookSecret) {
    return {
      status: 503,
      body: JSON.stringify({
        error: "STRIPE_IDENTITY_WEBHOOK_SECRET required in production",
      }),
      contentType: json["Content-Type"],
    };
  }

  if (webhookSecret) {
    if (
      typeof stripeSignatureHeader !== "string" ||
      !verifyStripeWebhookSignature(
        rawBody,
        stripeSignatureHeader,
        webhookSecret,
      )
    ) {
      return {
        status: 400,
        body: JSON.stringify({ error: "invalid signature" }),
        contentType: json["Content-Type"],
      };
    }
  }

  let event: Parameters<typeof applyStripeIdentityWebhook>[1];
  try {
    event = JSON.parse(rawBody) as Parameters<
      typeof applyStripeIdentityWebhook
    >[1];
  } catch {
    return { status: 400, body: "", contentType: undefined };
  }

  try {
    await applyStripeIdentityWebhook(supabase, event, requestId);
    console.info(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        request_id: requestId,
        route: STRIPE_IDENTITY_WEBHOOK_PATH,
        rpc_name: "webhook_apply_identity_verification",
        duration_ms: Date.now() - started,
        status: "ok",
      }),
    );
    return {
      status: 200,
      body: JSON.stringify({ received: true }),
      contentType: json["Content-Type"],
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        request_id: requestId,
        route: STRIPE_IDENTITY_WEBHOOK_PATH,
        rpc_name: "webhook_apply_identity_verification",
        duration_ms: Date.now() - started,
        status: "error",
        error_code: "WEBHOOK_FAILED",
        message,
      }),
    );
    return {
      status: 500,
      body: JSON.stringify({ error: message }),
      contentType: json["Content-Type"],
    };
  }
}
