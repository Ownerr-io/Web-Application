import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/pages/admin/layout";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { AdminCrudActions } from "@/components/admin/AdminCrudActions";
import {
  fetchAllMarketplaceSubmissions,
  updateMarketplaceSubmission,
  deleteMarketplaceSubmission,
  type AdminSubmissionRow,
} from "@/lib/marketplace/adminApi";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";

export default function MarketplaceSubmissionsAdminPage() {
  useAdminPageView("submissions");
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AdminSubmissionRow | null>(null);
  const [form, setForm] = useState<Partial<AdminSubmissionRow>>({});

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["admin", "marketplace", "submissions"],
    queryFn: fetchAllMarketplaceSubmissions,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      await updateMarketplaceSubmission(editing.id, form);
      trackAdminCrud("marketplace", "update", "submission", { id: editing.id });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "marketplace"] });
      setEditing(null);
      setForm({});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteMarketplaceSubmission(id);
      trackAdminCrud("marketplace", "delete", "submission", { id });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "marketplace"] });
    },
  });

  const columns: Column<AdminSubmissionRow>[] = [
    { key: "title", label: "Title", sortable: true },
    { key: "sector", label: "Sector", sortable: true },
    { key: "stage", label: "Stage", sortable: true },
    { key: "status", label: "Status", sortable: true },
    {
      key: "score",
      label: "Score",
      render: (v) => (v != null ? Number(v).toFixed(1) : "—"),
    },
    {
      key: "created_at",
      label: "Created",
      render: (v) =>
        v ? formatDistanceToNow(new Date(v), { addSuffix: true }) : "—",
    },
    {
      key: "id",
      label: "Actions",
      render: (_, row) => (
        <AdminCrudActions
          onEdit={() => {
            setEditing(row);
            setForm({ ...row });
          }}
          onDelete={() => {
            if (confirm(`Archive submission "${row.title}"?`)) {
              deleteMutation.mutate(row.id);
            }
          }}
          deleteLabel="Archive"
        />
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Submissions</h2>
          <p className="text-sm text-muted-foreground">
            Review acquisition and founder submissions
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Failed to load submissions.</AlertDescription>
          </Alert>
        )}

        <DataTable
          columns={columns}
          data={data}
          searchable
          searchKeys={["title", "sector", "stage"]}
          emptyMessage="No submissions found"
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
            <DialogTitle>Edit submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={form.title ?? ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Sector</Label>
              <Input
                value={form.sector ?? ""}
                onChange={(e) =>
                  setForm({ ...form, sector: e.target.value || null })
                }
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={form.status ?? "active"}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
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
