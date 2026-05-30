import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/pages/admin/layout";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { AdminCrudActions } from "@/components/admin/AdminCrudActions";
import {
  fetchAllUsers,
  updateNetworkUser,
  deleteNetworkUser,
} from "@/lib/ownerr-network/adminApi";
import type { OwnerrNetworkUser } from "@/lib/ownerr-network/types";
import { useAdminPageView } from "@/lib/admin/useAdminPageView";
import { trackAdminCrud } from "@/lib/admin/analytics";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatDistanceToNow } from "date-fns";

export default function AdminUsersPage() {
  useAdminPageView("users");
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<OwnerrNetworkUser | null>(null);
  const [form, setForm] = useState<{
    name?: string;
    username?: string;
    profile_verified?: boolean;
    points?: number;
  }>({});

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["admin", "ownerr-network", "users"],
    queryFn: fetchAllUsers,
    staleTime: 300_000,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      await updateNetworkUser(editing.id, form);
      trackAdminCrud("ownerr_network", "update", "user", { id: editing.id });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "ownerr-network"] });
      setEditing(null);
      setForm({});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteNetworkUser(id);
      trackAdminCrud("ownerr_network", "delete", "user", { id });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "ownerr-network"] });
    },
  });

  const columns: Column<OwnerrNetworkUser>[] = [
    { key: "id", label: "ID", sortable: true, className: "w-24" },
    { key: "name", label: "Name", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "username", label: "Username", sortable: true },
    {
      key: "points",
      label: "Points",
      sortable: true,
      render: (value) => value?.toLocaleString() ?? "0",
    },
    { key: "total_referrals", label: "Referrals", sortable: true },
    {
      key: "profile_verified",
      label: "Verified",
      sortable: true,
      render: (value) => (value ? "✓" : "—"),
    },
    {
      key: "created_at",
      label: "Joined",
      sortable: true,
      render: (value) =>
        value ? formatDistanceToNow(new Date(value), { addSuffix: true }) : "—",
    },
    {
      key: "id",
      label: "Actions",
      render: (_, row) => (
        <AdminCrudActions
          onEdit={() => {
            setEditing(row);
            setForm({
              name: row.name,
              username: row.username,
              profile_verified: row.profile_verified,
              points: row.points,
            });
          }}
          onDelete={() => {
            if (confirm(`Suspend user "${row.name}"?`)) {
              deleteMutation.mutate(row.id);
            }
          }}
          deleteLabel="Suspend"
        />
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Users</h2>
          <p className="text-sm text-muted-foreground">
            View and manage Ownerr Network users
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load users. Ensure platform admin access is configured.
            </AlertDescription>
          </Alert>
        )}

        <DataTable
          columns={columns}
          data={users}
          pageSize={20}
          searchable
          searchKeys={["name", "email", "username"]}
          emptyMessage="No users found"
          isLoading={isLoading}
        />
      </div>

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setForm({});
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name ?? ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Username</Label>
              <Input
                value={form.username ?? ""}
                onChange={(e) =>
                  setForm({ ...form, username: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Points</Label>
              <Input
                type="number"
                value={form.points ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    points: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.profile_verified ?? false}
                onCheckedChange={(v) =>
                  setForm({ ...form, profile_verified: v })
                }
              />
              <Label>Profile verified</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
