import { getSupabase } from "@/lib/supabase/client";
import { normalizeOtpToken } from "@/lib/auth/validation";

const url = () => import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = () =>
  import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Avoid duplicate reauth emails (e.g. React Strict Mode double mount). */
let lastReauthSendAt = 0;
const REAUTH_SEND_DEBOUNCE_MS = 8_000;

function normalizeNonce(raw: string): string {
  return normalizeOtpToken(raw);
}

export type ReauthSendResult = "sent" | "debounced";

/** Sends the Supabase reauthentication OTP email (Reauthentication template). */
export async function sendReauthenticationOtp(options?: {
  /** Bypass client debounce (explicit resend). */
  force?: boolean;
}): Promise<ReauthSendResult> {
  const now = Date.now();
  if (!options?.force && now - lastReauthSendAt < REAUTH_SEND_DEBOUNCE_MS) {
    return "debounced";
  }

  const supabase = getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Sign in to verify your identity.");
  }

  const auth = supabase.auth as {
    reauthenticate?: () => Promise<{ error: { message: string } | null }>;
  };
  if (typeof auth.reauthenticate === "function") {
    const { error } = await auth.reauthenticate();
    if (error) throw error;
    lastReauthSendAt = now;
    return "sent";
  }

  const base = url()?.replace(/\/$/, "");
  const key = anonKey();
  if (!base || !key) {
    throw new Error("Supabase is not configured.");
  }

  const res = await fetch(`${base}/auth/v1/reauthenticate`, {
    method: "GET",
    headers: {
      apikey: key,
      Authorization: `Bearer ${session.access_token}`,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      msg?: string;
      message?: string;
      error_description?: string;
    };
    throw new Error(
      body.msg ??
        body.message ??
        body.error_description ??
        "Could not send verification code.",
    );
  }
  lastReauthSendAt = now;
  return "sent";
}

/**
 * Secure password change: pass the email code as `nonce` on updateUser (not verifyOtp).
 * @see https://supabase.com/docs/reference/javascript/auth-reauthenticate
 */
export async function updatePasswordWithReauthNonce(
  newPassword: string,
  nonce: string,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
    nonce: normalizeNonce(nonce),
  });
  if (error) throw error;
}

/** Step-up only (no password change) — confirms reauth nonce on the session. */
export async function confirmReauthenticationNonce(
  nonce: string,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.updateUser({
    nonce: normalizeNonce(nonce),
  });
  if (error) throw error;
}
