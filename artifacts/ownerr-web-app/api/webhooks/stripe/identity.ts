import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleStripeIdentityWebhookHttp } from "@workspace/verification-automation";
import { getSupabaseServiceClient } from "../../_lib/supabaseService.js";
import { readRawBody } from "../../_lib/readRawBody.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  let supabase;
  try {
    supabase = getSupabaseServiceClient();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    res.status(503).json({ error: message });
    return;
  }

  const rawBody = await readRawBody(req);
  const sig = req.headers["stripe-signature"];
  const stripeSignatureHeader = typeof sig === "string" ? sig : sig?.[0];

  const result = await handleStripeIdentityWebhookHttp(supabase, {
    rawBody,
    stripeSignatureHeader,
    webhookSecret: process.env.STRIPE_IDENTITY_WEBHOOK_SECRET?.trim(),
    isProduction: process.env.NODE_ENV === "production",
  });

  if (result.contentType) {
    res.setHeader("Content-Type", result.contentType);
  }
  res.status(result.status).send(result.body);
}
