import { Link } from "wouter";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OwnerrOsAppPageShell } from "@/components/founder-os/OwnerrOsAppPageShell";
import { OwnerrOsStartupsTable } from "@/components/founder-os/OwnerrOsStartupsTable";
import { useOwnerrFounderRecords } from "@/hooks/founder-os/useOwnerrFounderRecords";
import { PRODUCT_ROUTES } from "@/routing/routeRegistry";
import { OWNERR_OS_APP_CONTENT_CLASS } from "@/lib/ownerrOsAppLayout";
import { cn } from "@/lib/utils";

export function OwnerrOsListingManager() {
  const { records, loading } = useOwnerrFounderRecords();

  if (loading) {
    return (
      <div
        className={cn(
          OWNERR_OS_APP_CONTENT_CLASS,
          "flex min-h-[40vh] items-center justify-center text-sm font-bold text-muted-foreground",
        )}
      >
        Loading startups…
      </div>
    );
  }

  return (
    <OwnerrOsAppPageShell
      title="My Startups"
      description="Manage all your OWNERR OS listings. Select a row to view details, referral tools, and edits."
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {records.length} startup{records.length === 1 ? "" : "s"} listed
        </p>
        <Button
          type="button"
          className="btn-platform-gradient font-bold"
          asChild
        >
          <Link href={PRODUCT_ROUTES.ownerrOsListingNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add startup
          </Link>
        </Button>
      </div>
      <OwnerrOsStartupsTable records={records} />
    </OwnerrOsAppPageShell>
  );
}
