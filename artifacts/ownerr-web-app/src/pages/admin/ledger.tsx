import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/pages/admin/layout";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { fetchAllLedgerEntries } from "@/lib/ownerr-network/adminApi";
import { fetchAdminNetworkMembers } from "@/lib/ownerr-network/adminMembersApi";
import type { OwnerrNetworkLedgerRow } from "@/lib/ownerr-network/types";
import { useAdminPageView } from "@/lib/admin/useAdminPageView";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type LedgerRow = OwnerrNetworkLedgerRow & { memberLabel: string };

export default function AdminLedgerPage() {
  useAdminPageView("ledger");

  const {
    data: ledgerEntries = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin", "ownerr-network", "ledger"],
    queryFn: fetchAllLedgerEntries,
    staleTime: 300_000,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["admin", "ownerr-network", "members"],
    queryFn: fetchAdminNetworkMembers,
    staleTime: 120_000,
  });

  const byUserId = useMemo(
    () => new Map(members.map((m) => [m.userId, m.username])),
    [members],
  );

  const rows: LedgerRow[] = useMemo(
    () =>
      ledgerEntries.map((e) => ({
        ...e,
        id: e.id,
        memberLabel: byUserId.get(e.user_id)
          ? `@${byUserId.get(e.user_id)}`
          : e.user_id.slice(0, 8) + "…",
      })),
    [ledgerEntries, byUserId],
  );

  const columns: Column<LedgerRow>[] = [
    { key: "memberLabel", label: "Member", sortable: true },
    { key: "type", label: "Type", sortable: true },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      render: (value) => (value ?? 0).toLocaleString(),
    },
    {
      key: "created_at",
      label: "When",
      sortable: true,
      render: (value) =>
        value
          ? formatDistanceToNow(new Date(String(value)), { addSuffix: true })
          : "—",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Wallet activity</h2>
          <p className="text-sm text-muted-foreground">
            Point and wallet movements across members (read-only).
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Failed to load wallet activity.</AlertDescription>
          </Alert>
        )}

        <DataTable
          columns={columns}
          data={rows}
          pageSize={20}
          searchable
          searchKeys={["memberLabel", "type"]}
          emptyMessage="No wallet transactions yet."
          isLoading={isLoading}
        />
      </div>
    </AdminLayout>
  );
}
