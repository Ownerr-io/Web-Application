import { useStartupOffers } from "@/hooks/marketplace/useOffers";
import { OfferCard } from "@/components/marketplace/OfferCard";

export function CompanyWorkspaceOffersTab({ slug }: { slug: string }) {
  const { data: offers = [], isLoading } = useStartupOffers(slug);

  if (isLoading)
    return <p className="text-sm text-muted-foreground">Loading offers…</p>;
  if (!offers.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No structured offers on this listing yet. See Offers & bids in the
        sidebar for all companies.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {offers.map((offer) => (
        <OfferCard
          key={offer.id}
          offer={offer}
          startupSlug={slug}
          mode="seller"
        />
      ))}
    </div>
  );
}
