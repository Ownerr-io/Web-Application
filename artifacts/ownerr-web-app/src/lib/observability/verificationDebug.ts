/** Dev-only verification tracing (no-op in production builds). */

export type VerificationDebugLevel = "info" | "warn" | "error";

export type VerificationDebugEntry = {
  id: string;
  at: string;
  phase: string;
  message: string;
  level: VerificationDebugLevel;
  data?: Record<string, unknown>;
};

function devOnly(): boolean {
  return import.meta.env.DEV;
}

export function isVerificationDebugEnabled(): boolean {
  return devOnly();
}

export function setVerificationDebugEnabled(_on: boolean): void {
  /* no-op — debug UI removed for production */
}

export function verificationDebugLog(
  _phase: string,
  _message: string,
  _data?: Record<string, unknown>,
  _level: VerificationDebugLevel = "info",
): void {
  if (!devOnly()) return;
}

export async function verificationDebugStep<T>(
  _phase: string,
  _message: string,
  fn: () => Promise<T> | T,
  _data?: Record<string, unknown>,
): Promise<T> {
  return fn();
}

export function getVerificationDebugEntries(): VerificationDebugEntry[] {
  return [];
}

export function clearVerificationDebugEntries(): void {
  /* no-op */
}

export function subscribeVerificationDebug(_onChange: () => void): () => void {
  return () => undefined;
}

export function gatesSummaryForDebug(
  gates: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!gates) return {};
  return {
    founder_person_status: gates.founder_person_status,
    domain_status: gates.domain_status,
    business_email_status: gates.business_email_status,
    revenue_status: gates.revenue_status,
  };
}

export function verificationDebugSnapshotResult(
  _slug: string,
  _snap: unknown,
  _meta: { context?: string },
): void {
  if (!devOnly()) return;
}
