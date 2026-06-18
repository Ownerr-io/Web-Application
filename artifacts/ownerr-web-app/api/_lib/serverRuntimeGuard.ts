/** Prevent server-only modules from being bundled or executed in a browser context. */
export function assertServerRuntime(caller: string): void {
  if (typeof process === "undefined" || !process.versions?.node) {
    throw new Error(`${caller} must not run in the browser`);
  }
}

const SECRET_KEY_PATTERN =
  /^(SUPABASE_SERVICE_ROLE_KEY|SYNC_WORKER_CRON_SECRET|STRIPE_SECRET_KEY|STRIPE_IDENTITY_WEBHOOK_SECRET|PLATFORM_ENCRYPTION_KEY|RESEND_API_KEY)=/i;

export function redactSecretLikeStrings(value: string): string {
  return value.replace(
    /\b(sk_(live|test)_[a-zA-Z0-9]+|eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)\b/g,
    "[REDACTED]",
  );
}

export function assertApiSecretsConfigured(): void {
  assertServerRuntime("assertApiSecretsConfigured");
  const url = process.env.SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (server env only — never VITE_*)",
    );
  }
  if (serviceKey.length < 32) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY appears invalid");
  }
}

export function scanTextForAccidentalSecretKeys(text: string): string[] {
  const hits: string[] = [];
  for (const line of text.split("\n")) {
    if (SECRET_KEY_PATTERN.test(line.trim())) {
      hits.push(line.trim().split("=")[0] ?? "secret");
    }
  }
  return hits;
}
