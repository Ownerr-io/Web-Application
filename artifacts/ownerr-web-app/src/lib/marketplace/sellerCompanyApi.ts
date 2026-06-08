import {
  fetchListingVerificationSnapshotBySlug,
  type ListingLifecycle,
  type ListingVerificationSnapshot,
} from "@/lib/intelligence/listingVerificationApi";
import { getUserListings } from "@/lib/marketplace/service";
import type { MarketplaceListing } from "@/lib/marketplace/types";
import {
  countVerifiedGates,
  gatesTotal,
  verifiedRevenueAmountFromGates,
} from "@/lib/marketplace/verificationDesk";

export type SellerCompanyRow = {
  listing: MarketplaceListing;
  snapshot: ListingVerificationSnapshot | null;
};

export async function fetchSellerCompanies(
  authUserId: string,
): Promise<SellerCompanyRow[]> {
  const listings = await getUserListings(authUserId);
  const snapshots = await Promise.all(
    listings.map((l) =>
      fetchListingVerificationSnapshotBySlug(l.slug).catch(() => null),
    ),
  );
  return listings.map((listing, i) => ({
    listing,
    snapshot: snapshots[i],
  }));
}

export function verifiedGateCount(row: SellerCompanyRow): number {
  if (!row.snapshot?.gates) return 0;
  return countVerifiedGates(row.snapshot.gates);
}

export function gatesComplete(row: SellerCompanyRow): boolean {
  return verifiedGateCount(row) >= gatesTotal();
}

export function isCompanyPublished(row: SellerCompanyRow): boolean {
  return row.snapshot?.listing_lifecycle === "published";
}

export function displayVerifiedMrr(row: SellerCompanyRow): number | null {
  const gates = row.snapshot?.gates;
  if (!gates) return null;
  return verifiedRevenueAmountFromGates(gates);
}

export function lifecycleLabel(row: SellerCompanyRow): ListingLifecycle {
  return row.snapshot?.listing_lifecycle ?? "draft";
}

export function countCompaniesReadyToPublish(rows: SellerCompanyRow[]): number {
  return rows.filter((r) => gatesComplete(r)).length;
}

export function countPublishedCompanies(rows: SellerCompanyRow[]): number {
  return rows.filter((r) => isCompanyPublished(r)).length;
}
