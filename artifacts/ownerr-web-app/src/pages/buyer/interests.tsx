import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { fetchMarketplaceListings } from "@/lib/marketplace/service";
import { useMyInterests } from "@/hooks/marketplace/useInterests";
import { formatCurrency } from "@/lib/utils";

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
    <Card>
      <CardHeader>
        <CardTitle>My Interests</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Open Threads
            </p>
            <p className="mt-1 text-xl font-bold">{rows.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              With Offer
            </p>
            <p className="mt-1 text-xl font-bold">
              {rows.filter((r) => !!r.offerAmount).length}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Awaiting Reply
            </p>
            <p className="mt-1 text-xl font-bold">
              {rows.filter((r) => r.stage !== "closed").length}
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {rows.map((record) => {
            const listing = listingBySlug.get(record.listingId);
            return (
              <div
                key={record.id}
                className="rounded-lg border border-border p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    {listing?.name ?? record.listingId}
                  </p>
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs capitalize text-muted-foreground">
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
                      className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
