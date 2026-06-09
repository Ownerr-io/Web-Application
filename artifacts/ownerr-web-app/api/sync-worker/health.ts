import {
  createSyncWorkerRoute,
  syncWorkerApiConfig,
} from "../_lib/syncWorkerVercel.js";

export const config = syncWorkerApiConfig;
export default createSyncWorkerRoute("/health", "health");
