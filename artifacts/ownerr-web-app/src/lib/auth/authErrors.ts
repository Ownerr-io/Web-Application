import type { AuthError } from "@supabase/supabase-js";

function authErr(error: unknown): AuthError | null {
  if (!error || typeof error !== "object") return null;
  return error as AuthError;
}

export function mapSupabaseAuthError(error: unknown): string {
  const err = authErr(error);
  if (!err) {
    return "Something went wrong. Please try again.";
  }
  const msg = err.message?.toLowerCase() ?? "";
  const code = err.code ?? "";

  if (code === "over_email_send_rate_limit" || msg.includes("rate limit")) {
    return "Too many emails sent. Wait a few minutes before trying again.";
  }
  if (msg.includes("user already registered")) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (msg.includes("signup disabled")) {
    return "New sign-ups are not available right now.";
  }
  if (
    msg.includes("redirect") ||
    msg.includes("redirect_to") ||
    code === "validation_failed"
  ) {
    return "Auth redirect URL is not allowed. Add your product callback URL in Supabase Dashboard → Authentication → URL configuration.";
  }
  if (msg.includes("email address invalid")) {
    return "Enter a valid email address.";
  }
  if (msg.includes("email not confirmed")) {
    return "Confirm your email before signing in, or request a new verification link.";
  }
  if (msg.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }
  if (
    msg.includes("otp") &&
    (msg.includes("expired") || msg.includes("invalid"))
  ) {
    return "That code is invalid or expired. Request a new code and try again.";
  }
  if (msg.includes("weak password") || msg.includes("password")) {
    return err.message;
  }

  return err.message || "Something went wrong. Please try again.";
}

export function isEmailNotConfirmedError(error: unknown): boolean {
  const err = authErr(error);
  if (!err) return false;
  const msg = (err.message ?? "").toLowerCase();
  return msg.includes("email not confirmed");
}

/** Supabase requires reauthentication before sensitive updates (e.g. password). */
export function isReauthenticationRequiredError(error: unknown): boolean {
  const err = authErr(error);
  if (!err) return false;
  const msg = (err.message ?? "").toLowerCase();
  const code = (err.code ?? "").toLowerCase();
  return (
    code.includes("reauth") ||
    msg.includes("reauthentication") ||
    msg.includes("re-auth") ||
    msg.includes("recent login") ||
    msg.includes("nonce") ||
    (msg.includes("sensitive") && msg.includes("requires"))
  );
}

/** Magic link sign-in when account does not exist (`shouldCreateUser: false`). */
export function isMagicLinkNoAccountError(error: unknown): boolean {
  const err = authErr(error);
  if (!err) return false;
  const msg = (err.message ?? "").toLowerCase();
  const code = (err.code ?? "").toLowerCase();
  return (
    code === "otp_disabled" ||
    msg.includes("signups not allowed") ||
    msg.includes("user not found") ||
    msg.includes("no user") ||
    (msg.includes("signup") && msg.includes("disabled"))
  );
}
