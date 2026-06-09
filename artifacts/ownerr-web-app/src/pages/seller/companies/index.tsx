import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { MarketplaceAppPageShell } from "@/components/marketplace/MarketplaceAppPageShell";
import { ListCompanyButton } from "@/components/marketplace/ListCompanyButton";
import { SellerCompaniesTable } from "@/components/marketplace/SellerCompaniesTable";
import {
  MarketplaceDeskStat,
  MarketplaceDeskStatGrid,
  marketplaceDeskKpiValueClass,
} from "@/components/marketplace/MarketplaceDeskUi";
import { Skeleton } from "@/components/ui/skeleton";
import {
  countCompaniesReadyToPublish,
  countPublishedCompanies,
  fetchSellerCompanies,
} from "@/lib/marketplace/sellerCompanyApi";
import { gatesTotal } from "@/lib/marketplace/verificationDesk";

export default function SellerCompaniesPage() {
  const { session } = useAuth();
  const authUserId = session?.user?.id;
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["seller-companies", authUserId],
    queryFn: () => fetchSellerCompanies(authUserId!),
    enabled: !!authUserId,
  });

  const ready = countCompaniesReadyToPublish(companies);
  const published = countPublishedCompanies(companies);
  const avgTrust =
    companies.length > 0
      ? Math.round(
          companies.reduce((s, c) => s + (c.listing.trustScore ?? 0), 0) /
            companies.length,
        )
      : null;

  return (
    <MarketplaceAppPageShell
      kicker="Seller desk"
      title="Companies"
      description="Full intake for profile data, then three verification checks before publish."
      headerActions={<ListCompanyButton size="sm" />}
    >
      <MarketplaceDeskStatGrid>
        <MarketplaceDeskStat
          label="Companies"
          value={isLoading ? "…" : companies.length}
          valueClassName={marketplaceDeskKpiValueClass(0)}
        />
        <MarketplaceDeskStat
          label={`${gatesTotal()}/${gatesTotal()} gates ready`}
          value={companies.length ? ready : "—"}
          valueClassName={marketplaceDeskKpiValueClass(1)}
        />
        <MarketplaceDeskStat
          label="Published"
          value={companies.length ? published : "—"}
          valueClassName={marketplaceDeskKpiValueClass(2)}
        />
        <MarketplaceDeskStat
          label="Avg trust"
          value={avgTrust ?? "—"}
          valueClassName={marketplaceDeskKpiValueClass(0)}
        />
      </MarketplaceDeskStatGrid>

      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : companies.length === 0 ? (
        <div className="rounded-xl border border-border bg-muted/20 p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Add a company draft, then complete verification to go live.
          </p>
          <ListCompanyButton className="mx-auto" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-end">
            <ListCompanyButton size="sm" />
          </div>
          <SellerCompaniesTable companies={companies} />
        </div>
      )}
    </MarketplaceAppPageShell>
  );
}
