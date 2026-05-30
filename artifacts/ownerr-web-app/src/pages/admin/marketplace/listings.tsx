import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/pages/admin/layout";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { AdminCrudActions } from "@/components/admin/AdminCrudActions";
import {
  fetchAllMarketplaceListings,
  updateMarketplaceListing,
  deleteMarketplaceListing,
  createMarketplaceListing,
  type UpdateMarketplaceListingInput,
} from "@/lib/marketplace/adminApi";
import type { StartupRow } from "@/lib/marketplace/types";
import { useAdminPageView } from "@/lib/admin/useAdminPageView";
import { trackAdminCrud } from "@/lib/admin/analytics";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Plus } from "lucide-react";
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

export default function MarketplaceListingsAdminPage() {
  useAdminPageView("listings");
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<StartupRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<UpdateMarketplaceListingInput & { slug?: string }>({});

  const { data: listings = [], isLoading, error } = useQuery({
    queryKey: ["admin", "marketplace", "listings"],
    queryFn: fetchAllMarketplaceListings,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (creating) {
        await createMarketplaceListing({
          slug: form.slug ?? `listing-${Date.now()}`,
          title: form.title ?? "Untitled",
          description: form.description ?? "",
          industry: form.industry ?? undefined,
          asking_price: form.asking_price ?? undefined,
        });
        trackAdminCrud("marketplace", "create", "listing");
      } else if (editing) {
        await updateMarketplaceListing(editing.id, form);
        trackAdminCrud("marketplace", "update", "listing", { id: editing.id });
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "marketplace"] });
      setEditing(null);
      setCreating(false);
      setForm({});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteMarketplaceListing(id);
      trackAdminCrud("marketplace", "delete", "listing", { id });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "marketplace"] });
    },
  });

  const openEdit = (row: StartupRow) => {
    setCreating(false);
    setEditing(row);
    setForm({
      title: row.title,
      description: row.description,
      industry: row.industry,
      asking_price: row.asking_price,
      status: row.status,
      visibility: row.visibility,
      verified: row.verified,
    });
  };

  const columns: Column<StartupRow>[] = [
    { key: "slug", label: "Slug", sortable: true },
    { key: "title", label: "Title", sortable: true },
    { key: "industry", label: "Industry", sortable: true },
    { key: "status", label: "Status", sortable: true },
    { key: "visibility", label: "Visibility", sortable: true },
    {
      key: "asking_price",
      label: "Asking Price",
      render: (v) => (v != null ? `$${Number(v).toLocaleString()}` : "—"),
    },
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
          onEdit={() => openEdit(row)}
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Listings</h2>
            <p className="text-sm text-muted-foreground">
              Manage marketplace startup listings
            </p>
          </div>
          <Button
            onClick={() => {
              setCreating(true);
              setEditing(null);
              setForm({ status: "draft", visibility: "unlisted" });
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New listing
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Failed to load listings.</AlertDescription>
          </Alert>
        )}

        <DataTable
          columns={columns}
          data={listings}
          searchable
          searchKeys={["slug", "title", "industry"]}
          emptyMessage="No listings found"
          isLoading={isLoading}
        />
      </div>

      <Dialog
        open={creating || Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
            setForm({});
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {creating ? "Create listing" : "Edit listing"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {creating && (
              <div>
                <Label>Slug</Label>
                <Input
                  value={form.slug ?? ""}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </div>
            )}
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
              <Label>Industry</Label>
              <Input
                value={form.industry ?? ""}
                onChange={(e) =>
                  setForm({ ...form, industry: e.target.value || null })
                }
              />
            </div>
            <div>
              <Label>Asking price</Label>
              <Input
                type="number"
                value={form.asking_price ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    asking_price: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
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
                  <SelectItem value="sold">Sold</SelectItem>
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
