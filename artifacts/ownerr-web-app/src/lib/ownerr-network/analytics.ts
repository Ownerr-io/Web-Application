import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  ensureNetworkTablesDetected,
  networkTables,
  isUsersTableActive,
} from "@/lib/ownerr-network/dbTables";

const SESSION_KEY = "ownerr_network_analytics_session";

function sessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

export type OwnerrNetworkEventType =
  | "page_view"
  | "cta_click"
  | "signup"
  | "login"
  | "survey_complete"
  | "share_intent"
  | "referral_conversion";

export async function trackOwnerrNetworkEvent(
  eventType: OwnerrNetworkEventType,
  payload?: Record<string, unknown>,
  userId?: string | null,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = getSupabase();
    await ensureNetworkTablesDetected(supabase);
    const isNewSchema = isUsersTableActive();
    console.log(
      `[Analytics] Tracking event: ${eventType} (isNewSchema: ${isNewSchema})`,
    );
    if (isNewSchema) {
      await supabase.from("user_events").insert({
        product_slug: "ownerr_network",
        event_type: eventType,
        metadata: {
          ...(payload ?? {}),
          session_id: sessionId(),
        },
        user_id: userId ?? null,
      });
    } else {
      await supabase.from(networkTables().analyticsEvents).insert({
        event_type: eventType,
        payload: payload ?? {},
        session_id: sessionId(),
        user_id: userId ?? null,
      });
    }
  } catch {
    /* non-blocking */
  }
}

export function collectDeviceInfo(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screen: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}
