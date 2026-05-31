import { AdminLayout } from "@/pages/admin/layout";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAdminPageView } from "@/lib/admin/useAdminPageView";
import { fetchAdminMarketplaceSummary } from "@/lib/admin/summaryApi";
import {
  fetchAdminMarketplaceBuyers,
  fetchAdminMarketplaceCharts,
  fetchAdminMarketplaceSellers,
} from "@/lib/marketplace/adminParticipantsApi";
import { AdminKpiGrid } from "@/components/admin/AdminKpiGrid";
import {
  AdminCompactTable,
  AdminLeaderboard,
  AdminSection,
  AdminTodoPanel,
} from "@/components/admin/AdminIntelligence";
import { MarketplaceDashboardCharts } from "@/components/admin/marketplace/MarketplaceDashboardCharts";
import {
  AdminChartsBlock,
  AdminDashboardPage,
  AdminInsightsBlock,
  AdminMetricsBlock,
  AdminPageHeader,
} from "@/components/admin/AdminDashboardShell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ADMIN_ROUTES } from "@/routing/routeRegistry";

function fmt(n: number): string {
  return n.toLocaleString();
}

export default function MarketplaceAdminDashboard() {
  useAdminPageView("dashboard");
  const [, navigate] = useLocation();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "marketplace", "summary"],
    queryFn: fetchAdminMarketplaceSummary,
    staleTime: 60_000,
  });

  const { data: charts } = useQuery({
    queryKey: ["admin", "marketplace", "charts"],
    queryFn: fetchAdminMarketplaceCharts,
    staleTime: 60_000,
  });

  const { data: buyers = [] } = useQuery({
    queryKey: ["admin", "marketplace", "buyers"],
    queryFn: fetchAdminMarketplaceBuyers,
    staleTime: 60_000,
  });

  const { data: sellers = [] } = useQuery({
    queryKey: ["admin", "marketplace", "sellers"],
    queryFn: fetchAdminMarketplaceSellers,
    staleTime: 60_000,
  });

  const totalInterests =
    data?.dealPipeline?.reduce((s, r) => s + r.count, 0) ?? 0;

  return (
    <AdminLayout>
      <AdminDashboardPage>
        <AdminPageHeader
          title="Marketplace Intelligence"
          description="Acquisition pipeline, buyers, sellers, and listing performance."
        />

        {error || (!isLoading && !data) ? (
          <Alert>
            <AlertDescription>
              Apply migrations{" "}
              <code className="text-xs">admin_marketplace_summary</code>,{" "}
              <code className="text-xs">
                20260701180000_admin_intelligence_extended
              </code>
              , and{" "}
              <code className="text-xs">
                20260701190000_admin_marketplace_participants
              </code>
              .
            </AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading metrics…</p>
        ) : data ? (
          <>
            <AdminMetricsBlock>
              <AdminKpiGrid
                columns={4}
                items={[
                  {
                    label: "Listings",
                    value: fmt(data.totalListings),
                    onClick: () => navigate(ADMIN_ROUTES.marketplaceListings),
                  },
                  {
                    label: "Published",
                    value: fmt(data.publishedListings),
                    accent: "success",
                  },
                  {
                    label: "Buyers",
                    value: fmt(buyers.length),
                    onClick: () => navigate(ADMIN_ROUTES.marketplaceBuyers),
                  },
                  {
                    label: "Sellers",
                    value: fmt(sellers.length),
                    onClick: () => navigate(ADMIN_ROUTES.marketplaceSellers),
                  },
                  {
                    label: "Pipeline interests",
                    value: fmt(totalInterests),
                  },
                  {
                    label: "Submissions",
                    value: fmt(data.totalSubmissions),
                    onClick: () =>
                      navigate(ADMIN_ROUTES.marketplaceSubmissions),
                  },
                  {
                    label: "Pending review",
                    value: fmt(data.pendingSubmissions),
                    accent: "warning",
                  },
                  {
                    label: "Verified listings",
                    value: fmt(data.verifiedListings),
                  },
                ]}
              />
            </AdminMetricsBlock>

            <AdminChartsBlock description="Pipeline, funnel stages, and engagement trends">
              <MarketplaceDashboardCharts summary={data} charts={charts} />
            </AdminChartsBlock>

            <AdminInsightsBlock>
              {data.startupPerformance?.length ? (
                <AdminCompactTable
                  title="Startup performance"
                  columns={[
                    "Startup",
                    "Views",
                    "Interests",
                    "Bids",
                    "Convos",
                    "Days",
                    "Conv %",
                  ]}
                  rows={data.startupPerformance.map((s) => [
                    s.title,
                    s.views,
                    s.interestCount,
                    s.bidCount,
                    s.conversationCount,
                    s.daysListed,
                    s.conversionRate,
                  ])}
                />
              ) : null}

              {data.topBuyers?.length ? (
                <AdminSection title="Buyer activity">
                  <AdminLeaderboard
                    title="Most active buyers"
                    rows={data.topBuyers.map((b) => ({
                      label: b.label,
                      value: b.interests + b.bids,
                    }))}
                    valueLabel="actions"
                  />
                </AdminSection>
              ) : null}

              {data.trackingGaps?.length ? (
                <AdminTodoPanel
                  title="Tracking gaps"
                  items={data.trackingGaps}
                />
              ) : null}
            </AdminInsightsBlock>
          </>
        ) : null}
      </AdminDashboardPage>
    </AdminLayout>
  );
}
