import { useQuery } from "@tanstack/react-query";
import { fetchMarketplaceListings } from "@/lib/marketplace/service";
import { useMyInterests } from "@/hooks/marketplace/useInterests";
import { formatCurrency } from "@/lib/utils";
import {
  MarketplaceDeskListItem,
  MarketplaceDeskPanel,
  MarketplaceDeskStat,
  MarketplaceDeskStatGrid,
  marketplaceDeskKpiValueClass,
} from "@/components/marketplace/MarketplaceDeskUi";

export default function BuyerInterestsPage() {
  const interestsQuery = useMyInterests();
  const listingsQuery = useQuery({
    queryKey: ["buyer-interests-listings"],
    queryFn: () => fetchMarketplaceListings(),
  });
  const listingBySlug = new Map(
    (listingsQuery.data ?? []).map(
      (listing) => [listing.slug, listing] as const,
    ),
  );
  const rows = (interestsQuery.data ?? []) as Array<{
    id: string;
    listingId: string;
    stage: string;
    offerAmount: number | null;
    messages: Array<{ body: string }>;
  }>;

  return (
    <MarketplaceDeskPanel title="My interests">
      <MarketplaceDeskStatGrid>
        <MarketplaceDeskStat
          label="Open threads"
          value={rows.length}
          valueClassName={marketplaceDeskKpiValueClass(0)}
        />
        <MarketplaceDeskStat
          label="With offer"
          value={rows.filter((r) => !!r.offerAmount).length}
          valueClassName={marketplaceDeskKpiValueClass(1)}
        />
        <MarketplaceDeskStat
          label="Awaiting reply"
          value={rows.filter((r) => r.stage !== "closed").length}
          valueClassName={marketplaceDeskKpiValueClass(2)}
        />
      </MarketplaceDeskStatGrid>
      <div className="space-y-3">
        {rows.map((record) => {
          const listing = listingBySlug.get(record.listingId);
          return (
            <MarketplaceDeskListItem key={record.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {listing?.name ?? record.listingId}
                </p>
                <span className="rounded-full border border-[color:var(--terminal-border)] px-2 py-0.5 text-xs capitalize text-brand-orange">
                  {record.stage}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {record.offerAmount
                  ? `Offer: ${formatCurrency(record.offerAmount)}`
                  : "Offer pending"}
              </p>
              <p className="mt-1 text-sm text-foreground/90">
                {record.messages.at(-1)?.body ?? "No messages yet."}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(listing?.nicheTags ?? []).slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[color:var(--terminal-border)] px-2 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </MarketplaceDeskListItem>
          );
        })}
      </div>
    </MarketplaceDeskPanel>
  );
}
