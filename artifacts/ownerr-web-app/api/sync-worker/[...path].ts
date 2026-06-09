import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  serveSyncWorkerRoute,
  syncWorkerApiConfig,
} from "../_lib/syncWorkerVercel.js";

export const config = syncWorkerApiConfig;

/** Fallback catch-all when the platform registers `[...path]` routes. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const slug = req.query.path;
  const segments = Array.isArray(slug) ? slug : slug ? [slug] : [];
  const pathSuffix = segments.join("/");
  if (!pathSuffix) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const logicalPath = `/${pathSuffix}`;
  await serveSyncWorkerRoute(req, res, logicalPath, pathSuffix);
}
