import { capturePostHogEvent } from "@/lib/analytics/posthog";

export type AdminAppSlug = "ownerr_network" | "marketplace" | "ownerr_os";

export type AdminCrudAction = "create" | "read" | "update" | "delete";

export function trackAdminPageView(
  app: AdminAppSlug,
  page: string,
  extra?: Record<string, unknown>,
): void {
  capturePostHogEvent("admin_page_view", { app, page, ...extra });
}

export function trackAdminCrud(
  app: AdminAppSlug,
  action: AdminCrudAction,
  resource: string,
  extra?: Record<string, unknown>,
): void {
  capturePostHogEvent("admin_crud", { app, action, resource, ...extra });
}

export function trackAdminAction(
  app: AdminAppSlug,
  action: string,
  extra?: Record<string, unknown>,
): void {
  capturePostHogEvent("admin_action", { app, action, ...extra });
}
