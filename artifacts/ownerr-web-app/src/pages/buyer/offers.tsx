import { useMemo } from "react";
import { useBuyerOffers } from "@/hooks/marketplace/useOffers";
import { formatCurrency } from "@/lib/utils";
import {
  MarketplaceDeskPanel,
  MarketplaceDeskStat,
  MarketplaceDeskStatGrid,
  marketplaceDeskKpiValueClass,
} from "@/components/marketplace/MarketplaceDeskUi";
import { OfferCard } from "@/components/marketplace/OfferCard";
import { BuyerOfferActivityFeed } from "@/components/marketplace/BuyerOfferActivityFeed";
import {
  buyerNeedsAction,
  isWaitingOnSeller,
} from "@/lib/marketplace/offerStatusUi";
import type { BuyerOfferRow } from "@/lib/marketplace/types";

function OfferSection({
  title,
  description,
  offers,
}: {
  title: string;
  description?: string;
  offers: BuyerOfferRow[];
}) {
  if (!offers.length) return null;
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description ? (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        ) : null}
      </div>
      <div className="space-y-4">
        {offers.map((offer) => (
          <div key={offer.id} className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {offer.startupTitle}
            </p>
            <OfferCard
              offer={{
                id: offer.id,
                buyerName: "You",
                buyerAuthUserId: "",
                amount: offer.amount,
                currency: offer.currency,
                status: offer.status,
                message: offer.message,
                proofOfFunds: offer.proofOfFunds ?? null,
                expiresAt: offer.expiresAt ?? null,
                conversationId: offer.conversationId ?? null,
                acquisitionStage: offer.acquisitionStage ?? null,
                lastActorRole: offer.lastActorRole ?? null,
                createdAt: offer.createdAt,
                updatedAt: offer.updatedAt,
                acceptedAt: offer.acceptedAt ?? null,
              }}
              startupSlug={offer.startupSlug}
              mode="buyer"
              trustScore={offer.trustScore}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BuyerOffersPage() {
  const { data: rows = [], isLoading } = useBuyerOffers();

  const grouped = useMemo(() => {
    const needsAction = rows.filter((r) =>
      buyerNeedsAction(r.status, r.lastActorRole),
    );
    const accepted = rows.filter((r) =>
      ["accepted", "due_diligence", "closed"].includes(r.status),
    );
    const declined = rows.filter((r) =>
      [
        "declined",
        "rejected",
        "withdrawn",
        "superseded",
        "closed_due_to_accepted_offer",
      ].includes(r.status),
    );
    const waiting = rows.filter((r) => isWaitingOnSeller(r.status));
    const other = rows.filter(
      (r) =>
        !needsAction.includes(r) &&
        !accepted.includes(r) &&
        !declined.includes(r) &&
        !waiting.includes(r),
    );
    return { needsAction, accepted, declined, waiting, other };
  }, [rows]);

  const active = rows.filter(
    (r) =>
      !["withdrawn", "declined", "rejected", "closed", "superseded"].includes(
        r.status,
      ),
  );
  const counteredBySeller = rows.filter(
    (r) => r.status === "countered" && r.lastActorRole === "seller",
  ).length;

  const sectionTotal =
    grouped.needsAction.length +
    grouped.accepted.length +
    grouped.declined.length +
    grouped.waiting.length +
    grouped.other.length;

  return (
    <div className="grid gap-4">
      <MarketplaceDeskPanel title="My offers">
        <p className="text-sm text-muted-foreground mb-4">
          When a founder accepts, counters, or declines, the status updates
          here. Check{" "}
          <span className="font-medium text-foreground">Action required</span>{" "}
          for counters waiting on you.
        </p>
        <MarketplaceDeskStatGrid>
          <MarketplaceDeskStat
            label="Needs your action"
            value={grouped.needsAction.length}
            valueClassName={marketplaceDeskKpiValueClass(0)}
          />
          <MarketplaceDeskStat
            label="Waiting on seller"
            value={grouped.waiting.length}
            valueClassName={marketplaceDeskKpiValueClass(1)}
          />
          <MarketplaceDeskStat
            label="Accepted"
            value={grouped.accepted.length}
            valueClassName={marketplaceDeskKpiValueClass(2)}
          />
          <MarketplaceDeskStat
            label="Pipeline value (active)"
            value={formatCurrency(active.reduce((s, r) => s + r.amount, 0))}
            valueClassName={marketplaceDeskKpiValueClass(0)}
          />
        </MarketplaceDeskStatGrid>
        {counteredBySeller > 0 ? (
          <p className="text-xs font-medium text-brand-orange mt-3">
            {counteredBySeller} counter{counteredBySeller === 1 ? "" : "s"} from
            founders — review below.
          </p>
        ) : null}
      </MarketplaceDeskPanel>

      <MarketplaceDeskPanel title="Recent seller responses">
        <BuyerOfferActivityFeed />
      </MarketplaceDeskPanel>

      <MarketplaceDeskPanel title="All offers">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading offers…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No structured offers yet. Express interest on a listing, then submit
            an offer from Browse or the listing page.
          </p>
        ) : (
          <div className="space-y-8">
            {sectionTotal === 0 ? (
              <OfferSection title="Your offers" offers={rows} />
            ) : (
              <>
                <OfferSection
                  title="Action required"
                  description="Founder countered — accept, counter back, or withdraw."
                  offers={grouped.needsAction}
                />
                <OfferSection
                  title="Accepted by seller"
                  description="Due diligence and closing steps."
                  offers={grouped.accepted}
                />
                <OfferSection
                  title="Waiting on seller"
                  description="Submitted or under review."
                  offers={grouped.waiting}
                />
                <OfferSection
                  title="Declined or closed"
                  offers={grouped.declined}
                />
                <OfferSection title="Other" offers={grouped.other} />
              </>
            )}
          </div>
        )}
      </MarketplaceDeskPanel>
    </div>
  );
}
