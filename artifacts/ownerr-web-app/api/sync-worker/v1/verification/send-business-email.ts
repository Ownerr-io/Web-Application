import {
  createSyncWorkerRoute,
  syncWorkerApiConfig,
} from "../../../_lib/syncWorkerVercel.js";

export const config = syncWorkerApiConfig;
export default createSyncWorkerRoute(
  "/v1/verification/send-business-email",
  "v1/verification/send-business-email",
);
