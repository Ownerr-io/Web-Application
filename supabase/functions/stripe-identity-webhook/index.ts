/// <reference path="../deno-shim.d.ts" />
import { createClient } from "npm:@supabase/supabase-js@2";

/** Optional Supabase Edge entry; canonical production URL remains Vercel `/api/webhooks/stripe/identity`. */

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const rawBody = await req.text();
  const stripeSignature = req.headers.get("stripe-signature") ?? undefined;
  const webhookSecret = Deno.env.get("STRIPE_IDENTITY_WEBHOOK_SECRET")?.trim();
  const isProduction = Deno.env.get("ENVIRONMENT") === "production";

  if (isProduction && !webhookSecret) {
    return json({ error: "webhook_secret_missing" }, 503);
  }

  if (webhookSecret && stripeSignature) {
    const valid = await verifyStripeSignature(
      rawBody,
      stripeSignature,
      webhookSecret,
    );
    if (!valid) return json({ error: "invalid_signature" }, 400);
  }

  let event: {
    id: string;
    type: string;
    data: { object: { status?: string; metadata?: Record<string, string> } };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("", { status: 400 });
  }

  const verified =
    event.type === "identity.verification_session.verified" ||
    event.data?.object?.status === "verified";
  const failed = event.type === "identity.verification_session.canceled";
  if (!verified && !failed) {
    return json({ received: true, ignored: true }, 200);
  }

  const sessionId = event.data?.object?.metadata?.ownerr_session_id;
  if (!sessionId) {
    return json({ error: "missing_ownerr_session_id" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const { error } = await supabase.rpc("webhook_apply_identity_verification", {
    p_provider: "stripe_identity",
    p_external_event_id: event.id,
    p_session_id: sessionId,
    p_verified: verified,
    p_payload: event,
  });

  if (error) return json({ error: error.message }, 500);
  return json({ received: true }, 200);
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
): Promise<boolean> {
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

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = `${parts.t}.${payload}`;
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signed),
  );
  const expected = [...new Uint8Array(sigBuf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return parts.v1.some((v) => v === expected);
}
