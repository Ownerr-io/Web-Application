import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/pages/admin/layout";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ADMIN_APPS } from "@/lib/admin/config";
import { trackAdminPageView } from "@/lib/admin/analytics";
import { fetchAdminPlatformSummary } from "@/lib/admin/summaryApi";
import { AdminKpiGrid } from "@/components/admin/AdminKpiGrid";
import {
  AdminBarTrend,
  AdminLeaderboard,
  AdminSection,
  AdminTodoPanel,
} from "@/components/admin/AdminIntelligence";
import {
  CrossProductPulse,
  PlatformDataFreshness,
  PlatformExecutiveSnapshot,
} from "@/components/admin/PlatformAdminOverview";
import {
  AdminChartsBlock,
  AdminDashboardPage,
  AdminInsightsBlock,
  AdminMetricsBlock,
  AdminPageHeader,
} from "@/components/admin/AdminDashboardShell";
import { ArrowRight } from "lucide-react";

function fmt(n: number): string {
  return n.toLocaleString();
}

export default function AdminHubPage() {
  const [, navigate] = useLocation();

  const {
    data: platform,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin", "platform", "summary"],
    queryFn: fetchAdminPlatformSummary,
    staleTime: 90_000,
  });

  useEffect(() => {
    trackAdminPageView("ownerr_network", "hub");
  }, []);

  const p = platform?.platform;
  const n = platform?.network;
  const m = platform?.marketplace;
  const os = platform?.ownerrOs;

  const migrationHint =
    error || (!isLoading && platform && !p) ? (
      <Alert>
        <AlertDescription>
          Apply Supabase migrations{" "}
          <code className="text-xs">
            20260701180000_admin_intelligence_extended
          </code>{" "}
          and{" "}
          <code className="text-xs">
            20260701183000_admin_platform_ops_system_enriched
          </code>{" "}
          for full platform KPIs. Partial metrics may still load from existing
          RPCs.
        </AlertDescription>
      </Alert>
    ) : null;

  return (
    <AdminLayout>
      <AdminDashboardPage>
        <AdminPageHeader
          title="Platform Intelligence"
          description="Cross-product growth, adoption, and health — then open a product console for operational detail."
        >
          {platform?.generatedAt ? (
            <PlatformDataFreshness generatedAt={platform.generatedAt} />
          ) : null}
        </AdminPageHeader>

        {migrationHint}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading intelligence…</p>
        ) : null}

        {platform ? (
          <AdminMetricsBlock
            title="Overview"
            description="Headline platform metrics"
          >
            <PlatformExecutiveSnapshot platform={p} network={n} />
            <CrossProductPulse network={n} marketplace={m} ownerrOs={os} />
          </AdminMetricsBlock>
        ) : null}

        {p ? (
          <>
            <AdminMetricsBlock description="Users, adoption, and acquisition">
              <AdminSection title="User metrics">
                <AdminKpiGrid
                  columns={4}
                  items={[
                    { label: "Total users", value: fmt(p.totalUsers) },
                    { label: "New today", value: fmt(p.newUsersToday) },
                    {
                      label: "New this week",
                      value: fmt(p.newUsersWeek),
                      hint: `${p.growthPercentWeek >= 0 ? "+" : ""}${p.growthPercentWeek}% vs prior week`,
                    },
                    { label: "New this month", value: fmt(p.newUsersMonth) },
                    { label: "Active 7d", value: fmt(p.activeUsers7d) },
                    { label: "Active 30d", value: fmt(p.activeUsers30d) },
                    {
                      label: "Returning users",
                      value: fmt(p.returningUsers),
                      hint: "Logged in after day 1",
                    },
                    {
                      label: "Profile completion",
                      value: `${p.profileCompletionRate}%`,
                      hint: "Avg completion score",
                    },
                  ]}
                />
              </AdminSection>

              <AdminSection title="Product adoption">
                <AdminKpiGrid
                  columns={4}
                  items={[
                    {
                      label: "Ownerr Network",
                      value: fmt(p.ownerrNetworkUsers),
                    },
                    { label: "Marketplace", value: fmt(p.marketplaceUsers) },
                    { label: "Ownerr OS", value: fmt(p.ownerrOsUsers) },
                    {
                      label: "Multi-product",
                      value: fmt(p.multiProductUsers),
                      accent: "success",
                    },
                  ]}
                />
              </AdminSection>

              <AdminSection title="Acquisition & retention">
                <AdminKpiGrid
                  columns={4}
                  items={[
                    {
                      label: "Referral signups",
                      value: fmt(p.referralSignups),
                    },
                    { label: "Organic signups", value: fmt(p.organicSignups) },
                    {
                      label: "Referral conversion",
                      value: `${p.referralConversionPercent}%`,
                    },
                    {
                      label: "Network referrals",
                      value: n ? fmt(n.totalReferrals) : "—",
                      hint: n ? `${n.completedReferrals} completed` : undefined,
                    },
                  ]}
                />
              </AdminSection>
            </AdminMetricsBlock>

            <AdminChartsBlock description="Signup velocity and product mix">
              <div className="grid gap-6 lg:grid-cols-2">
                <AdminBarTrend
                  title="Daily signups (30d)"
                  points={p.dailySignups.map((d) => ({
                    label: d.day,
                    count: d.count,
                  }))}
                  xKey="label"
                  yKey="count"
                />
                <AdminBarTrend
                  title="Weekly growth"
                  points={p.weeklyGrowth.map((d) => ({
                    label: d.week,
                    count: d.count,
                  }))}
                  xKey="label"
                  yKey="count"
                />
              </div>

              {p.productAdoption.length > 0 ? (
                <AdminBarTrend
                  title="Product adoption distribution"
                  points={p.productAdoption.map((row) => ({
                    label: row.product,
                    count: row.count,
                  }))}
                  xKey="label"
                  yKey="count"
                />
              ) : null}

              {n?.referralsByDay && n.referralsByDay.length > 0 ? (
                <AdminBarTrend
                  title="Network referrals by day"
                  points={n.referralsByDay.map((d) => ({
                    label: d.day,
                    count: d.count,
                  }))}
                  xKey="label"
                  yKey="count"
                />
              ) : null}
            </AdminChartsBlock>

            {(n?.topReferrers?.length ?? 0) > 0 ||
            (n?.userHealth?.length ?? 0) > 0 ? (
              <AdminInsightsBlock
                title="Network signals"
                description="From live network aggregates"
              >
                <div className="grid gap-6 lg:grid-cols-2">
                  {n?.topReferrers?.length ? (
                    <AdminLeaderboard
                      title="Top referrers"
                      rows={n.topReferrers.map((r) => ({
                        label: r.label,
                        value: r.count,
                      }))}
                    />
                  ) : null}
                  {n?.userHealth?.length ? (
                    <AdminLeaderboard
                      title="User health flags"
                      rows={n.userHealth.map((r) => ({
                        label: r.flag,
                        value: r.count,
                      }))}
                    />
                  ) : null}
                </div>
              </AdminInsightsBlock>
            ) : null}

            <AdminInsightsBlock>
              <AdminTodoPanel
                title="Metrics needing richer tracking"
                items={[
                  ...(p.trackingGaps ?? []),
                  ...(p.activeUsers7d === 0 && p.totalUsers > 0
                    ? [
                        "Active users rely on last_login_at — ensure auth updates last_login_at on sign-in",
                      ]
                    : []),
                ]}
              />
            </AdminInsightsBlock>
          </>
        ) : platform ? (
          <AdminMetricsBlock>
            <CrossProductPulse network={n} marketplace={m} ownerrOs={os} />
          </AdminMetricsBlock>
        ) : null}

        <AdminInsightsBlock
          title="Product consoles"
          description="Deep dives — members, listings, founders, and CRUD live in each app admin."
        >
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ADMIN_APPS.map((app) => (
              <Card
                key={app.slug}
                className="brand-hub-card p-6 cursor-pointer transition group shadow-none"
                onClick={() => navigate(app.dashboardPath)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{app.label}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {app.description}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-brand-orange group-hover:text-brand-lime transition" />
                </div>
                <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
                  {app.nav.slice(1, 4).map((item) => (
                    <li key={item.path}>• {item.label}</li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </AdminInsightsBlock>
      </AdminDashboardPage>
    </AdminLayout>
  );
}
