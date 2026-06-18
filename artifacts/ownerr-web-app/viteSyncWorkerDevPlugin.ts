import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadEnv, type Plugin } from "vite";
import type { IncomingMessage } from "node:http";

const bundleFile = path.resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "api/_lib/syncWorkerHandlers.bundle.mjs",
);

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

type HandlerModule = {
  handleSyncWorkerHttpRequest: (input: {
    path: string;
    method: string;
    authorization?: string;
    body: string;
    origin?: string;
    clientIp?: string;
    requestHeaders?: Record<string, string | string[] | undefined>;
  }) => Promise<{
    status: number;
    headers: Record<string, string>;
    body: string;
  }>;
};

let handlerModule: HandlerModule | undefined;

async function loadHandlers(): Promise<HandlerModule> {
  if (handlerModule) return handlerModule;
  try {
    handlerModule = (await import(
      pathToFileURL(bundleFile).href
    )) as HandlerModule;
    return handlerModule;
  } catch (e) {
    const hint =
      "Run: npm run bundle:api --workspace=@workspace/ownerr-web-app (or npm run dev from ownerr-web-app which bundles first)";
    throw new Error(`${hint}. ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Dev-only: serve /api/sync-worker/* using the same esbuild bundle as Vercel.
 */
export function viteSyncWorkerDevPlugin(): Plugin {
  return {
    name: "ownerr-inline-sync-worker",
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.envDir, "");
      for (const [k, v] of Object.entries(env)) {
        if (process.env[k] === undefined) process.env[k] = v;
      }
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith("/api/sync-worker")) {
          next();
          return;
        }

        const pathPart =
          url.replace(/^\/api\/sync-worker/, "").split("?")[0] || "/";
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
            requestHeaders: req.headers as Record<
              string,
              string | string[] | undefined
            >,
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
