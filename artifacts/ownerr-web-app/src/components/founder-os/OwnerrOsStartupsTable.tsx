import { useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FounderSubmissionRecord } from "@/lib/founderTypes";
import { ownerrOsListingDetailPath } from "@/lib/ownerrOsRoutes";

type Props = {
  records: FounderSubmissionRecord[];
};

export function OwnerrOsStartupsTable({ records }: Props) {
  const [, navigate] = useLocation();

  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        No startups yet. Add your first listing to get started.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-bold">Startup</TableHead>
            <TableHead className="font-bold">Category</TableHead>
            <TableHead className="text-right font-bold">Visits</TableHead>
            <TableHead className="font-bold">Listed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((row) => {
            const listed = row.createdAt
              ? new Date(row.createdAt).toLocaleDateString()
              : "—";
            return (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => navigate(ownerrOsListingDetailPath(row.id))}
              >
                <TableCell className="font-semibold">
                  {row.startupName}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.category ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.visitCount}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {listed}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
