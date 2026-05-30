import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/pages/admin/layout";
import { AdminCrudActions } from "@/components/admin/AdminCrudActions";
import {
  fetchAllReferrals,
  updateReferralStatus,
  deleteReferral,
} from "@/lib/ownerr-network/adminApi";
import type { OwnerrNetworkReferralRow } from "@/lib/ownerr-network/types";
import { useAdminPageView } from "@/lib/admin/useAdminPageView";
import { trackAdminCrud } from "@/lib/admin/analytics";
import { Card } from "@/components/ui/card";
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

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "ownerr-network", "referrals"],
    queryFn: fetchAllReferrals,
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: string;
    }) => {
      await updateReferralStatus(id, status);
      trackAdminCrud("ownerr_network", "update", "referral", { id, status });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "ownerr-network"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteReferral(id);
      trackAdminCrud("ownerr_network", "delete", "referral", { id });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "ownerr-network"] });
    },
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <p className="text-muted-foreground">Loading referrals...</p>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <p className="text-red-500">Failed to load referrals</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Referrals</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage referral activity
          </p>
        </div>

        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted">
              <tr>
                <th className="px-4 py-3 text-left">Referrer</th>
                <th className="px-4 py-3 text-left">Referred User</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Created At</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data && data.length > 0 ? (
                data.map((referral: OwnerrNetworkReferralRow) => (
                  <tr key={referral.id} className="border-b">
                    <td className="px-4 py-3 font-medium">
                      {referral.referrer_id}
                    </td>
                    <td className="px-4 py-3">{referral.referee_id}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={referral.status}
                        onValueChange={(status) =>
                          updateMutation.mutate({ id: referral.id, status })
                        }
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      {referral.created_at
                        ? new Date(referral.created_at).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <AdminCrudActions
                        onDelete={() => {
                          if (confirm("Delete this referral?")) {
                            deleteMutation.mutate(referral.id);
                          }
                        }}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    No referrals found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </AdminLayout>
  );
}
