import { AdminLayout } from "@/pages/admin/layout";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAdminPageView } from "@/lib/admin/useAdminPageView";
import { fetchAdminNetworkSummary } from "@/lib/admin/summaryApi";
import { fetchAdminNetworkCharts } from "@/lib/ownerr-network/adminMembersApi";
import { AdminKpiGrid } from "@/components/admin/AdminKpiGrid";
import {
  AdminFunnel,
  AdminLeaderboard,
  AdminSection,
  AdminTodoPanel,
} from "@/components/admin/AdminIntelligence";
import { NetworkDashboardCharts } from "@/components/admin/network/NetworkDashboardCharts";
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

export default function OwnerrNetworkAdminDashboard() {
  useAdminPageView("dashboard");
  const [, navigate] = useLocation();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "ownerr-network", "summary"],
    queryFn: fetchAdminNetworkSummary,
    staleTime: 60_000,
  });

  const { data: charts } = useQuery({
    queryKey: ["admin", "ownerr-network", "charts"],
    queryFn: fetchAdminNetworkCharts,
    staleTime: 60_000,
  });

  const referralRate =
    data && data.totalReferrals > 0
      ? Math.round((data.completedReferrals / data.totalReferrals) * 100)
      : 0;

  const healthLinks: { filter: string; label: string; count: number }[] = [];
  if (data?.userHealth?.length) {
    const map: Record<string, string> = {
      inactive30d: "inactive",
      incompleteProfiles: "incomplete_profile",
      highReferralVelocity7d: "all",
    };
    for (const h of data.userHealth) {
      if (h.flag === "suspiciousPoints") continue;
      const f = map[h.flag] ?? "all";
      healthLinks.push({
        filter: f,
        label: h.note ? `${h.flag} (${h.note})` : h.flag,
        count: h.count,
      });
    }
  }

  return (
    <AdminLayout>
      <AdminDashboardPage>
        <AdminPageHeader
          title="Ownerr Network"
          description={
            <>
              Growth, wallet, and referrals — manage people in{" "}
              <AdminInlineLink
                onClick={() => navigate(ADMIN_ROUTES.ownerrNetworkMembers)}
              >
                Members
              </AdminInlineLink>{" "}
              (account + profile together).
            </>
          }
        />

        {error || (!isLoading && !data) ? (
          <Alert>
            <AlertDescription>
              Run Supabase migrations for{" "}
              <code className="text-xs">admin_network_summary</code> and{" "}
              <code className="text-xs">
                20260701200000_admin_network_members
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
                items={[
                  {
                    label: "Members",
                    value: fmt(data.totalUsers),
                    hint: `${fmt(data.newUsers30d)} joined in 30d`,
                    onClick: () => navigate(ADMIN_ROUTES.ownerrNetworkMembers),
                  },
                  {
                    label: "New (7 days)",
                    value: fmt(data.newUsers7d),
                    accent: "success",
                  },
                  {
                    label: "Onboarding done",
                    value: fmt(data.onboardingCompleted),
                    onClick: () =>
                      navigate(
                        `${ADMIN_ROUTES.ownerrNetworkMembers}?filter=incomplete_profile`,
                      ),
                  },
                  {
                    label: "Verified",
                    value: fmt(data.verifiedUsers),
                    onClick: () =>
                      navigate(
                        `${ADMIN_ROUTES.ownerrNetworkMembers}?filter=verification_pending`,
                      ),
                  },
                  {
                    label: "Referrals",
                    value: fmt(data.totalReferrals),
                    hint: `${referralRate}% completed`,
                    onClick: () =>
                      navigate(ADMIN_ROUTES.ownerrNetworkReferrals),
                  },
                  {
                    label: "Wallet transactions",
                    value: fmt(data.walletTransactions),
                    hint: `Volume ${fmt(data.walletVolume)}`,
                    onClick: () => navigate(ADMIN_ROUTES.ownerrNetworkLedger),
                  },
                  {
                    label: "Points in circulation",
                    value: fmt(data.totalPoints),
                  },
                  {
                    label: "Avg wallet balance",
                    value:
                      data.averageWalletBalance != null
                        ? fmt(data.averageWalletBalance)
                        : "—",
                  },
                ]}
              />
            </AdminMetricsBlock>

            <AdminChartsBlock description="Signups, referrals, wallet volume, and profile mix">
              <NetworkDashboardCharts charts={charts ?? null} />
            </AdminChartsBlock>

            <AdminInsightsBlock>
              {data.funnel?.length ? (
                <AdminSection title="Member journey">
                  <AdminFunnel stages={data.funnel} />
                </AdminSection>
              ) : null}

              <AdminSection title="Leaderboards">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {data.topReferrers?.length ? (
                    <AdminLeaderboard
                      title="Top referrers"
                      rows={data.topReferrers.map((r) => ({
                        label: r.label,
                        value: r.count,
                      }))}
                    />
                  ) : null}
                  {data.topEarners?.length ? (
                    <AdminLeaderboard
                      title="Top earners"
                      rows={data.topEarners.map((r) => ({
                        label: r.label,
                        value: r.earned,
                      }))}
                      valueLabel="pts"
                    />
                  ) : null}
                  {data.mostActiveUsers?.length ? (
                    <AdminLeaderboard
                      title="Most active"
                      rows={data.mostActiveUsers.map((r) => ({
                        label: r.label,
                        value: r.score,
                      }))}
                    />
                  ) : null}
                  {data.fastestGrowingUsers?.length ? (
                    <AdminLeaderboard
                      title="Fastest growing (14d)"
                      rows={data.fastestGrowingUsers.map((r) => ({
                        label: r.label,
                        value: r.referrals7d,
                      }))}
                      valueLabel="refs 7d"
                    />
                  ) : null}
                </div>
              </AdminSection>

              {healthLinks.length > 0 ? (
                <AdminSection title="Needs attention">
                  <ul className="flex flex-wrap gap-2">
                    {healthLinks.map((h) => (
                      <li key={h.label}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(
                              h.filter === "all"
                                ? ADMIN_ROUTES.ownerrNetworkMembers
                                : `${ADMIN_ROUTES.ownerrNetworkMembers}?filter=${h.filter}`,
                            )
                          }
                        >
                          {h.label}: {h.count}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </AdminSection>
              ) : null}

              <AdminTodoPanel
                title="Not tracked in DB yet"
                items={[
                  "Referral link shared (separate from referral row created)",
                  "Suspicious points anomaly rules",
                ]}
              />
            </AdminInsightsBlock>
          </>
        ) : null}
      </AdminDashboardPage>
    </AdminLayout>
  );
}
