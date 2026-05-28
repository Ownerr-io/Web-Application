import { Link } from "wouter";
import { OwnerrOsAppPageShell } from "@/components/founder-os/OwnerrOsAppPageShell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOwnerrFounderRecords } from "@/hooks/founder-os/useOwnerrFounderRecords";
import { ownerrOsListingDetailPath } from "@/lib/ownerrOsRoutes";
import { PRODUCT_ROUTES } from "@/routing/routeRegistry";
import { OWNERR_OS_APP_CONTENT_CLASS } from "@/lib/ownerrOsAppLayout";
import { cn } from "@/lib/utils";

export default function OwnerrOsAppAnalyticsPage() {
  const { records, loading, totals } = useOwnerrFounderRecords();

  if (loading) {
    return (
      <div
        className={cn(
          OWNERR_OS_APP_CONTENT_CLASS,
          "flex min-h-[40vh] w-full items-center justify-center text-sm font-bold text-muted-foreground",
        )}
      >
        Loading analytics…
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <OwnerrOsAppPageShell
        title="Analytics"
        description="Complete a founder listing to unlock visit metrics."
      >
        <Link
          href={PRODUCT_ROUTES.ownerrOsListings}
          className="inline-flex text-sm font-bold text-primary hover:underline"
        >
          Create your first startup
        </Link>
      </OwnerrOsAppPageShell>
    );
  }

  return (
    <OwnerrOsAppPageShell
      title="Analytics"
      description="Performance across all startups in your workspace."
    >
      <dl className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-muted/20 p-5">
          <dt className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Startups
          </dt>
          <dd className="mt-2 text-3xl font-bold tabular-nums text-foreground">
            {records.length}
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-muted/20 p-5">
          <dt className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Profile visits
          </dt>
          <dd className="mt-2 text-3xl font-bold tabular-nums text-foreground">
            {totals.visits}
          </dd>
        </div>
      </dl>

      <div className="w-full space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          By startup
        </h2>
        <div className="w-full overflow-hidden rounded-xl border border-border bg-muted/20">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold">Startup</TableHead>
                <TableHead className="text-right font-bold">Visits</TableHead>
                <TableHead className="font-bold">Listed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/30"
                >
                  <TableCell className="font-semibold">
                    <Link
                      href={ownerrOsListingDetailPath(row.id)}
                      className="hover:text-primary hover:underline"
                    >
                      {row.startupName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.visitCount}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.createdAt
                      ? new Date(row.createdAt).toLocaleDateString()
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </OwnerrOsAppPageShell>
  );
}
