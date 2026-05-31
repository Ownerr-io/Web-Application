import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { AdminLayout } from "@/pages/admin/layout";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { MarketplaceSellerDetailSheet } from "@/components/admin/marketplace/MarketplaceParticipantSheets";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAdminPageView } from "@/lib/admin/useAdminPageView";
import {
  fetchAdminMarketplaceSellerDetail,
  fetchAdminMarketplaceSellers,
} from "@/lib/marketplace/adminParticipantsApi";
import type { MarketplaceSellerRow } from "@/lib/marketplace/adminParticipantsTypes";

export default function MarketplaceAdminSellersPage() {
  useAdminPageView("sellers");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin", "marketplace", "sellers"],
    queryFn: fetchAdminMarketplaceSellers,
    staleTime: 60_000,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["admin", "marketplace", "seller", selectedId],
    queryFn: () => fetchAdminMarketplaceSellerDetail(selectedId!),
    enabled: Boolean(selectedId),
  });

  const columns: Column<MarketplaceSellerRow>[] = [
    { key: "username", label: "User", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "status", label: "Status", sortable: true },
    { key: "listingCount", label: "Listings", sortable: true },
    { key: "publishedCount", label: "Published", sortable: true },
    { key: "inboundInterests", label: "Interests in", sortable: true },
    { key: "inboundBids", label: "Bids in", sortable: true },
    { key: "pendingVerifications", label: "Verifications", sortable: true },
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
          <h2 className="text-2xl font-bold tracking-tight">Sellers</h2>
          <p className="text-sm text-muted-foreground">
            Click a row to see companies they list and inbound deal activity
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
          emptyMessage="No seller profiles in marketplace_profiles yet."
          onRowClick={(row) => setSelectedId(row.profileId)}
        />
      </div>

      <MarketplaceSellerDetailSheet
        open={Boolean(selectedId)}
        onOpenChange={(open) => !open && setSelectedId(null)}
        detail={detail}
        loading={detailLoading}
      />
    </AdminLayout>
  );
}
