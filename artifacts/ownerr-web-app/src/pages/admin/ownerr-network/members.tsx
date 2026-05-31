import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useLocation, useSearch } from "wouter";
import { AdminLayout } from "@/pages/admin/layout";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { NetworkMemberSheet } from "@/components/admin/network/NetworkMemberSheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAdminPageView } from "@/lib/admin/useAdminPageView";
import {
  fetchAdminNetworkMemberDetail,
  fetchAdminNetworkMembers,
  filterNetworkMembers,
} from "@/lib/ownerr-network/adminMembersApi";
import type {
  MemberListFilter,
  NetworkMemberRow,
} from "@/lib/ownerr-network/adminMembersTypes";

const FILTERS: { id: MemberListFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "verification_pending", label: "Pending verification" },
  { id: "incomplete_profile", label: "Incomplete profile" },
  { id: "inactive", label: "Inactive 30d+" },
  { id: "suspended", label: "Suspended" },
];

function parseFilter(search: string): MemberListFilter {
  const q = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const f = q.get("filter") as MemberListFilter | null;
  return FILTERS.some((x) => x.id === f) ? f! : "all";
}

export default function OwnerrNetworkMembersPage() {
  useAdminPageView("members");
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
    queryKey: ["admin", "ownerr-network", "members"],
    queryFn: fetchAdminNetworkMembers,
    staleTime: 60_000,
  });

  const filtered = useMemo(
    () => filterNetworkMembers(data, filter),
    [data, filter],
  );

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["admin", "ownerr-network", "member", selectedId],
    queryFn: () => fetchAdminNetworkMemberDetail(selectedId!),
    enabled: Boolean(selectedId),
  });

  const setFilter = (id: MemberListFilter) => {
    const base = "/admin/ownerr-network/members";
    navigate(id === "all" ? base : `${base}?filter=${id}`);
  };

  const columns: Column<NetworkMemberRow>[] = [
    {
      key: "username",
      label: "Member",
      sortable: true,
      render: (_, row) => (
        <span>
          <span className="font-medium">@{row.username}</span>
          {row.fullName ? (
            <span className="block text-xs text-muted-foreground truncate max-w-[180px]">
              {row.fullName}
            </span>
          ) : null}
        </span>
      ),
    },
    { key: "email", label: "Email", sortable: true },
    {
      key: "verificationStatus",
      label: "Verified",
      sortable: true,
      render: (v) => String(v ?? "—"),
    },
    {
      key: "profileCompletionScore",
      label: "Profile %",
      sortable: true,
      render: (v, row) =>
        row.onboardingCompleted ? `${v}%` : `${v}% · onboarding open`,
    },
    {
      key: "points",
      label: "Points",
      sortable: true,
      render: (v) => Number(v).toLocaleString(),
    },
    { key: "referralsMade", label: "Refs out", sortable: true },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (v) => String(v),
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
          <h2 className="text-2xl font-bold tracking-tight">Members</h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            One list for everyone in Ownerr Network. Click a row to manage{" "}
            <strong>account</strong> (login, verification, roles, points) and{" "}
            <strong>network profile</strong> (headline, onboarding, how they
            appear to others) together — no separate Users vs Profiles pages.
          </p>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>
              {(error as Error).message}. Run migration{" "}
              <code className="text-xs">
                20260701200000_admin_network_members
              </code>
              .
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.id}
              variant={filter === f.id ? "default" : "outline"}
              size="sm"
              className={cn("text-xs")}
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
          searchable
          searchKeys={["username", "email", "fullName"]}
          emptyMessage="No members match this filter."
          onRowClick={(row) => setSelectedId(row.userId)}
        />
      </div>

      <NetworkMemberSheet
        open={Boolean(selectedId)}
        onOpenChange={(open) => !open && setSelectedId(null)}
        detail={detail}
        loading={detailLoading}
        onSaved={() => void refetch()}
      />
    </AdminLayout>
  );
}
