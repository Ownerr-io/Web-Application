import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useLocation, useSearch } from "wouter";
import { AdminLayout } from "@/pages/admin/layout";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { FounderDetailSheet } from "@/components/admin/ownerr-os/FounderDetailSheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAdminPageView } from "@/lib/admin/useAdminPageView";
import {
  fetchAdminOwnerrOsFounderDetail,
  fetchAdminOwnerrOsFounders,
  filterOwnerrOsFounders,
} from "@/lib/ownerr-os/adminFoundersApi";
import type {
  FounderListFilter,
  OwnerrOsFounderRow,
} from "@/lib/ownerr-os/adminFoundersTypes";

const FILTERS: { id: FounderListFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "high_performers", label: "High viral score" },
  { id: "has_signups", label: "Has signups" },
  { id: "no_visits", label: "No visits yet" },
];

function parseFilter(search: string): FounderListFilter {
  const q = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const f = q.get("filter") as FounderListFilter | null;
  return FILTERS.some((x) => x.id === f) ? f! : "all";
}

export default function OwnerrOsFoundersAdminPage() {
  useAdminPageView("founders");
  const [, navigate] = useLocation();
  const search = useSearch();
  const filter = parseFilter(search ? `?${search}` : "");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const {
    data = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin", "ownerr-os", "founders"],
    queryFn: fetchAdminOwnerrOsFounders,
    staleTime: 60_000,
  });

  const filtered = useMemo(
    () => filterOwnerrOsFounders(data, filter),
    [data, filter],
  );

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["admin", "ownerr-os", "founder", selectedId],
    queryFn: () => fetchAdminOwnerrOsFounderDetail(selectedId!),
    enabled: Boolean(selectedId),
  });

  const setFilter = (id: FounderListFilter) => {
    const base = "/admin/ownerr-os/founders";
    navigate(id === "all" ? base : `${base}?filter=${id}`);
  };

  const columns: Column<OwnerrOsFounderRow>[] = [
    {
      key: "founderName",
      label: "Founder",
      sortable: true,
      render: (_, row) => (
        <span>
          <span className="font-medium">{row.founderName}</span>
          <span className="block text-xs text-muted-foreground truncate max-w-[200px]">
            {row.startupName}
          </span>
        </span>
      ),
    },
    {
      key: "referralCode",
      label: "Code",
      render: (_, row) => <code className="text-xs">{row.referralCode}</code>,
    },
    {
      key: "visitCount",
      label: "Visits",
      sortable: true,
      render: (v) => Number(v).toLocaleString(),
    },
    {
      key: "signupCount",
      label: "Signups",
      sortable: true,
      render: (v) => Number(v).toLocaleString(),
    },
    {
      key: "conversionRate",
      label: "Conv.",
      sortable: true,
      render: (v) => `${Number(v)}%`,
    },
    {
      key: "viralScore",
      label: "Score",
      sortable: true,
    },
    {
      key: "createdAt",
      label: "Joined",
      sortable: true,
      render: (v) =>
        v ? formatDistanceToNow(new Date(String(v)), { addSuffix: true }) : "—",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Founders</h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Everyone who completed the viral join flow (
            <code className="text-xs">founder_submissions</code>). This is not
            the OS startup catalog — use{" "}
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={() => navigate("/admin/ownerr-os/listings")}
            >
              Listings
            </button>{" "}
            for in-app catalog CRUD.
          </p>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>
              {error instanceof Error
                ? error.message
                : "Failed to load founders."}{" "}
              Run <code className="text-xs">npm run db:migrate</code> for{" "}
              <code className="text-xs">admin_ownerr_os_founders</code>.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.id}
              type="button"
              size="sm"
              variant={filter === f.id ? "default" : "outline"}
              className={cn(filter === f.id && "pointer-events-none")}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          emptyMessage="No founder submissions yet."
          onRowClick={(row) => setSelectedId(row.founderId)}
        />

        {!isLoading && !error ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void refetch()}
          >
            Refresh
          </Button>
        ) : null}
      </div>

      <FounderDetailSheet
        open={Boolean(selectedId)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        detail={detail}
        loading={detailLoading}
      />
    </AdminLayout>
  );
}
