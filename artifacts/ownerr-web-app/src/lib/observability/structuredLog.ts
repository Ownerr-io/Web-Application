import { randomUUID } from "crypto";

export type StructuredLogFields = {
  timestamp: string;
  request_id: string;
  user_id?: string | null;
  route?: string | null;
  rpc_name?: string | null;
  duration_ms?: number | null;
  status: "ok" | "error";
  error_code?: string | null;
  [key: string]: unknown;
};

export function newRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return randomUUID();
}

export function structuredLog(fields: StructuredLogFields): void {
  const line = JSON.stringify({
    ...fields,
    timestamp: fields.timestamp ?? new Date().toISOString(),
  });
  if (!import.meta.env.DEV) return;
  if (fields.status === "error") {
    console.error(line);
  } else {
    console.info(line);
  }
}

export function routeFromRpc(rpcName: string): string {
  return `/rpc/${rpcName}`;
}
