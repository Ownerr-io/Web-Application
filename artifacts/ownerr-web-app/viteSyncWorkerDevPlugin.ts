import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin, ViteDevServer } from "vite";
import type { IncomingMessage } from "node:http";

const syncHandlersId = path.resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "api/_lib/syncWorkerHandlers.ts",
);

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

type SyncHandlerModule = typeof import("./api/_lib/syncWorkerHandlers");

/**
 * Dev-only: serve /api/sync-worker/* without a separate sync-worker process.
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local (loaded by Vite).
 */
export function viteSyncWorkerDevPlugin(): Plugin {
  let serverRef: ViteDevServer | undefined;
  let handlerModule: SyncHandlerModule | undefined;

  async function loadHandlers(): Promise<SyncHandlerModule> {
    if (handlerModule) return handlerModule;
    if (!serverRef) {
      throw new Error("Vite dev server not ready for sync worker");
    }
    handlerModule = (await serverRef.ssrLoadModule(
      syncHandlersId,
    )) as SyncHandlerModule;
    return handlerModule;
  }

  return {
    name: "ownerr-inline-sync-worker",
    configureServer(server) {
      serverRef = server;
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith("/api/sync-worker")) {
          next();
          return;
        }

        const pathPart = url.replace(/^\/api\/sync-worker/, "").split("?")[0] || "/";
        const body =
          req.method !== "GET" && req.method !== "HEAD"
            ? await readBody(req)
            : "";

        try {
          const { handleSyncWorkerHttpRequest } = await loadHandlers();
          const result = await handleSyncWorkerHttpRequest({
            path: pathPart.startsWith("/") ? pathPart : `/${pathPart}`,
            method: req.method ?? "GET",
            authorization:
              typeof req.headers.authorization === "string"
                ? req.headers.authorization
                : undefined,
            body,
            origin:
              typeof req.headers.origin === "string"
                ? req.headers.origin
                : undefined,
          });

          for (const [key, value] of Object.entries(result.headers)) {
            res.setHeader(key, value);
          }
          res.statusCode = result.status;
          res.end(result.body);
        } catch (e) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: e instanceof Error ? e.message : String(e),
            }),
          );
        }
      });
    },
  };
}
