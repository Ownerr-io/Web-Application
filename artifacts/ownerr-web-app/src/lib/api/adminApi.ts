import { instrumentedRpc } from "@/lib/api/rpcTelemetry";

export async function adminApiObservabilitySummary() {
  return instrumentedRpc<Record<string, unknown>>(
    "admin_api_observability_summary",
    {},
  );
}

export async function adminPlatformHealth() {
  return instrumentedRpc<Record<string, unknown>>("admin_platform_health", {});
}

export async function adminSlowQuerySummary(days = 7) {
  return instrumentedRpc<unknown>("admin_slow_query_summary", { p_days: days });
}

export async function adminOfferMetrics(days = 30) {
  return instrumentedRpc<Record<string, unknown>>("admin_offer_metrics", {
    p_days: days,
  });
}

export {
  fetchAdminPlatformSummary,
  fetchAdminMarketplaceSummary,
  fetchAdminNetworkSummary,
  fetchAdminOsSummary,
  fetchAdminOperationsSummary,
  fetchAdminSystemHealth,
} from "@/lib/admin/summaryApi";

export {
  fetchAllMarketplaceListings,
  updateMarketplaceListing,
} from "@/lib/marketplace/adminApi";

export { fetchAllOsListings, updateOsListing } from "@/lib/ownerr-os/adminApi";

export { fetchAdminOffersDashboard } from "@/lib/marketplace/offerService";
