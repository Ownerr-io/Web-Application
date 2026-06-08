import http from "node:http";
import { supabase, workerId, runIntegrationSyncBatch } from "./client.js";
import { handleVerificationHttp } from "./verificationHttp.js";
import { verificationWorkerLog } from "@workspace/integrations-sync";
import { syncStripeIdentitySessionsForStartup } from "@workspace/verification-automation";

const port = Number(process.env.SYNC_WORKER_HTTP_PORT ?? 8787);
const cronSecret = process.env.SYNC_WORKER_CRON_SECRET?.trim();

async function readBody(req: http.IncomingMessage): Promise<string> {
  let body = "";
  for await (const chunk of req) body += chunk;
  return body;
}

function corsHeaders(req: http.IncomingMessage): Record<string, string> {
  const origin = req.headers.origin ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    Vary: "Origin",
  };
}

async function authorizeProcessJobs(
  req: http.IncomingMessage,
  cronSecret: string | undefined,
  bodyJson: { startup_id?: string },
): Promise<boolean> {
  const auth = req.headers.authorization ?? "";
  if (cronSecret && auth === `Bearer ${cronSecret}`) {
    return true;
  }
  const startupId = bodyJson.startup_id;
  const launchToken = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!launchToken || !startupId) {
    return false;
  }
  const { data, error } = await supabase.rpc(
    "consume_sync_worker_launch_token",
    {
      p_token: launchToken,
      p_startup_id: startupId,
    },
  );
  return !error && data === true;
}

export function startHttpServer() {
  const server = http.createServer(async (req, res) => {
    const url = req.url?.split("?")[0] ?? "";

    if (url === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, workerId }));
      return;
    }

    const handled = await handleVerificationHttp(req, res, {
      url,
      method: req.method,
      cronSecret,
      supabase,
      readBody: () => readBody(req),
    });
    if (handled) return;

    if (url === "/v1/process-jobs") {
      if (req.method === "OPTIONS") {
        res.writeHead(204, corsHeaders(req));
        res.end();
        return;
      }

      if (req.method === "POST") {
        let body = "";
        body = await readBody(req);
        let maxJobs = 10;
        let bodyJson: { max_jobs?: number; startup_id?: string } = {};
        try {
          if (body) {
            bodyJson = JSON.parse(body) as {
              max_jobs?: number;
              startup_id?: string;
            };
            if (
              typeof bodyJson.max_jobs === "number" &&
              bodyJson.max_jobs > 0
            ) {
              maxJobs = Math.min(50, bodyJson.max_jobs);
            }
          }
        } catch {
          /* default maxJobs */
        }

        const authorized = await authorizeProcessJobs(
          req,
          cronSecret,
          bodyJson,
        );
        if (!authorized) {
          verificationWorkerLog("http", "process-jobs unauthorized", {
            has_startup_id: !!bodyJson.startup_id,
            has_cron_secret: !!cronSecret,
          });
          res.writeHead(401, {
            ...corsHeaders(req),
            "Content-Type": "application/json",
          });
          res.end(
            JSON.stringify({
              error: cronSecret
                ? "unauthorized"
                : "unauthorized — set SYNC_WORKER_CRON_SECRET or use a valid launch token with startup_id",
            }),
          );
          return;
        }

        verificationWorkerLog("http", "process-jobs authorized", {
          max_jobs: maxJobs,
          startup_id: bodyJson.startup_id,
        });

        try {
          const result = await runIntegrationSyncBatch(supabase, {
            workerId,
            maxJobs,
          });
          let identityPollUpdated = 0;
          if (bodyJson.startup_id) {
            identityPollUpdated = await syncStripeIdentitySessionsForStartup(
              supabase,
              bodyJson.startup_id,
            );
            if (identityPollUpdated > 0) {
              await supabase.rpc("refresh_listing_gates_from_evidence", {
                p_startup_id: bodyJson.startup_id,
              });
            }
            verificationWorkerLog("http", "identity poll", {
              startup_id: bodyJson.startup_id,
              updated: identityPollUpdated,
            });
          }
          verificationWorkerLog("http", "process-jobs complete", result);
          res.writeHead(200, {
            ...corsHeaders(req),
            "Content-Type": "application/json",
          });
          res.end(
            JSON.stringify({
              ok: true,
              ...result,
              identity_poll_updated: identityPollUpdated,
            }),
          );
        } catch (e) {
          res.writeHead(500, {
            ...corsHeaders(req),
            "Content-Type": "application/json",
          });
          res.end(
            JSON.stringify({
              error: e instanceof Error ? e.message : String(e),
            }),
          );
        }
        return;
      }
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(port, () => {
    console.info(
      `Sync worker HTTP listening on :${port} (POST /v1/process-jobs, POST /api/webhooks/stripe/identity)`,
    );
  });
  return server;
}

if (process.env.SYNC_WORKER_HTTP === "1") {
  startHttpServer();
}
