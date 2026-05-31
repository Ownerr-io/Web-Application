import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/pages/admin/layout";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { AdminCrudActions } from "@/components/admin/AdminCrudActions";
import {
  fetchAllOsListings,
  updateOsListing,
  deleteOsListing,
  type AdminOsListingRow,
} from "@/lib/ownerr-os/adminApi";
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

export default function OwnerrOsListingsAdminPage() {
  useAdminPageView("listings");
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AdminOsListingRow | null>(null);
  const [form, setForm] = useState<Partial<AdminOsListingRow>>({});

  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin", "ownerr-os", "listings"],
    queryFn: fetchAllOsListings,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      await updateOsListing(editing.id, form);
      trackAdminCrud("ownerr_os", "update", "listing", { id: editing.id });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "ownerr-os"] });
      setEditing(null);
      setForm({});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteOsListing(id);
      trackAdminCrud("ownerr_os", "delete", "listing", { id });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "ownerr-os"] });
    },
  });

  const columns: Column<AdminOsListingRow>[] = [
    { key: "title", label: "Title", sortable: true },
    { key: "listing_type", label: "Type", sortable: true },
    { key: "industry", label: "Industry", sortable: true },
    { key: "status", label: "Status", sortable: true },
    { key: "visibility", label: "Visibility", sortable: true },
    {
      key: "updated_at",
      label: "Updated",
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
            if (confirm(`Archive listing "${row.title}"?`)) {
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
          <h2 className="text-2xl font-bold tracking-tight">OS Listings</h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            In-app startup catalog (<code className="text-xs">listings</code>).
            For viral join submissions and referral analytics, use Founders.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Failed to load listings.</AlertDescription>
          </Alert>
        )}

        <DataTable
          columns={columns}
          data={data}
          searchable
          searchKeys={["title", "industry", "listing_type"]}
          emptyMessage="No listings found"
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
            <DialogTitle>Edit listing</DialogTitle>
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
              <Label>Description</Label>
              <Input
                value={form.description ?? ""}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={form.status ?? "draft"}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
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
