import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { AdminLayout } from "@/pages/admin/layout";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { MarketplaceBuyerDetailSheet } from "@/components/admin/marketplace/MarketplaceParticipantSheets";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAdminPageView } from "@/lib/admin/useAdminPageView";
import {
  fetchAdminMarketplaceBuyerDetail,
  fetchAdminMarketplaceBuyers,
} from "@/lib/marketplace/adminParticipantsApi";
import type { MarketplaceBuyerRow } from "@/lib/marketplace/adminParticipantsTypes";

export default function MarketplaceAdminBuyersPage() {
  useAdminPageView("buyers");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin", "marketplace", "buyers"],
    queryFn: fetchAdminMarketplaceBuyers,
    staleTime: 60_000,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["admin", "marketplace", "buyer", selectedId],
    queryFn: () => fetchAdminMarketplaceBuyerDetail(selectedId!),
    enabled: Boolean(selectedId),
  });

  const columns: Column<MarketplaceBuyerRow>[] = [
    { key: "username", label: "User", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "status", label: "Status", sortable: true },
    { key: "interestCount", label: "Interests", sortable: true },
    { key: "bidCount", label: "Bids", sortable: true },
    { key: "conversationCount", label: "Convos", sortable: true },
    { key: "closedDeals", label: "Closed", sortable: true },
    {
      key: "lastActivityAt",
      label: "Last activity",
      sortable: true,
      render: (v) =>
        v ? formatDistanceToNow(new Date(String(v)), { addSuffix: true }) : "—",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Buyers</h2>
          <p className="text-sm text-muted-foreground">
            Click a row to see startups they expressed interest in, bids, and
            conversations
          </p>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>
              {(error as Error).message}. Apply migration{" "}
              <code className="text-xs">
                20260701190000_admin_marketplace_participants
              </code>
              .
            </AlertDescription>
          </Alert>
        ) : null}

        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          searchable
          searchKeys={["username", "email", "fullName"]}
          emptyMessage="No buyer profiles in marketplace_profiles yet."
          onRowClick={(row) => setSelectedId(row.profileId)}
        />
      </div>

      <MarketplaceBuyerDetailSheet
        open={Boolean(selectedId)}
        onOpenChange={(open) => !open && setSelectedId(null)}
        detail={detail}
        loading={detailLoading}
      />
    </AdminLayout>
  );
}
