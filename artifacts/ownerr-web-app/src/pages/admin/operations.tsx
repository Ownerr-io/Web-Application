import { AdminLayout } from "@/pages/admin/layout";
import { useQuery } from "@tanstack/react-query";
import {
  AdminActivityFeed,
  AdminFunnel,
  AdminSection,
  AdminTodoPanel,
  AdminLeaderboard,
} from "@/components/admin/AdminIntelligence";
import { AdminKpiGrid } from "@/components/admin/AdminKpiGrid";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  fetchAdminOperationsSummary,
  fetchAdminPlatformSummary,
} from "@/lib/admin/summaryApi";
import {
  AdminDashboardPage,
  AdminInsightsBlock,
  AdminMetricsBlock,
  AdminPageHeader,
} from "@/components/admin/AdminDashboardShell";
import { PlatformDataFreshness } from "@/components/admin/PlatformAdminOverview";
import { useAdminPageView } from "@/lib/admin/useAdminPageView";

function fmt(n: number): string {
  return n.toLocaleString();
}

export default function AdminOperationsPage() {
  useAdminPageView("operations");

  const opsQuery = useQuery({
    queryKey: ["admin", "operations", "summary"],
    queryFn: fetchAdminOperationsSummary,
    staleTime: 60_000,
  });

  const platformQuery = useQuery({
    queryKey: ["admin", "platform", "summary"],
    queryFn: fetchAdminPlatformSummary,
    staleTime: 90_000,
  });

  const data = opsQuery.data;
  const gov = data?.governance;
  const m = platformQuery.data?.marketplace;
  const n = platformQuery.data?.network;

  return (
    <AdminLayout>
      <AdminDashboardPage>
        <AdminPageHeader
          title="Operations & Governance"
          description="Moderation queues, cross-product governance KPIs, and a live activity feed from core tables."
        >
          {platformQuery.data?.generatedAt ? (
            <PlatformDataFreshness
              generatedAt={platformQuery.data.generatedAt}
            />
          ) : null}
        </AdminPageHeader>

        {opsQuery.error || (!opsQuery.isLoading && !data) ? (
          <Alert>
            <AlertDescription>
              Run migration{" "}
              <code className="text-xs">
                20260701183000_admin_platform_ops_system_enriched
              </code>{" "}
              as a platform admin to load governance KPIs.
            </AlertDescription>
          </Alert>
        ) : null}

        {opsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data ? (
          <>
            <AdminMetricsBlock title="Moderation & trust">
              <AdminSection title="Account moderation">
                <AdminKpiGrid
                  columns={3}
                  items={[
                    {
                      label: "Suspended users",
                      value: data.moderation.suspendedUsers,
                      accent: "warning",
                    },
                    {
                      label: "Flagged profiles",
                      value: data.moderation.flaggedProfiles,
                    },
                    {
                      label: "Suspended marketplace profiles",
                      value: data.moderation.suspendedMarketplaceProfiles,
                    },
                  ]}
                />
                {data.moderation.flaggedListingsNote ? (
                  <p className="text-xs text-muted-foreground mt-2">
                    {data.moderation.flaggedListingsNote}
                  </p>
                ) : null}
              </AdminSection>
            </AdminMetricsBlock>

            <AdminMetricsBlock
              title="Governance queue"
              description="Counts that need human review — detail lives in product consoles."
            >
              <AdminKpiGrid
                columns={4}
                items={[
                  {
                    label: "Pending submissions",
                    value: gov ? fmt(gov.pendingSubmissions) : "—",
                    accent: "warning",
                  },
                  {
                    label: "Draft listings",
                    value: gov ? fmt(gov.draftListings) : "—",
                  },
                  {
                    label: "Open bids",
                    value: gov ? fmt(gov.openBids) : "—",
                  },
                  {
                    label: "Pending referrals",
                    value: gov ? fmt(gov.pendingReferrals) : "—",
                  },
                  {
                    label: "Onboarding incomplete",
                    value: gov ? fmt(gov.onboardingIncomplete) : "—",
                  },
                  {
                    label: "New users (24h)",
                    value: gov ? fmt(gov.newUsers24h) : "—",
                    accent: "success",
                  },
                  {
                    label: "Platform admins",
                    value: gov ? fmt(gov.platformAdmins) : "—",
                  },
                  {
                    label: "Verified listings",
                    value: m ? fmt(m.verifiedListings) : "—",
                    hint: m ? `${fmt(m.archivedListings)} archived` : undefined,
                  },
                ]}
              />
            </AdminMetricsBlock>

            {(m?.dealPipeline?.length ?? 0) > 0 ||
            (n?.userHealth?.length ?? 0) > 0 ? (
              <AdminInsightsBlock title="Pipeline & health">
                <div className="grid gap-6 lg:grid-cols-2">
                  {m?.dealPipeline?.length ? (
                    <AdminSection title="Marketplace deal pipeline">
                      <AdminFunnel
                        stages={m.dealPipeline.map((row) => ({
                          stage: row.status,
                          count: row.count,
                        }))}
                      />
                    </AdminSection>
                  ) : null}
                  {n?.userHealth?.length ? (
                    <AdminLeaderboard
                      title="Network user health flags"
                      rows={n.userHealth.map((r) => ({
                        label: r.flag,
                        value: r.count,
                      }))}
                    />
                  ) : null}
                </div>
              </AdminInsightsBlock>
            ) : null}

            <AdminInsightsBlock title="Audit & activity">
              {!data.auditLogsAvailable ? (
                <AdminTodoPanel
                  title="Audit logs (not yet in database)"
                  items={[
                    data.auditLogsNote,
                    "Track: role changes, suspensions, listing edits, archives, verification decisions",
                  ]}
                />
              ) : null}

              <AdminSection
                title="Admin activity feed"
                description="Latest rows from users, bids, referrals, and submissions"
              >
                <AdminActivityFeed items={data.activityFeed} />
              </AdminSection>
            </AdminInsightsBlock>
          </>
        ) : null}
      </AdminDashboardPage>
    </AdminLayout>
  );
}
