import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/pages/admin/layout";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { fetchAllLedgerEntries } from "@/lib/ownerr-network/adminApi";
import type { OwnerrNetworkLedgerRow } from "@/lib/ownerr-network/types";
import { useAdminPageView } from "@/lib/admin/useAdminPageView";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const columns: Column<OwnerrNetworkLedgerRow>[] = [
  { key: "id", label: "Transaction", sortable: true, className: "w-24" },
  { key: "user_id", label: "User ID", sortable: true },
  { key: "type", label: "Type", sortable: true },
  {
    key: "amount",
    label: "Amount",
    sortable: true,
    render: (value) => (value ?? 0).toLocaleString(),
  },
  {
    key: "created_at",
    label: "Date",
    sortable: true,
    render: (value) =>
      value ? formatDistanceToNow(new Date(value), { addSuffix: true }) : "—",
  },
];

export default function AdminLedgerPage() {
  useAdminPageView("ledger");

  const { data: ledgerEntries = [], isLoading, error } = useQuery({
    queryKey: ["admin", "ownerr-network", "ledger"],
    queryFn: fetchAllLedgerEntries,
    staleTime: 300_000,
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Ledger</h2>
          <p className="text-sm text-muted-foreground">
            Wallet and points transactions across the network
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Failed to load ledger entries.</AlertDescription>
          </Alert>
        )}

        <DataTable
          columns={columns}
          data={ledgerEntries}
          pageSize={20}
          searchable
          searchKeys={["user_id", "type"]}
          emptyMessage="No ledger entries found"
          isLoading={isLoading}
        />
      </div>
    </AdminLayout>
  );
}
