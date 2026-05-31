import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { AdminLayout } from "@/pages/admin/layout";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { AdminCrudActions } from "@/components/admin/AdminCrudActions";
import {
  fetchAdminReferralDetails,
  updateReferralStatus,
  deleteReferral,
} from "@/lib/ownerr-network/adminApi";
import type { AdminReferralDetail } from "@/lib/ownerr-network/types";
import { useAdminPageView } from "@/lib/admin/useAdminPageView";
import { trackAdminCrud } from "@/lib/admin/analytics";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminReferralsPage() {
  useAdminPageView("referrals");
  const queryClient = useQueryClient();

  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin", "ownerr-network", "referrals"],
    queryFn: fetchAdminReferralDetails,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await updateReferralStatus(id, status);
      trackAdminCrud("ownerr_network", "update", "referral", { id, status });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["admin", "ownerr-network"],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteReferral(id);
      trackAdminCrud("ownerr_network", "delete", "referral", { id });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["admin", "ownerr-network"],
      });
    },
  });

  const columns: Column<AdminReferralDetail>[] = [
    { key: "referrer_label", label: "Referrer", sortable: true },
    { key: "referee_label", label: "Referred member", sortable: true },
    {
      key: "status",
      label: "Status",
      render: (_, row) => (
        <Select
          value={row.status}
          onValueChange={(status) =>
            updateMutation.mutate({ id: row.id, status })
          }
        >
          <SelectTrigger className="h-8 w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">pending</SelectItem>
            <SelectItem value="completed">completed</SelectItem>
            <SelectItem value="cancelled">cancelled</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "source",
      label: "Source",
      sortable: true,
      render: (v) => (v ? String(v) : "—"),
    },
    {
      key: "created_at",
      label: "Created",
      sortable: true,
      render: (v) =>
        v ? formatDistanceToNow(new Date(String(v)), { addSuffix: true }) : "—",
    },
    {
      key: "id",
      label: "",
      render: (_, row) => (
        <AdminCrudActions
          onDelete={() => {
            if (confirm("Delete this referral record?"))
              deleteMutation.mutate(row.id);
          }}
          deleteLabel="Delete"
        />
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Referrals</h2>
          <p className="text-sm text-muted-foreground">
            Who invited whom in Ownerr Network. Member details live under{" "}
            <strong>Members</strong>.
          </p>
        </div>

        {error ? (
          <p className="text-sm text-destructive">Failed to load referrals</p>
        ) : null}

        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          searchable
          searchKeys={["referrer_label", "referee_label", "source"]}
          emptyMessage="No referrals recorded yet."
        />
      </div>
    </AdminLayout>
  );
}
