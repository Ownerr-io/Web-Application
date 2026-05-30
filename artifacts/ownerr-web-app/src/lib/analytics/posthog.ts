import posthog from "posthog-js";

let initialized = false;

export function isPostHogConfigured(): boolean {
  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  return Boolean(key?.trim());
}

export function initPostHog(): void {
  if (initialized || typeof window === "undefined") return;

  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  if (!key?.trim()) return;

  const host =
    (import.meta.env.VITE_POSTHOG_HOST as string | undefined)?.trim() ||
    "https://us.i.posthog.com";

  posthog.init(key, {
    api_host: host,
    person_profiles: "identified_only",
    capture_pageview: false,
    capture_pageleave: true,
  });

  initialized = true;
}

export function identifyPostHogUser(
  userId: string,
  traits?: Record<string, unknown>,
): void {
  if (!initialized) return;
  posthog.identify(userId, traits);
}

export function resetPostHogUser(): void {
  if (!initialized) return;
  posthog.reset();
}

export function capturePostHogEvent(
  event: string,
  properties?: Record<string, unknown>,
): void {
  if (!initialized) {
    if (import.meta.env.DEV) {
      console.debug("[PostHog]", event, properties);
    }
    return;
  }
  posthog.capture(event, properties);
}
