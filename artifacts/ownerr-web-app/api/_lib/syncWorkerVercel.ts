import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readRawBody } from "./readRawBody.js";
import { handleBundledSyncWorkerRequest } from "./loadBundledSyncWorker.js";

export const syncWorkerApiConfig = {
  api: {
    bodyParser: false as const,
  },
};

function internalWorkerBase(): string | null {
  const raw =
    process.env.SYNC_WORKER_INTERNAL_URL?.trim() ??
    process.env.SYNC_WORKER_PROXY_TARGET?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

async function proxyToExternalWorker(
  req: VercelRequest,
  res: VercelResponse,
  pathSuffix: string,
): Promise<void> {
  const base = internalWorkerBase();
  if (!base) {
    res.status(503).json({
      error:
        "External sync worker proxy is not configured (SYNC_WORKER_INTERNAL_URL).",
    });
    return;
  }

  const qs = req.url?.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  const target = `${base}/${pathSuffix.replace(/^\//, "")}${qs}`;

  const headers = new Headers();
  const auth = req.headers.authorization;
  if (typeof auth === "string") headers.set("Authorization", auth);
  const contentType = req.headers["content-type"];
  if (typeof contentType === "string") headers.set("Content-Type", contentType);
  const origin = req.headers.origin;
  if (typeof origin === "string") headers.set("Origin", origin);

  let body: string | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await readRawBody(req);
  }

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: body && body.length > 0 ? body : undefined,
    });
    const text = await upstream.text();
    const upstreamType = upstream.headers.get("content-type");
    if (upstreamType) res.setHeader("Content-Type", upstreamType);
    res.status(upstream.status).send(text);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    res.status(502).json({ error: message });
  }
}

export async function serveSyncWorkerRoute(
  req: VercelRequest,
  res: VercelResponse,
  logicalPath: string,
  pathSuffixForProxy: string,
): Promise<void> {
  const useExternalProxy = process.env.SYNC_WORKER_USE_EXTERNAL_PROXY === "1";
  if (useExternalProxy && internalWorkerBase()) {
    await proxyToExternalWorker(req, res, pathSuffixForProxy);
    return;
  }

  const body =
    req.method !== "GET" && req.method !== "HEAD"
      ? await readRawBody(req)
      : "";

  const result = await handleBundledSyncWorkerRequest({
    path: logicalPath.startsWith("/") ? logicalPath : `/${logicalPath}`,
    method: req.method ?? "GET",
    authorization:
      typeof req.headers.authorization === "string"
        ? req.headers.authorization
        : undefined,
    body,
    origin: typeof req.headers.origin === "string" ? req.headers.origin : undefined,
  });

  for (const [key, value] of Object.entries(result.headers)) {
    res.setHeader(key, value);
  }
  res.status(result.status).send(result.body);
}

export function createSyncWorkerRoute(
  logicalPath: string,
  pathSuffixForProxy: string,
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    await serveSyncWorkerRoute(req, res, logicalPath, pathSuffixForProxy);
  };
}
