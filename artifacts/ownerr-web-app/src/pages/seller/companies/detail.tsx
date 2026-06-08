import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearch } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ListingVerificationHub } from "@/components/marketplace/ListingVerificationHub";
import { SellerCompanyProfileForm } from "@/components/marketplace/SellerCompanyProfileForm";
import { VerificationGateSummary } from "@/components/marketplace/VerificationGateSummary";
import { DeleteListingButton } from "@/components/marketplace/DeleteListingButton";
import { MarketplaceAppPageShell } from "@/components/marketplace/MarketplaceAppPageShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";
import { marketplaceSellerListingPath } from "@/lib/appPaths";
import {
  fetchSellerCompanies,
  isCompanyPublished,
} from "@/lib/marketplace/sellerCompanyApi";
import {
  countVerifiedGates,
  gatesTotal,
  LISTING_LIFECYCLE_LABEL,
} from "@/lib/marketplace/verificationDesk";
import { CompanyWorkspaceInterestedTab } from "@/components/marketplace/CompanyWorkspaceInterestedTab";
import { CompanyWorkspaceOffersTab } from "@/components/marketplace/CompanyWorkspaceOffersTab";
import { CompanyWorkspaceMessagesTab } from "@/components/marketplace/CompanyWorkspaceMessagesTab";

type CompanyTab =
  | "overview"
  | "verification"
  | "profile"
  | "interested"
  | "offers"
  | "messages";

function parseTab(search: string): CompanyTab {
  const t = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  ).get("tab");
  if (
    t === "verification" ||
    t === "profile" ||
    t === "overview" ||
    t === "interested" ||
    t === "offers" ||
    t === "messages"
  ) {
    return t;
  }
  return "overview";
}

export default function SellerCompanyDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  const search = useSearch();
  const tab = parseTab(search);
  const { session } = useAuth();
  const authUserId = session?.user?.id;

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["seller-companies", authUserId],
    queryFn: () => fetchSellerCompanies(authUserId!),
    enabled: !!authUserId,
  });

  const row = companies.find((c) => c.listing.slug === slug);
  const listing = row?.listing;
  const snapshot = row?.snapshot;
  const gates = snapshot?.gates;
  const notFound = !isLoading && slug && !row;

  if (isLoading) {
    return (
      <MarketplaceAppPageShell kicker="Company" title="Loading…" description="">
        <Skeleton className="h-32 w-full rounded-xl" />
      </MarketplaceAppPageShell>
    );
  }

  if (notFound || !listing || !gates || !snapshot) {
    return (
      <MarketplaceAppPageShell
        kicker="Company"
        title="Not found"
        description="This company is not on your seller desk."
      >
        <Button asChild variant="secondary">
          <Link href={MARKETPLACE_ROUTES.sellerCompanies}>
            Back to companies
          </Link>
        </Button>
      </MarketplaceAppPageShell>
    );
  }

  const lc = snapshot.listing_lifecycle;
  const verifiedCount = countVerifiedGates(gates);
  const published = isCompanyPublished(row);

  return (
    <MarketplaceAppPageShell
      kicker="Company workspace"
      title={listing.name}
      description={
        published
          ? "Live on the marketplace."
          : `${verifiedCount}/${gatesTotal()} verification gates complete · ${LISTING_LIFECYCLE_LABEL[lc]}`
      }
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          {published ? (
            <Button asChild variant="outline" size="sm">
              <Link href={marketplaceSellerListingPath(slug)}>
                Public listing
              </Link>
            </Button>
          ) : null}
          <DeleteListingButton
            slug={slug}
            listingName={listing.name}
            variant="destructive"
          />
        </div>
      }
    >
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-mt-2 mb-4 w-fit px-0 text-muted-foreground hover:text-foreground"
      >
        <Link href={MARKETPLACE_ROUTES.sellerCompanies}>
          <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
          All companies
        </Link>
      </Button>

      <Tabs value={tab} className="space-y-4 sm:space-y-6">
        <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="inline-flex h-auto min-w-min flex-nowrap gap-0.5 p-1 sm:h-9">
            <TabsTrigger value="overview" asChild>
              <Link
                href={`${MARKETPLACE_ROUTES.sellerCompanyDetail(slug)}?tab=overview`}
              >
                Overview
              </Link>
            </TabsTrigger>
            <TabsTrigger value="verification" asChild>
              <Link
                href={`${MARKETPLACE_ROUTES.sellerCompanyDetail(slug)}?tab=verification`}
              >
                Verification
              </Link>
            </TabsTrigger>
            <TabsTrigger value="profile" asChild>
              <Link
                href={`${MARKETPLACE_ROUTES.sellerCompanyDetail(slug)}?tab=profile`}
              >
                Profile
              </Link>
            </TabsTrigger>
            <TabsTrigger value="interested" asChild>
              <Link
                href={`${MARKETPLACE_ROUTES.sellerCompanyDetail(slug)}?tab=interested`}
              >
                Interested buyers
              </Link>
            </TabsTrigger>
            <TabsTrigger value="offers" asChild>
              <Link
                href={`${MARKETPLACE_ROUTES.sellerCompanyDetail(slug)}?tab=offers`}
              >
                Offers
              </Link>
            </TabsTrigger>
            <TabsTrigger value="messages" asChild>
              <Link
                href={`${MARKETPLACE_ROUTES.sellerCompanyDetail(slug)}?tab=messages`}
              >
                Messages
              </Link>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4 mt-0">
          {!published ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
              Not visible to buyers until all three verification checks pass and
              the listing publishes automatically.
            </div>
          ) : null}
          <VerificationGateSummary gates={gates} />
        </TabsContent>

        <TabsContent value="verification" className="mt-0">
          <ListingVerificationHub startupSlug={slug} />
        </TabsContent>

        <TabsContent value="profile" className="mt-0">
          <SellerCompanyProfileForm listing={listing} gates={gates} />
        </TabsContent>

        <TabsContent value="interested" className="mt-0">
          <CompanyWorkspaceInterestedTab slug={slug} />
        </TabsContent>

        <TabsContent value="offers" className="mt-0">
          <CompanyWorkspaceOffersTab slug={slug} />
        </TabsContent>

        <TabsContent value="messages" className="mt-0">
          <CompanyWorkspaceMessagesTab slug={slug} />
        </TabsContent>
      </Tabs>
    </MarketplaceAppPageShell>
  );
}
