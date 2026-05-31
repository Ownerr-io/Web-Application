import { AdminLayout } from "@/pages/admin/layout";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAdminPageView } from "@/lib/admin/useAdminPageView";
import { fetchAdminOsSummary } from "@/lib/admin/summaryApi";
import { fetchAdminOwnerrOsCharts } from "@/lib/ownerr-os/adminFoundersApi";
import {
  AdminBreakdownList,
  AdminKpiGrid,
} from "@/components/admin/AdminKpiGrid";
import {
  AdminFunnel,
  AdminSection,
  AdminTodoPanel,
} from "@/components/admin/AdminIntelligence";
import { OwnerrOsDashboardCharts } from "@/components/admin/ownerr-os/OwnerrOsDashboardCharts";
import {
  AdminChartsBlock,
  AdminDashboardPage,
  AdminInlineLink,
  AdminInsightsBlock,
  AdminMetricsBlock,
  AdminPageHeader,
} from "@/components/admin/AdminDashboardShell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ADMIN_ROUTES } from "@/routing/routeRegistry";

function fmt(n: number): string {
  return n.toLocaleString();
}

export default function OwnerrOsAdminDashboard() {
  useAdminPageView("dashboard");
  const [, navigate] = useLocation();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "ownerr-os", "summary"],
    queryFn: fetchAdminOsSummary,
    staleTime: 60_000,
  });

  const { data: charts } = useQuery({
    queryKey: ["admin", "ownerr-os", "charts"],
    queryFn: fetchAdminOwnerrOsCharts,
    staleTime: 60_000,
  });

  const fa = data?.founderAnalytics;
  const avgConversion =
    fa && fa.totalReferralClicks > 0
      ? Math.round((fa.totalConversions / fa.totalReferralClicks) * 1000) / 10
      : 0;

  return (
    <AdminLayout>
      <AdminDashboardPage>
        <AdminPageHeader
          title="Ownerr OS Intelligence"
          description={
            <>
              Founder funnel, viral loop, and traffic —{" "}
              <AdminInlineLink
                onClick={() => navigate(ADMIN_ROUTES.ownerrOsFounders)}
              >
                Founders
              </AdminInlineLink>{" "}
              for join-flow directory;{" "}
              <AdminInlineLink
                onClick={() => navigate(ADMIN_ROUTES.ownerrOsListings)}
              >
                Listings
              </AdminInlineLink>{" "}
              for in-app catalog.
            </>
          }
        />

        {error || (!isLoading && !data) ? (
          <Alert>
            <AlertDescription>
              Apply <code className="text-xs">admin_os_summary</code> migration
              for listing + founder analytics.
            </AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading metrics…</p>
        ) : data ? (
          <>
            <AdminMetricsBlock>
              <AdminKpiGrid
                items={[
                  {
                    label: "OS listings",
                    value: fmt(data.totalListings),
                    onClick: () => navigate(ADMIN_ROUTES.ownerrOsListings),
                  },
                  {
                    label: "Published listings",
                    value: fmt(data.publishedListings),
                  },
                  {
                    label: "Draft listings",
                    value: fmt(data.draftListings),
                  },
                  {
                    label: "Founder submissions",
                    value: fa ? fmt(fa.totalFounders) : "—",
                    onClick: () => navigate(ADMIN_ROUTES.ownerrOsFounders),
                  },
                  {
                    label: "Total visits (clicks)",
                    value: fa ? fmt(fa.totalReferralClicks) : "—",
                  },
                  {
                    label: "Referral signups",
                    value: fa ? fmt(fa.totalConversions) : "—",
                    accent: "success",
                  },
                  {
                    label: "Avg conversion",
                    value: fa ? `${avgConversion}%` : "—",
                    hint: "Signups / visits",
                  },
                ]}
                columns={3}
              />
            </AdminMetricsBlock>

            <AdminChartsBlock description="Submissions, visits, signups, and catalog mix (30d where applicable)">
              <OwnerrOsDashboardCharts charts={charts ?? null} />
            </AdminChartsBlock>

            <AdminInsightsBlock>
              {data.founderFunnel?.length ? (
                <AdminSection title="Founder funnel">
                  <AdminFunnel stages={data.founderFunnel} />
                </AdminSection>
              ) : null}

              {fa?.trafficSources?.length ? (
                <AdminBreakdownList
                  title="Share / visit sources"
                  rows={fa.trafficSources.map((t, i) => ({
                    key: `${t.sourcePlatform}-${i}`,
                    label: t.sourcePlatform,
                    value: t.count,
                  }))}
                />
              ) : null}

              {fa?.topFounders?.length ? (
                <AdminSection title="Top founders (viral score)">
                  <AdminBreakdownList
                    title="Open Founders for full detail"
                    rows={fa.topFounders.slice(0, 8).map((f) => ({
                      key: f.id,
                      label: `${f.founderName} · ${f.startupName}`,
                      value: f.viralScore,
                    }))}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => navigate(ADMIN_ROUTES.ownerrOsFounders)}
                  >
                    Open founders directory
                  </Button>
                </AdminSection>
              ) : null}

              {data.trackingGaps?.length ? (
                <AdminTodoPanel
                  title="Not tracked in DB yet"
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
