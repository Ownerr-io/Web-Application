/** Development-only logging — no-op in production builds. */
export function devLog(...args: unknown[]): void {
  if (import.meta.env.DEV) console.log(...args);
}

export function devWarn(...args: unknown[]): void {
  if (import.meta.env.DEV) console.warn(...args);
}

let productionConsoleInitialized = false;

/** Single friendly console line in production; all other app logs should use devLog/devWarn. */
export function initProductionConsole(): void {
  if (import.meta.env.DEV || productionConsoleInitialized) return;
  if (typeof console === "undefined") return;
  productionConsoleInitialized = true;
  console.log("Lots of love from Ownerr");
}
