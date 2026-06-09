import {
  createSyncWorkerRoute,
  syncWorkerApiConfig,
} from "../../_lib/syncWorkerVercel.js";

export const config = syncWorkerApiConfig;
export default createSyncWorkerRoute("/v1/process-jobs", "v1/process-jobs");
