import { useSyncExternalStore } from "react";

/** Dark-only app: always return dark (no persisted light theme). */
export function getInitialTheme(): "dark" {
  return "dark";
}

/** Forces the document into dark mode (light theme is disabled). */
export function applyTheme(_theme?: "dark" | "light") {
  if (typeof document === "undefined") return;
  document.documentElement.classList.add("dark");
}

function getDocumentIsDark(): boolean {
  if (typeof document === "undefined") return true;
  return document.documentElement.classList.contains("dark");
}

function subscribeToHtmlClass(next: () => void) {
  if (typeof document === "undefined") return () => {};
  const el = document.documentElement;
  const obs = new MutationObserver(next);
  obs.observe(el, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}

/** Subscribes to `document.documentElement` `dark` class (used for charts, etc.). */
export function useIsDark() {
  return useSyncExternalStore(
    subscribeToHtmlClass,
    getDocumentIsDark,
    () => true,
  );
}
