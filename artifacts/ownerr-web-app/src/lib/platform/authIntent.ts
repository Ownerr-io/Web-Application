import type { AuthActionIntent, StoredAuthIntent } from "@/lib/platform/types";

const STORAGE_KEY = "ownerr.auth.intent";
const MAX_AGE_MS = 30 * 60 * 1000;

const ACTION_REQUIRES_DESK = new Set<AuthActionIntent>([
  "bid",
  "contact_founder",
  "create_listing",
  "save_startup",
  "add_startup",
  "open_desk",
]);

export function actionRequiresDesk(action: AuthActionIntent): boolean {
  return ACTION_REQUIRES_DESK.has(action);
}

export function persistAuthIntent(
  intent: Omit<StoredAuthIntent, "createdAt">,
): void {
  if (typeof window === "undefined") return;
  const payload: StoredAuthIntent = { ...intent, createdAt: Date.now() };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}

export function peekAuthIntent(): StoredAuthIntent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuthIntent;
    if (!parsed?.action || !parsed.returnPath) return null;
    if (Date.now() - parsed.createdAt > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function consumeAuthIntent(): StoredAuthIntent | null {
  const intent = peekAuthIntent();
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  return intent;
}
