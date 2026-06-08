import {
  buildMarketplaceListingFromStartup,
  buildVerificationFromServer,
  trustLabelFromScore,
} from "@/lib/marketplace/listingModel";
import type { MarketplaceListing, Startup } from "@/lib/marketplace/types";
import { fetchStartupVerificationSummary } from "@/lib/intelligence/integrationApi";
import {
  fetchStartupTrustPublic,
  trustLabelFromLevel,
} from "@/lib/intelligence/trustApi";

export async function enrichListingWithIntelligence(
  startup: Startup,
  overrides?: Partial<MarketplaceListing>,
): Promise<MarketplaceListing> {
  const [trust, summary] = await Promise.all([
    fetchStartupTrustPublic(startup.slug).catch(() => null),
    fetchStartupVerificationSummary(startup.slug).catch(() => ({
      dimensions: [],
      connections: [],
    })),
  ]);

  const verification = buildVerificationFromServer({
    slug: startup.slug,
    dimensions: summary.dimensions,
    connections: summary.connections,
  });

  const trustScore = trust?.score ?? 0;
  const trustLabel = trust
    ? (trustLabelFromLevel(trust.level) as MarketplaceListing["trustLabel"])
    : trustLabelFromScore(trustScore);

  return buildMarketplaceListingFromStartup(startup, {
    ...overrides,
    verification,
    trustScore,
    trustLabel,
  });
}
