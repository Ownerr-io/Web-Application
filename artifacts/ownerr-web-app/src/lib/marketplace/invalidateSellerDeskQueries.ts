import type { QueryClient } from "@tanstack/react-query";

/** Invalidate seller desk + marketplace listing caches after listing or verification changes. */
export function invalidateSellerDeskQueries(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: ["seller-companies"] });
  void qc.invalidateQueries({ queryKey: ["seller-listings-page"] });
  void qc.invalidateQueries({ queryKey: ["seller-profile-listings"] });
  void qc.invalidateQueries({ queryKey: ["seller-overview-listings"] });
  void qc.invalidateQueries({ queryKey: ["seller-verification-page"] });
  void qc.invalidateQueries({ queryKey: ["listing-verification-snapshot"] });
  void qc.invalidateQueries({ queryKey: ["marketplace-listings"] });
  void qc.invalidateQueries({ queryKey: ["startup-verification-summary"] });
  void qc.invalidateQueries({ queryKey: ["startup-trust"] });
  void qc.invalidateQueries({ queryKey: ["startup-id"] });
  void qc.invalidateQueries({ queryKey: ["seller-trust"] });
}
