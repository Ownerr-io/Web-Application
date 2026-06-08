import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/pages/admin/layout";
import { AdminPageHeader } from "@/components/admin/AdminDashboardShell";
import { AdminKpiGrid } from "@/components/admin/AdminKpiGrid";
import { fetchAdminOffersDashboard } from "@/lib/marketplace/offerService";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

export default function MarketplaceAdminOffersPage() {
  const [status, setStatus] = useState<string>("all");
  const [slug, setSlug] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "marketplace", "offers", status, slug],
    queryFn: () =>
      fetchAdminOffersDashboard({
        status: status === "all" ? undefined : status,
        startupSlug: slug.trim() || undefined,
      }),
  });

  const metrics = data?.metrics ?? {};
  const offers = data?.offers ?? [];

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Marketplace offers"
        description="Structured acquisition offers, counters, and deal stages."
      />
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="countered">Countered</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Startup slug</Label>
          <Input
            className="w-[220px]"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="filter by slug"
          />
        </div>
      </div>
      {error ? (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      ) : null}
      <AdminKpiGrid
        items={[
          {
            label: "Total offers",
            value: isLoading ? "…" : String(metrics.total ?? 0),
          },
          {
            label: "Accepted",
            value: isLoading ? "…" : String(metrics.accepted ?? 0),
          },
          {
            label: "Declined",
            value: isLoading ? "…" : String(metrics.declined ?? 0),
          },
          {
            label: "Countered",
            value: isLoading ? "…" : String(metrics.countered ?? 0),
          },
          {
            label: "Due diligence",
            value: isLoading ? "…" : String(metrics.dueDiligence ?? 0),
          },
          {
            label: "Closed deals",
            value: isLoading ? "…" : String(metrics.closed ?? 0),
          },
        ]}
      />
      <div className="mt-8 overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Startup</th>
              <th className="p-3">Buyer</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
              <th className="p-3">Stage</th>
              <th className="p-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-4 text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : offers.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-muted-foreground">
                  No offers match filters.
                </td>
              </tr>
            ) : (
              offers.map((row) => {
                const r = row as Record<string, unknown>;
                return (
                  <tr key={String(r.id)} className="border-t">
                    <td className="p-3">
                      <div className="font-medium">
                        {String(r.startupTitle ?? "")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {String(r.startupSlug ?? "")}
                      </div>
                    </td>
                    <td className="p-3">{String(r.buyerName ?? "")}</td>
                    <td className="p-3 tabular-nums">
                      {formatCurrency(Number(r.amount ?? 0))}
                    </td>
                    <td className="p-3 capitalize">{String(r.status ?? "")}</td>
                    <td className="p-3">{String(r.acquisitionStage ?? "—")}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {r.updatedAt
                        ? new Date(String(r.updatedAt)).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
