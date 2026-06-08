import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SchemaTables as T } from "@workspace/db-schema";

const LAUNCH_TOKENS = T.system.businessEmailLaunchTokens;

function sha256Hex(value: string): string {
  return createHash("sha256").update(value.trim()).digest("hex");
}

/** One-time launch token (browser → worker), service-role only. */
export async function consumeBusinessEmailLaunchToken(
  supabase: SupabaseClient,
  launchToken: string,
  verificationId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const trimmedToken = launchToken.trim();
  const trimmedId = verificationId.trim();
  if (trimmedToken.length < 16 || !trimmedId) {
    return { ok: false, reason: "missing_token_or_verification_id" };
  }

  const { data, error } = await supabase.rpc(
    "consume_business_email_launch_token",
    {
      p_token: trimmedToken,
      p_verification_id: trimmedId,
    },
  );

  if (!error && data === true) {
    return { ok: true };
  }

  const tokenHash = sha256Hex(trimmedToken);
  const nowIso = new Date().toISOString();

  const { data: row, error: selectError } = await supabase
    .from(LAUNCH_TOKENS)
    .select("id")
    .eq("verification_id", trimmedId)
    .eq("token_hash", tokenHash)
    .is("consumed_at", null)
    .gt("expires_at", nowIso)
    .maybeSingle();

  if (selectError) {
    const msg = selectError.message ?? "select_failed";
    if (
      msg.includes("does not exist") ||
      msg.includes("business_email_launch_tokens")
    ) {
      return {
        ok: false,
        reason:
          "business_email_launch_tokens missing — apply migration 20260702370000_business_email_client_launch.sql",
      };
    }
    return { ok: false, reason: msg };
  }

  if (!row?.id) {
    return {
      ok: false,
      reason: error?.message ?? "launch_token_invalid_or_expired",
    };
  }

  const { error: updateError } = await supabase
    .from(LAUNCH_TOKENS)
    .update({ consumed_at: nowIso })
    .eq("id", row.id)
    .is("consumed_at", null);

  if (updateError) {
    return { ok: false, reason: updateError.message };
  }

  return { ok: true };
}
