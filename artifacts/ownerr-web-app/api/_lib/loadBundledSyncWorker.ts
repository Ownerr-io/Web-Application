export type SyncWorkerHttpResult = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

// @ts-expect-error .mjs bundle (see syncWorkerHandlers.bundle.mjs.d.ts)
import { handleSyncWorkerHttpRequest } from "./syncWorkerHandlers.bundle.mjs";

export async function handleBundledSyncWorkerRequest(
  input: Parameters<typeof handleSyncWorkerHttpRequest>[0],
): Promise<SyncWorkerHttpResult> {
  return handleSyncWorkerHttpRequest(input);
}
