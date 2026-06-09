/**
 * Bundle API handlers for Vercel + local dev (monorepo lib/* is not resolved at serverless runtime).
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const esbuild = require("esbuild");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const libDir = path.join(appRoot, "api", "_lib");

const shared = {
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  packages: "bundle",
  external: ["@supabase/supabase-js"],
  logLevel: "info",
};

await esbuild.build({
  ...shared,
  entryPoints: [path.join(libDir, "syncWorkerHandlers.ts")],
  outfile: path.join(libDir, "syncWorkerHandlers.bundle.mjs"),
});

await esbuild.build({
  ...shared,
  entryPoints: [
    path.join(
      appRoot,
      "..",
      "..",
      "lib",
      "verification-automation",
      "src",
      "stripeIdentityWebhookHttp.ts",
    ),
  ],
  outfile: path.join(libDir, "stripeIdentityWebhookHttp.bundle.mjs"),
});

console.log("API bundles: api/_lib/*.bundle.mjs");
