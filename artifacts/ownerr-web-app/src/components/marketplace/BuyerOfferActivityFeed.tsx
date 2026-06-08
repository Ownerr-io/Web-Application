import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { fetchOfferNotifications } from "@/lib/marketplace/offerService";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";
import { MarketplaceDeskListItem } from "@/components/marketplace/MarketplaceDeskUi";

const EVENT_COPY: Record<string, string> = {
  counter_offer: "Founder sent a counter offer",
  offer_accepted: "Your offer was accepted",
  offer_declined: "Your offer was declined",
  counter_accepted: "You accepted a counter — seller notified",
  offer_withdrawn: "Offer withdrawn",
  due_diligence_started: "Due diligence started",
  deal_closed: "Deal closed",
};

type OfferEventRow = {
  id: string;
  event_type: string;
  created_at: string;
  payload: { startup_title?: string; amount?: number } | null;
  read_at: string | null;
};

function startupTitleFromPayload(
  payload: OfferEventRow["payload"],
): string | null {
  if (!payload || typeof payload !== "object") return null;
  const t = payload.startup_title;
  return typeof t === "string" && t.length > 0 ? t : null;
}

export function BuyerOfferActivityFeed() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["marketplace", "offer-events"],
    queryFn: () => fetchOfferNotifications(12),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading updates…</p>;
  }
  if (!events.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Seller responses (accept, counter, decline) will appear here and on each
        offer card.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {(events as OfferEventRow[]).map((row) => {
        const label =
          EVENT_COPY[row.event_type] ?? row.event_type.replace(/_/g, " ");
        const title = startupTitleFromPayload(row.payload);
        return (
          <MarketplaceDeskListItem
            key={row.id}
            className={!row.read_at ? "border-brand-orange/30" : undefined}
          >
            <p className="font-medium text-sm">{label}</p>
            {title ? (
              <p className="text-xs text-muted-foreground">{title}</p>
            ) : null}
            <p className="text-[10px] text-muted-foreground mt-1">
              {new Date(row.created_at).toLocaleString()}
            </p>
          </MarketplaceDeskListItem>
        );
      })}
      <Link
        href={MARKETPLACE_ROUTES.buyerOffers}
        className="text-xs font-medium text-brand-lime hover:underline"
      >
        View all offers →
      </Link>
    </div>
  );
}
