import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const map = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../../scripts/schema-v2/table-renames.json"),
    "utf8",
  ),
);

/** @type {Record<string, string>} legacy -> physical */
export const legacyToPhysicalTable = Object.fromEntries(
  map.renames.map(([physical, legacy]) => [legacy, physical]),
);

export const T = {
  companies: legacyToPhysicalTable.startups,
  accounts: legacyToPhysicalTable.marketplace_profiles,
  offers: legacyToPhysicalTable.bids,
  conversations: legacyToPhysicalTable.conversations,
  messages: legacyToPhysicalTable.messages,
  integrations: legacyToPhysicalTable.integration_connections,
  providers: legacyToPhysicalTable.verification_providers,
  listingGates: legacyToPhysicalTable.listing_verification_gates,
  interests: legacyToPhysicalTable.startup_interests,
  offers: legacyToPhysicalTable.bids,
  sellerListings: legacyToPhysicalTable.seller_listings,
  listings: legacyToPhysicalTable.listings,
  founderSubmissions: legacyToPhysicalTable.founder_submissions,
  syncRuns: legacyToPhysicalTable.integration_syncs,
  auditLogs: legacyToPhysicalTable.audit_logs,
};
