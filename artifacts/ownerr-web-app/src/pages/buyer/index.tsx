import { useMemo } from "react";
import { Link } from "wouter";
import type { DealRelationshipStage } from "@/lib/marketplace/types";
import { useBuyerOffers } from "@/hooks/marketplace/useOffers";
import { useMyInterests } from "@/hooks/marketplace/useInterests";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { offerStatusLabel } from "@/lib/marketplace/offerStatusUi";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";
import { BuyerOfferActivityFeed } from "@/components/marketplace/BuyerOfferActivityFeed";
import {
  MarketplaceDeskKpiCard,
  MarketplaceDeskListItem,
  MarketplaceDeskPanel,
  MarketplaceDeskStat,
  MarketplaceDeskStatGrid,
  marketplaceDeskKpiValueClass,
} from "@/components/marketplace/MarketplaceDeskUi";

export default function BuyerDashboard() {
  const { data: interests, isLoading: isLoadingInterests } = useMyInterests();
  const { data: offers = [], isLoading: isLoadingOffers } = useBuyerOffers();

  const safeInterests = useMemo(() => interests ?? [], [interests]);
  const recentOffers = useMemo(
    () =>
      [...offers]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 4),
    [offers],
  );
  const stageCounts: Record<DealRelationshipStage, number> = {
    interested: 0,
    contacted: 0,
    negotiating: 0,
    closed: 0,
    withdrawn: 0,
  };
  for (const item of safeInterests) stageCounts[item.stage]++;

  const listingsTracked = useMemo(
    () => new Set(safeInterests.map((i) => i.listingId)).size,
    [safeInterests],
  );
  const totalOfferValue = offers.reduce((sum, row) => sum + row.amount, 0);
  const activeBidCount = offers.filter(
    (b) =>
      b.status !== "withdrawn" &&
      b.status !== "declined" &&
      b.status !== "rejected" &&
      b.status !== "accepted" &&
      b.status !== "closed",
  ).length;
  const needsActionCount = offers.filter(
    (b) => b.status === "countered" && b.lastActorRole === "seller",
  ).length;

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <MarketplaceDeskKpiCard title="Total interests">
          {isLoadingInterests ? (
            <Skeleton className="h-8 w-1/2" />
          ) : (
            <>
              <div
                className={`text-2xl font-bold tabular-nums ${marketplaceDeskKpiValueClass(0)}`}
              >
                {safeInterests.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all listings
              </p>
            </>
          )}
        </MarketplaceDeskKpiCard>
        <MarketplaceDeskKpiCard title="Active offers">
          {isLoadingOffers ? (
            <Skeleton className="h-8 w-1/2" />
          ) : (
            <>
              <div
                className={`text-2xl font-bold tabular-nums ${marketplaceDeskKpiValueClass(1)}`}
              >
                {activeBidCount}
              </div>
              <p className="text-xs text-muted-foreground">
                {offers.length} total · {formatCurrency(totalOfferValue)}{" "}
                offered
                {needsActionCount > 0 ? (
                  <>
                    {" "}
                    ·{" "}
                    <Link
                      href={MARKETPLACE_ROUTES.buyerOffers}
                      className="text-brand-orange"
                    >
                      {needsActionCount} need{needsActionCount === 1 ? "s" : ""}{" "}
                      action
                    </Link>
                  </>
                ) : null}
              </p>
            </>
          )}
        </MarketplaceDeskKpiCard>
        <MarketplaceDeskKpiCard title="Listings tracked">
          {isLoadingInterests ? (
            <Skeleton className="h-8 w-1/2" />
          ) : (
            <>
              <div
                className={`text-2xl font-bold tabular-nums ${marketplaceDeskKpiValueClass(2)}`}
              >
                {listingsTracked}
              </div>
              <p className="text-xs text-muted-foreground">
                Unique startups in your pipeline
              </p>
            </>
          )}
        </MarketplaceDeskKpiCard>
      </div>
      <MarketplaceDeskPanel title="Offer status (seller responses)">
        {isLoadingOffers ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : recentOffers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No offers yet.{" "}
            <Link
              href={MARKETPLACE_ROUTES.buyerOffers}
              className="text-brand-lime hover:underline"
            >
              My offers
            </Link>
          </p>
        ) : (
          <div className="space-y-2">
            {recentOffers.map((offer) => (
              <MarketplaceDeskListItem key={offer.id}>
                <Link href={MARKETPLACE_ROUTES.buyerOffers}>
                  <p className="font-medium hover:underline">
                    {offer.startupTitle}
                  </p>
                </Link>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(offer.amount)} ·{" "}
                  {offerStatusLabel(offer.status)} ·{" "}
                  {new Date(offer.updatedAt).toLocaleDateString()}
                </p>
              </MarketplaceDeskListItem>
            ))}
          </div>
        )}
      </MarketplaceDeskPanel>
      <MarketplaceDeskPanel title="Recent seller activity">
        <BuyerOfferActivityFeed />
      </MarketplaceDeskPanel>
      <MarketplaceDeskPanel title="Pipeline snapshot">
        <MarketplaceDeskStatGrid>
          <MarketplaceDeskStat
            label="Interested"
            value={stageCounts.interested}
            valueClassName={marketplaceDeskKpiValueClass(0)}
          />
          <MarketplaceDeskStat
            label="Negotiating"
            value={stageCounts.negotiating}
            valueClassName={marketplaceDeskKpiValueClass(1)}
          />
          <MarketplaceDeskStat
            label="Contacted"
            value={stageCounts.contacted}
            valueClassName={marketplaceDeskKpiValueClass(2)}
          />
        </MarketplaceDeskStatGrid>
      </MarketplaceDeskPanel>
    </div>
  );
}
