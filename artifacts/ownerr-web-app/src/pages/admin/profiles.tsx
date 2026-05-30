import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/pages/admin/layout";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { AdminCrudActions } from "@/components/admin/AdminCrudActions";
import {
  fetchAllProfiles,
  updateNetworkProfile,
} from "@/lib/ownerr-network/adminApi";
import type { OwnerrNetworkProfileRow } from "@/lib/ownerr-network/types";
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

export default function AdminProfilesPage() {
  useAdminPageView("profiles");
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<OwnerrNetworkProfileRow | null>(null);
  const [form, setForm] = useState<Partial<OwnerrNetworkProfileRow>>({});

  const { data: profiles = [], isLoading, error } = useQuery({
    queryKey: ["admin", "ownerr-network", "profiles"],
    queryFn: fetchAllProfiles,
    staleTime: 300_000,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      await updateNetworkProfile(editing.id, {
        display_name: form.display_name,
        user_type: form.user_type,
        experience_level: form.experience_level,
        work_preference: form.work_preference,
      });
      trackAdminCrud("ownerr_network", "update", "profile", { id: editing.id });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "ownerr-network"] });
      setEditing(null);
      setForm({});
    },
  });

  const columns: Column<OwnerrNetworkProfileRow>[] = [
    { key: "id", label: "ID", sortable: true, className: "w-24" },
    { key: "display_name", label: "Display Name", sortable: true },
    { key: "username", label: "Username", sortable: true },
    { key: "user_type", label: "User Type", sortable: true },
    {
      key: "skill_tags",
      label: "Skill Tags",
      render: (value) => (Array.isArray(value) ? value.join(", ") : "—"),
    },
    { key: "experience_level", label: "Experience", sortable: true },
    { key: "work_preference", label: "Work Preference", sortable: true },
    {
      key: "id",
      label: "Actions",
      render: (_, row) => (
        <AdminCrudActions
          onEdit={() => {
            setEditing(row);
            setForm({ ...row });
          }}
        />
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Profiles</h2>
          <p className="text-sm text-muted-foreground">
            View and edit Ownerr Network user profiles
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Failed to load profiles.</AlertDescription>
          </Alert>
        )}

        <DataTable
          columns={columns}
          data={profiles}
          pageSize={20}
          searchable
          searchKeys={["display_name", "username", "user_type", "goals"]}
          emptyMessage="No profiles found"
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
            <DialogTitle>Edit profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Display name</Label>
              <Input
                value={form.display_name ?? ""}
                onChange={(e) =>
                  setForm({ ...form, display_name: e.target.value })
                }
              />
            </div>
            <div>
              <Label>User type</Label>
              <Input
                value={form.user_type ?? ""}
                onChange={(e) =>
                  setForm({ ...form, user_type: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Experience level</Label>
              <Input
                value={form.experience_level ?? ""}
                onChange={(e) =>
                  setForm({ ...form, experience_level: e.target.value })
                }
              />
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
