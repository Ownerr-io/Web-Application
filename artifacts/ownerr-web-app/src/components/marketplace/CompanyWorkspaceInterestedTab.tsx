import { useQuery } from "@tanstack/react-query";
import { listInterestsForStartupSlug } from "@/lib/marketplace/interestService";
import { formatCurrency } from "@/lib/utils";
import { MarketplaceDeskListItem } from "@/components/marketplace/MarketplaceDeskUi";

export function CompanyWorkspaceInterestedTab({ slug }: { slug: string }) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["marketplace-interests", slug],
    queryFn: () => listInterestsForStartupSlug(slug),
  });

  if (isLoading)
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!rows.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No expressed interests yet. Interests appear when buyers reach out from
        the marketplace.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((record) => (
        <MarketplaceDeskListItem key={record.id}>
          <p className="font-semibold">{record.buyerName}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {record.stage}
          </p>
          {record.offerAmount ? (
            <p className="text-sm mt-1">
              Indicative offer {formatCurrency(record.offerAmount)}
            </p>
          ) : null}
          <p className="text-sm text-foreground/90 mt-1">
            {record.messages.at(-1)?.body ?? record.messages[0]?.body ?? "—"}
          </p>
        </MarketplaceDeskListItem>
      ))}
    </div>
  );
}
