import { capturePostHogEvent } from "@/lib/analytics/posthog";

export function trackOfferEvent(
  event:
    | "offer_submitted"
    | "offer_countered"
    | "offer_accepted"
    | "offer_declined"
    | "due_diligence_started"
    | "deal_closed",
  properties?: Record<string, unknown>,
): void {
  capturePostHogEvent(event, properties);
}
