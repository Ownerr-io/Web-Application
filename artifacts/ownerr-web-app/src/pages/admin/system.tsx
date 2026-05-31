import { AdminLayout } from "@/pages/admin/layout";
import { useQuery } from "@tanstack/react-query";
import {
  AdminSection,
  AdminTodoPanel,
} from "@/components/admin/AdminIntelligence";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fetchAdminSystemHealth } from "@/lib/admin/summaryApi";
import {
  AdminDashboardPage,
  AdminInsightsBlock,
  AdminPageHeader,
} from "@/components/admin/AdminDashboardShell";
import {
  PlatformDataFreshness,
  SystemDatabaseOverview,
} from "@/components/admin/PlatformAdminOverview";
import { useAdminPageView } from "@/lib/admin/useAdminPageView";
import { fetchAdminPlatformSummary } from "@/lib/admin/summaryApi";

export default function AdminSystemPage() {
  useAdminPageView("system");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "system", "health"],
    queryFn: fetchAdminSystemHealth,
    staleTime: 60_000,
  });

  const platformQuery = useQuery({
    queryKey: ["admin", "platform", "summary"],
    queryFn: fetchAdminPlatformSummary,
    staleTime: 90_000,
  });

  const unavailable = [
    !data?.storageUsageAvailable && "Storage usage (Supabase dashboard)",
    !data?.authFailuresAvailable && "Auth failure counts (log drain)",
    !data?.apiErrorsAvailable && "API error rates (edge logs)",
    !data?.rpcErrorsAvailable && "RPC error rates (Postgres logs)",
  ].filter(Boolean) as string[];

  return (
    <AdminLayout>
      <AdminDashboardPage>
        <AdminPageHeader
          title="System Health"
          description="Database footprint, session signals, and table-level row counts grouped by domain."
        >
          {platformQuery.data?.generatedAt ? (
            <PlatformDataFreshness
              generatedAt={platformQuery.data.generatedAt}
            />
          ) : null}
        </AdminPageHeader>

        {error || (!isLoading && !data) ? (
          <Alert>
            <AlertDescription>
              Apply{" "}
              <code className="text-xs">
                20260701183000_admin_platform_ops_system_enriched
              </code>{" "}
              migration to load expanded system metrics.
            </AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data ? (
          <>
            <AdminSection title="Live database">
              <SystemDatabaseOverview
                tableCounts={data.tableCounts}
                usersTotal={data.usersTotal}
                usersDeleted={data.usersDeleted}
                platformAdmins={data.platformAdmins}
                productSessionsTotal={data.productSessionsTotal}
                productSessionsActive24h={data.productSessionsActive24h}
              />
            </AdminSection>

            <AdminInsightsBlock>
              {unavailable.length > 0 ? (
                <AdminTodoPanel
                  title="Unavailable without external telemetry"
                  items={unavailable}
                />
              ) : null}

              {data.notes?.length ? (
                <AdminTodoPanel title="Notes" items={data.notes} />
              ) : null}
            </AdminInsightsBlock>
          </>
        ) : null}
      </AdminDashboardPage>
    </AdminLayout>
  );
}
