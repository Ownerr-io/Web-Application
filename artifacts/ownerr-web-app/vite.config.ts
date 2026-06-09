import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { viteSyncWorkerDevPlugin } from "./viteSyncWorkerDevPlugin";
// import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const portFromEnv = process.env.PORT;
const rawPort = portFromEnv ?? "5173";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";
const strictPort = portFromEnv !== undefined;
const repoRoot = path.resolve(import.meta.dirname, "..", "..");
/** Default on: /api/sync-worker runs in Vite (no separate sync-worker process). Set SYNC_WORKER_INLINE=0 to use proxy. */
const inlineSyncWorker = process.env.SYNC_WORKER_INLINE !== "0";

export default defineConfig({
  envDir: repoRoot,
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    // runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
    ...(inlineSyncWorker ? [viteSyncWorkerDevPlugin()] : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "attached_assets",
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  ssr: {
    noExternal: [
      "@workspace/integrations-sync",
      "@workspace/integrations-core",
      "@workspace/verification-automation",
      "@workspace/db-schema",
    ],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: inlineSyncWorker
      ? undefined
      : {
          "/api/sync-worker": {
            target:
              process.env.VITE_SYNC_WORKER_PROXY_TARGET ??
              "http://127.0.0.1:8787",
            changeOrigin: true,
            rewrite: (p) => p.replace(/^\/api\/sync-worker/, ""),
          },
          "/api/webhooks": {
            target:
              process.env.VITE_SYNC_WORKER_PROXY_TARGET ??
              "http://127.0.0.1:8787",
            changeOrigin: true,
          },
        },
  },
  preview: {
    port,
    strictPort,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
