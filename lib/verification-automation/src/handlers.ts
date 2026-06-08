import type { SupabaseClient } from "@supabase/supabase-js";
import { SchemaTables as T } from "@workspace/db-schema";
import { runGoogleDocumentAiOcr } from "./ocr/googleDocumentAi.js";
import { resolveStripeSecretKeyForStartup } from "./stripeKey.js";

export async function sendBusinessEmailVerification(input: {
  supabase: SupabaseClient;
  verificationId: string;
  token: string;
  publicAppUrl: string;
  resendApiKey?: string;
}): Promise<{ sentViaResend: boolean; devLink?: string }> {
  const { data: row, error } = await input.supabase
    .from(T.trust.businessEmailVerifications)
    .select("id, email")
    .eq("id", input.verificationId)
    .maybeSingle();
  if (error || !row)
    throw new Error(error?.message ?? "Verification not found");

  const link = `${input.publicAppUrl.replace(/\/$/, "")}/marketplace/verify-business-email?token=${encodeURIComponent(input.token)}`;

  if (input.resendApiKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Ownerr <verify@ownerr.live>",
        to: [row.email],
        subject: "Verify your business email for Ownerr",
        html: `<p>Confirm your work email to continue listing verification.</p><p><a href="${link}">Verify email</a></p><p>Link expires in 48 hours.</p>`,
      }),
    });
    if (!res.ok) throw new Error(`Resend failed: ${await res.text()}`);
    return { sentViaResend: true };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "RESEND_API_KEY is required to send business email in production",
    );
  }

  console.info(`[business-email] ${row.email} → ${link}`);
  return { sentViaResend: false, devLink: link };
}

export async function processRegistrationDocument(
  supabase: SupabaseClient,
  documentId: string,
): Promise<void> {
  const { data: doc, error } = await supabase
    .from(T.trust.registrationDocuments)
    .select("id, startup_id, storage_path, doc_type")
    .eq("id", documentId)
    .maybeSingle();
  if (error || !doc) throw new Error(error?.message ?? "Document not found");

  const bucket =
    process.env.REGISTRATION_DOCS_BUCKET?.trim() ?? "verification-documents";
  const storagePath = doc.storage_path?.trim();
  if (!storagePath) {
    await supabase.rpc("fail_registration_document", {
      p_document_id: documentId,
      p_error: "Missing storage_path",
    });
    return;
  }

  const { data: file, error: dlErr } = await supabase.storage
    .from(bucket)
    .download(storagePath);
  if (dlErr || !file) {
    await supabase.rpc("fail_registration_document", {
      p_document_id: documentId,
      p_error: dlErr?.message ?? "Storage download failed",
    });
    return;
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = file.type || "application/pdf";
  const ocrProvider =
    process.env.VERIFICATION_OCR_PROVIDER?.trim() ?? "google_document_ai";

  if (ocrProvider !== "google_document_ai") {
    await supabase.rpc("fail_registration_document", {
      p_document_id: documentId,
      p_error: `Unsupported OCR provider: ${ocrProvider}`,
    });
    return;
  }

  try {
    const { extracted, confidence } = await runGoogleDocumentAiOcr({
      fileBytes: bytes,
      mimeType,
    });

    const { error: rpcErr } = await supabase.rpc(
      "complete_registration_verification",
      {
        p_document_id: documentId,
        p_extracted: extracted,
        p_confidence: confidence,
      },
    );
    if (rpcErr) throw new Error(rpcErr.message);
  } catch (e) {
    const message = e instanceof Error ? e.message : "OCR failed";
    await supabase.rpc("fail_registration_document", {
      p_document_id: documentId,
      p_error: message,
    });
    throw e;
  }
}

export async function createStripeIdentitySession(
  supabase: SupabaseClient,
  sessionId: string,
  opts: { stripeSecretKey: string; publicAppUrl: string },
): Promise<{ url: string; clientSecret: string }> {
  const { data: session, error } = await supabase
    .from(T.trust.identitySessions)
    .select("id, startup_id, person_verification_profile_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (error || !session) throw new Error(error?.message ?? "Session not found");

  const base = opts.publicAppUrl.replace(/\/$/, "");
  let returnUrl = `${base}/marketplace/app/seller/verification?from=identity`;

  if (session.person_verification_profile_id) {
    const { data: profile } = await supabase
      .from(T.trust.personProfiles)
      .select("marketplace_profile_id, marketplace_profiles(desk_role)")
      .eq("id", session.person_verification_profile_id)
      .maybeSingle();
    const desk =
      profile &&
      typeof profile === "object" &&
      "marketplace_profiles" in profile &&
      profile.marketplace_profiles &&
      typeof profile.marketplace_profiles === "object" &&
      "desk_role" in profile.marketplace_profiles
        ? String(
            (profile.marketplace_profiles as { desk_role: string }).desk_role,
          )
        : "seller";
    returnUrl =
      desk === "buyer"
        ? `${base}/marketplace/app/buyer/verification?from=identity`
        : `${base}/marketplace/app/seller/verification?from=identity`;
  } else if (session.startup_id) {
    const { data: startup } = await supabase
      .from(T.marketplace.companies)
      .select("slug")
      .eq("id", session.startup_id)
      .maybeSingle();
    const slug = typeof startup?.slug === "string" ? startup.slug.trim() : "";
    returnUrl = slug
      ? `${base}/marketplace/app/seller/companies/${encodeURIComponent(slug)}?tab=verification&from=identity`
      : `${base}/marketplace/app/seller/companies?from=identity`;
  }

  const params = new URLSearchParams();
  params.set("type", "document");
  params.set("metadata[ownerr_session_id]", sessionId);
  if (session.startup_id) {
    params.set("metadata[startup_id]", session.startup_id);
  }
  if (session.person_verification_profile_id) {
    params.set(
      "metadata[person_verification_profile_id]",
      session.person_verification_profile_id,
    );
  }
  params.set("return_url", returnUrl);

  const res = await fetch(
    "https://api.stripe.com/v1/identity/verification_sessions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );
  const json = (await res.json()) as {
    id?: string;
    client_secret?: string;
    url?: string;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(json.error?.message ?? "Stripe Identity session failed");
  }

  const { error: updateErr } = await supabase
    .from(T.trust.identitySessions)
    .update({
      external_session_id: json.id,
      client_secret: json.client_secret,
      redirect_url: json.url,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
  if (updateErr) throw new Error(updateErr.message);

  return { url: json.url ?? returnUrl, clientSecret: json.client_secret ?? "" };
}

export async function applyStripeIdentityWebhook(
  supabase: SupabaseClient,
  event: {
    id: string;
    type: string;
    data: { object: { status?: string; metadata?: Record<string, string> } };
  },
  requestId?: string,
): Promise<void> {
  const verified =
    event.type === "identity.verification_session.verified" ||
    event.data.object.status === "verified";

  const failed = event.type === "identity.verification_session.canceled";

  if (!verified && !failed) return;

  const sessionId = event.data.object.metadata?.ownerr_session_id;
  if (!sessionId) {
    throw new Error(
      "Stripe Identity webhook missing metadata.ownerr_session_id",
    );
  }

  const { error } = await supabase.rpc("webhook_apply_identity_verification", {
    p_provider: "stripe_identity",
    p_external_event_id: event.id,
    p_session_id: sessionId,
    p_verified: verified,
    p_payload: {
      ...(event as unknown as Record<string, unknown>),
      request_id: requestId ?? null,
    },
  });
  if (error) throw new Error(error.message);
}

/** Poll Stripe for pending identity sessions (local dev without webhooks). */
export async function syncStripeIdentitySessionsForStartup(
  supabase: SupabaseClient,
  startupId: string,
): Promise<number> {
  const stripeKey = await resolveStripeSecretKeyForStartup(supabase, startupId);
  if (!stripeKey) return 0;

  const { data: sessions, error } = await supabase
    .from(T.trust.identitySessions)
    .select("id, external_session_id, status")
    .eq("startup_id", startupId)
    .in("status", ["pending"])
    .not("external_session_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error || !sessions?.length) return 0;

  let updated = 0;
  for (const row of sessions) {
    const extId = row.external_session_id as string;
    if (!extId) continue;

    const res = await fetch(
      `https://api.stripe.com/v1/identity/verification_sessions/${encodeURIComponent(extId)}`,
      { headers: { Authorization: `Bearer ${stripeKey}` } },
    );
    const json = (await res.json()) as {
      status?: string;
      error?: { message?: string };
    };
    if (!res.ok) continue;

    const status = json.status ?? "";
    if (status === "verified") {
      const { error: rpcErr } = await supabase.rpc(
        "webhook_apply_identity_verification",
        {
          p_provider: "stripe_identity",
          p_external_event_id: `poll_${extId}_${Date.now()}`,
          p_session_id: row.id,
          p_verified: true,
          p_payload: { source: "stripe_poll", status },
        },
      );
      if (!rpcErr) updated += 1;
    } else if (status === "canceled" || status === "requires_input") {
      const failed = status === "canceled";
      if (failed) {
        const { error: rpcErr } = await supabase.rpc(
          "webhook_apply_identity_verification",
          {
            p_provider: "stripe_identity",
            p_external_event_id: `poll_${extId}_${Date.now()}`,
            p_session_id: row.id,
            p_verified: false,
            p_payload: { source: "stripe_poll", status },
          },
        );
        if (!rpcErr) updated += 1;
      }
    }
  }
  return updated;
}
