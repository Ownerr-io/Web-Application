import { ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { DeleteListingButton } from "@/components/marketplace/DeleteListingButton";
import { SellerCompanyGateDots } from "@/components/marketplace/SellerCompanyGateDots";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SellerCompanyRow } from "@/lib/marketplace/sellerCompanyApi";
import {
  gatesTotal,
  LISTING_LIFECYCLE_LABEL,
  summarizeVerificationGates,
} from "@/lib/marketplace/verificationDesk";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";
import { formatShortCurrency } from "@/lib/utils";
import {
  displayVerifiedMrr,
  lifecycleLabel,
  verifiedGateCount,
} from "@/lib/marketplace/sellerCompanyApi";

type Props = {
  companies: SellerCompanyRow[];
};

export function SellerCompaniesTable({ companies }: Props) {
  const [, setLocation] = useLocation();

  return (
    <div className="brand-panel-card overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">Company</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Gates</TableHead>
            <TableHead className="hidden sm:table-cell">Verified MRR</TableHead>
            <TableHead className="hidden md:table-cell text-right">
              Trust
            </TableHead>
            <TableHead className="w-[7rem] text-right pr-4">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map(({ listing, snapshot }) => {
            const href = MARKETPLACE_ROUTES.sellerCompanyDetail(listing.slug);
            const gates = snapshot?.gates;
            const lc = lifecycleLabel({ listing, snapshot });
            const mrr = displayVerifiedMrr({ listing, snapshot });
            const failed = gates
              ? summarizeVerificationGates(gates).failed
              : [];

            return (
              <TableRow
                key={listing.slug}
                className="cursor-pointer"
                tabIndex={0}
                role="link"
                onClick={() => setLocation(href)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setLocation(href);
                  }
                }}
              >
                <TableCell className="pl-4 font-medium">
                  <div className="min-w-0">
                    <p className="truncate">{listing.name}</p>
                    <p className="text-xs font-normal text-muted-foreground truncate">
                      {listing.slug}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex rounded-md bg-muted/50 px-2 py-0.5 text-xs font-medium capitalize">
                    {LISTING_LIFECYCLE_LABEL[lc]}
                  </span>
                </TableCell>
                <TableCell>
                  {gates ? (
                    <div className="flex flex-col gap-1">
                      <SellerCompanyGateDots gates={gates} />
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {verifiedGateCount({ listing, snapshot })}/
                        {gatesTotal()} verified
                      </span>
                      {failed.length > 0 ? (
                        <span className="text-[10px] text-destructive line-clamp-2">
                          Fix: {failed.map((f) => f.label).join(", ")}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Loading…
                    </span>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell tabular-nums text-muted-foreground">
                  {mrr != null ? formatShortCurrency(mrr) : "Not verified"}
                </TableCell>
                <TableCell className="hidden md:table-cell text-right tabular-nums">
                  {listing.trustScore ?? "—"}
                </TableCell>
                <TableCell className="pr-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <DeleteListingButton
                      slug={listing.slug}
                      listingName={listing.name}
                      size="icon"
                      showIcon
                      label=""
                      className="h-8 w-8 shrink-0"
                      variant="ghost"
                    />
                    <ChevronRight
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
