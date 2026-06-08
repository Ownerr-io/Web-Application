import { useSellerOfferGroups } from "@/hooks/marketplace/useOffers";
import { formatCurrency } from "@/lib/utils";
import {
  MarketplaceDeskListItem,
  MarketplaceDeskPanel,
  MarketplaceDeskStat,
  MarketplaceDeskStatGrid,
  marketplaceDeskKpiValueClass,
} from "@/components/marketplace/MarketplaceDeskUi";
import { OfferCard } from "@/components/marketplace/OfferCard";
import { LISTING_LIFECYCLE_LABEL } from "@/lib/marketplace/verificationDesk";
import type { ListingLifecycle } from "@/lib/intelligence/listingVerificationApi";

export default function SellerOffersPage() {
  const { data: groups = [], isLoading } = useSellerOfferGroups();
  const totalOffers = groups.reduce((n, g) => n + g.offerCount, 0);
  const accepted = groups
    .flatMap((g) => g.offers)
    .filter((o) => o.status === "accepted").length;

  return (
    <MarketplaceDeskPanel title="Offers & bids">
      <MarketplaceDeskStatGrid>
        <MarketplaceDeskStat
          label="Listings with offers"
          value={groups.length}
          valueClassName={marketplaceDeskKpiValueClass(0)}
        />
        <MarketplaceDeskStat
          label="Total offers"
          value={totalOffers}
          valueClassName={marketplaceDeskKpiValueClass(1)}
        />
        <MarketplaceDeskStat
          label="Accepted"
          value={accepted}
          valueClassName={marketplaceDeskKpiValueClass(2)}
        />
      </MarketplaceDeskStatGrid>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No offers yet. When buyers submit structured offers on your listings,
          they appear here.
        </p>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.startupId} className="space-y-3">
              <MarketplaceDeskListItem>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{group.startupTitle}</p>
                  <span className="text-xs text-muted-foreground">
                    {LISTING_LIFECYCLE_LABEL[
                      group.listingLifecycle as ListingLifecycle
                    ] ?? group.listingLifecycle}
                    {!group.offersOpen ? " · Not accepting new offers" : ""}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {group.offerCount} offer{group.offerCount === 1 ? "" : "s"}
                  {group.highestOffer != null
                    ? ` · High ${formatCurrency(group.highestOffer)}`
                    : ""}
                  {" · "}
                  Updated {new Date(group.latestActivity).toLocaleString()}
                </p>
              </MarketplaceDeskListItem>
              <div className="space-y-3 pl-0 sm:pl-2">
                {group.offers.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    startupSlug={group.startupSlug}
                    mode="seller"
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </MarketplaceDeskPanel>
  );
}
