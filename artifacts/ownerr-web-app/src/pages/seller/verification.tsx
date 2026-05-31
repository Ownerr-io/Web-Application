import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getUserListings } from "@/lib/marketplace/service";
import {
  MarketplaceDeskListItem,
  MarketplaceDeskPanel,
  MarketplaceDeskStat,
  MarketplaceDeskStatGrid,
  marketplaceDeskKpiValueClass,
} from "@/components/marketplace/MarketplaceDeskUi";

export default function SellerVerificationPage() {
  const { currentUser } = useAuth();
  const ownerId = currentUser?.id;
  const { data: listings = [] } = useQuery({
    queryKey: ["seller-verification-page", ownerId],
    queryFn: () => getUserListings(ownerId!),
    enabled: !!ownerId,
  });
  const safeListings =
    listings.length > 0
      ? listings
      : [
          {
            slug: "sorio-ai",
            name: "Sorio AI",
            revenueVerified: true,
            domainVerified: true,
            trafficVerified: true,
          },
          {
            slug: "oli-ai",
            name: "Oli Ai",
            revenueVerified: true,
            domainVerified: false,
            trafficVerified: false,
          },
        ];

  return (
    <MarketplaceDeskPanel title="Verification center">
      <MarketplaceDeskStatGrid>
        <MarketplaceDeskStat
          label="Fully verified"
          value={
            safeListings.filter(
              (x) => x.revenueVerified && x.domainVerified && x.trafficVerified,
            ).length
          }
          valueClassName={marketplaceDeskKpiValueClass(0)}
        />
        <MarketplaceDeskStat
          label="Revenue verified"
          value={safeListings.filter((x) => x.revenueVerified).length}
          valueClassName={marketplaceDeskKpiValueClass(1)}
        />
        <MarketplaceDeskStat
          label="Domain verified"
          value={safeListings.filter((x) => x.domainVerified).length}
          valueClassName={marketplaceDeskKpiValueClass(2)}
        />
      </MarketplaceDeskStatGrid>
      <div className="space-y-3">
        {safeListings.map((listing) => (
          <MarketplaceDeskListItem key={listing.slug}>
            <p className="font-semibold">{listing.name}</p>
            <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-3">
              <span>
                Revenue:{" "}
                <span
                  className={
                    listing.revenueVerified
                      ? "text-brand-lime"
                      : "text-brand-orange"
                  }
                >
                  {listing.revenueVerified ? "Verified" : "Pending"}
                </span>
              </span>
              <span>
                Domain:{" "}
                <span
                  className={
                    listing.domainVerified
                      ? "text-brand-lime"
                      : "text-brand-orange"
                  }
                >
                  {listing.domainVerified ? "Verified" : "Pending"}
                </span>
              </span>
              <span>
                Traffic:{" "}
                <span
                  className={
                    listing.trafficVerified
                      ? "text-brand-lime"
                      : "text-brand-orange"
                  }
                >
                  {listing.trafficVerified ? "Verified" : "Pending"}
                </span>
              </span>
            </div>
          </MarketplaceDeskListItem>
        ))}
      </div>
    </MarketplaceDeskPanel>
  );
}
