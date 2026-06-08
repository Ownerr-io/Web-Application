const PREFIX = "[verification";

function workerDebugEnabled(): boolean {
  if (process.env.SYNC_WORKER_VERIFICATION_DEBUG === "1") return true;
  return process.env.NODE_ENV !== "production";
}

export function verificationWorkerLog(
  phase: string,
  message: string,
  data?: Record<string, unknown>,
): void {
  if (!workerDebugEnabled()) return;
  const tag = `${PREFIX}:${phase}]`;
  if (data && Object.keys(data).length > 0) {
    console.info(tag, message, data);
  } else {
    console.info(tag, message);
  }
}

export function verificationWorkerWarn(
  phase: string,
  message: string,
  data?: Record<string, unknown>,
): void {
  if (!workerDebugEnabled()) return;
  const tag = `${PREFIX}:${phase}]`;
  if (data) console.warn(tag, message, data);
  else console.warn(tag, message);
}

export function verificationWorkerError(
  phase: string,
  message: string,
  data?: Record<string, unknown>,
): void {
  const tag = `${PREFIX}:${phase}]`;
  if (data) console.error(tag, message, data);
  else console.error(tag, message);
}
