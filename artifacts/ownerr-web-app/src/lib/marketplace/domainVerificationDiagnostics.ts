import type { DomainDiagnosticStatus } from "@workspace/integrations-core";
import { hostNameFieldOptions } from "@workspace/integrations-core/domain-dns-host";

export type DomainDnsDiagnosticView = {
  status: DomainDiagnosticStatus;
  severity: "info" | "warning" | "error";
  title: string;
  description: string;
  next_action: string;
  queried_host: string;
  expected_token: string;
  found_records: string[];
  nameservers: string[];
  checked_at: string;
  entered_domain?: string;
  verification_host?: string;
};

export type SyncWorkerHealthView = {
  engine_status: "online" | "offline" | "degraded";
  queue_pending: number;
  avg_processing_seconds: number | null;
  last_success_at: string | null;
  captured_at: string;
};

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

export function hostNameFieldOptionsForUi(verificationHost: string): {
  optionA: string;
  optionB: string;
} {
  return hostNameFieldOptions(verificationHost);
}

export function parseDomainDnsDiagnosticRpc(
  data: unknown,
): DomainDnsDiagnosticView | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const status = row.status;
  if (typeof status !== "string") return null;
  return {
    status: status as DomainDiagnosticStatus,
    severity:
      row.severity === "info" ||
      row.severity === "warning" ||
      row.severity === "error"
        ? row.severity
        : "info",
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    next_action: String(row.next_action ?? ""),
    queried_host: String(row.queried_host ?? ""),
    expected_token: String(row.expected_token ?? ""),
    found_records: parseStringArray(row.found_records),
    nameservers: parseStringArray(row.nameservers),
    checked_at: String(row.checked_at ?? ""),
    entered_domain:
      typeof row.entered_domain === "string" ? row.entered_domain : undefined,
    verification_host:
      typeof row.verification_host === "string"
        ? row.verification_host
        : undefined,
  };
}

export function parseSyncWorkerHealthRpc(
  data: unknown,
): SyncWorkerHealthView | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const engine = row.engine_status;
  return {
    engine_status:
      engine === "offline" || engine === "degraded" ? engine : "online",
    queue_pending:
      typeof row.queue_pending === "number" ? row.queue_pending : 0,
    avg_processing_seconds:
      typeof row.avg_processing_seconds === "number"
        ? row.avg_processing_seconds
        : null,
    last_success_at:
      typeof row.last_success_at === "string" ? row.last_success_at : null,
    captured_at: String(row.captured_at ?? new Date().toISOString()),
  };
}
