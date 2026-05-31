export type FieldValidation = { ok: true } | { ok: false; message: string };

const EMAIL_PATTERN =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export function normalizeAuthEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateAuthEmail(raw: string): FieldValidation {
  const email = normalizeAuthEmail(raw);
  if (!email) return { ok: false, message: "Email is required." };
  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }
  return { ok: true };
}

export type PasswordRule = {
  id: string;
  label: string;
  test: (password: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "len", label: "At least 8 characters", test: (p) => p.length >= 8 },
  {
    id: "upper",
    label: "One uppercase letter",
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: "lower",
    label: "One lowercase letter",
    test: (p) => /[a-z]/.test(p),
  },
  { id: "num", label: "One number", test: (p) => /\d/.test(p) },
  {
    id: "special",
    label: "One special character",
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

export function validateAuthPassword(password: string): FieldValidation {
  if (!password) return { ok: false, message: "Password is required." };
  for (const rule of PASSWORD_RULES) {
    if (!rule.test(password)) {
      return {
        ok: false,
        message: `Password must include: ${rule.label.toLowerCase()}.`,
      };
    }
  }
  return { ok: true };
}

export function validatePasswordConfirmation(
  password: string,
  confirm: string,
): FieldValidation {
  if (!confirm) return { ok: false, message: "Confirm your password." };
  if (password !== confirm) {
    return { ok: false, message: "Passwords do not match." };
  }
  return { ok: true };
}

/** Supabase reauthentication / Email OTP token length (override via VITE_AUTH_OTP_LENGTH). */
const otpLenRaw = import.meta.env.VITE_AUTH_OTP_LENGTH as string | undefined;
const otpLenParsed = otpLenRaw ? Number.parseInt(otpLenRaw, 10) : 8;
export const OTP_LENGTH =
  Number.isFinite(otpLenParsed) && otpLenParsed >= 6 && otpLenParsed <= 12
    ? otpLenParsed
    : 8;

export function normalizeOtpToken(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

export function validateOtpToken(raw: string): FieldValidation {
  const token = normalizeOtpToken(raw);
  if (!token) return { ok: false, message: "Enter the verification code." };
  if (token.length !== OTP_LENGTH) {
    return {
      ok: false,
      message: `Enter the ${OTP_LENGTH}-digit code from your email.`,
    };
  }
  return { ok: true };
}
