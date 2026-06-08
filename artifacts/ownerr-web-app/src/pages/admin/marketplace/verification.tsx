import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/pages/admin/layout";
import { AdminKpiGrid } from "@/components/admin/AdminKpiGrid";
import { DataTable } from "@/components/admin/DataTable";
import { getSupabase } from "@/lib/supabase/client";
import { useAdminPageView } from "@/lib/admin/useAdminPageView";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fetchAdminListingVerificationQueue } from "@/lib/intelligence/listingVerificationApi";
import { SchemaTables as T } from "@/lib/supabase/schemaTables";

async function fetchVerificationOps() {
  const { data, error } = await getSupabase().rpc(
    "admin_verification_ops_summary",
  );
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

async function fetchRecentSyncs() {
  const { data, error } = await getSupabase()
    .from(T.trust.integrationSyncRuns)
    .select(
      "id, connection_id, sync_type, status, error_message, created_at, finished_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function fetchAuditLogs() {
  const { data, error } = await getSupabase()
    .from(T.system.auditLogs)
    .select("id, subject_type, action, actor_role, created_at")
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export default function AdminMarketplaceVerificationPage() {
  useAdminPageView("marketplace-verification");
  const ops = useQuery({
    queryKey: ["admin-verification-ops"],
    queryFn: fetchVerificationOps,
  });
  const syncs = useQuery({
    queryKey: ["admin-integration-syncs"],
    queryFn: fetchRecentSyncs,
  });
  const audit = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: fetchAuditLogs,
  });
  const fraudQueue = useQuery({
    queryKey: ["admin-listing-verification-queue"],
    queryFn: fetchAdminListingVerificationQueue,
  });

  const kpi = ops.data ?? {};
  const fq = fraudQueue.data ?? {};
  const highRisk =
    (fq.high_risk_listings as Record<string, unknown>[] | undefined) ?? [];
  const openFraudReviews =
    (fq.open_fraud_reviews as Record<string, unknown>[] | undefined) ?? [];
  const queuedSyncs = Number(kpi.queued_syncs ?? 0);
  const pendingJobs = Number(kpi.pending_worker_jobs ?? 0);
  const workerNeeded = queuedSyncs > 0 || pendingJobs > 0;

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Verification & integrations</h1>
          <p className="text-sm text-muted-foreground">
            Standard listings publish automatically when all gates pass. Admins
            only investigate fraud signals (warning / high risk), appeals, and
            provider failures. Public catalog requires{" "}
            <code className="text-xs">listing_lifecycle = published</code>.
          </p>
        </div>

        {workerNeeded ? (
          <Alert>
            <AlertTitle>Async verification jobs pending</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                {pendingJobs} job(s) and {queuedSyncs} sync row(s) are waiting.
                Processing requires configured invoke URLs in{" "}
                <code className="text-xs">platform_internal_config</code>{" "}
                (Supabase Edge Functions or same-origin /api routes).
                Marketplace desk does not depend on this.
              </p>
              <p className="text-xs">
                Local dev:{" "}
                <code className="text-xs">
                  npm run dev:with-verification-worker
                </code>
              </p>
            </AlertDescription>
          </Alert>
        ) : null}

        <AdminKpiGrid
          items={[
            {
              label: "Queued syncs",
              value: String(kpi.queued_syncs ?? 0),
            },
            {
              label: "Pending worker jobs",
              value: String(kpi.pending_worker_jobs ?? 0),
            },
            {
              label: "Failed syncs (24h)",
              value: String(kpi.failed_syncs_24h ?? 0),
            },
            {
              label: "Connections in error",
              value: String(kpi.connections_error ?? 0),
            },
            { label: "Fraud: warning/high", value: String(highRisk.length) },
            {
              label: "Open fraud reviews",
              value: String(openFraudReviews.length),
            },
          ]}
        />

        <section>
          <h2 className="mb-3 font-semibold">Fraud investigation queue</h2>
          <p className="mb-2 text-xs text-muted-foreground">
            Listings flagged by the automated fraud engine. Normal verification
            does not require admin approval.
          </p>
          <DataTable
            columns={[
              { key: "slug", label: "Listing" },
              { key: "title", label: "Title" },
              { key: "fraud_risk", label: "Risk" },
              { key: "listing_lifecycle", label: "Lifecycle" },
            ]}
            data={highRisk}
          />
        </section>

        <section>
          <h2 className="mb-3 font-semibold">Open fraud reviews</h2>
          <DataTable
            columns={[
              { key: "slug", label: "Listing" },
              { key: "status", label: "Status" },
              { key: "notes", label: "Notes" },
              { key: "created_at", label: "Created" },
            ]}
            data={openFraudReviews}
          />
        </section>

        <section>
          <h2 className="mb-3 font-semibold">Recent syncs</h2>
          <DataTable
            columns={[
              { key: "sync_type", label: "Type" },
              { key: "status", label: "Status" },
              { key: "error_message", label: "Error" },
              { key: "created_at", label: "Created" },
            ]}
            data={syncs.data ?? []}
          />
        </section>

        <section>
          <h2 className="mb-3 font-semibold">Audit log</h2>
          <DataTable
            columns={[
              { key: "subject_type", label: "Subject" },
              { key: "action", label: "Action" },
              { key: "actor_role", label: "Role" },
              { key: "created_at", label: "When" },
            ]}
            data={audit.data ?? []}
          />
        </section>
      </div>
    </AdminLayout>
  );
}
