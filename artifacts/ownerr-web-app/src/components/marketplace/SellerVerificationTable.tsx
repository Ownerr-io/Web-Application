import { useQueries } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { DeleteListingButton } from "@/components/marketplace/DeleteListingButton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchListingVerificationSnapshotBySlug } from "@/lib/intelligence/listingVerificationApi";
import type { MarketplaceListing } from "@/lib/marketplace/types";
import {
  countVerifiedGates,
  gateStatusTone,
  gatesTotal,
  LISTING_LIFECYCLE_LABEL,
  summarizeVerificationGates,
  verifiedRevenueAmountFromGates,
} from "@/lib/marketplace/verificationDesk";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";
import { cn, formatShortCurrency } from "@/lib/utils";

type Props = {
  listings: MarketplaceListing[];
};

function GateDotsFromGates({
  gates,
}: {
  gates: {
    identity_status: string;
    domain_status: string;
    revenue_status: string;
  };
}) {
  const items = [
    gates.revenue_status,
    gates.domain_status,
    gates.identity_status,
  ];
  return (
    <div
      className="flex items-center gap-1"
      title="Revenue · Domain · Identity"
    >
      {items.map((status, i) => {
        const tone = gateStatusTone(status);
        return (
          <span
            key={i}
            className={cn(
              "h-2 w-2 rounded-full",
              tone === "ok" && "bg-emerald-500",
              tone === "bad" && "bg-destructive",
              tone === "pending" && "bg-muted-foreground/35",
            )}
          />
        );
      })}
    </div>
  );
}

export function SellerVerificationTable({ listings }: Props) {
  const [, setLocation] = useLocation();

  const snapshotQueries = useQueries({
    queries: listings.map((listing) => ({
      queryKey: ["listing-verification-snapshot", listing.slug],
      queryFn: () => fetchListingVerificationSnapshotBySlug(listing.slug),
      staleTime: 30_000,
    })),
  });

  const snapshotBySlug = new Map(
    listings.map((listing, i) => [listing.slug, snapshotQueries[i]]),
  );

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
          {listings.map((listing) => {
            const q = snapshotBySlug.get(listing.slug);
            const snapshot = q?.data;
            const loading = q?.isLoading;
            const href = MARKETPLACE_ROUTES.sellerVerificationDetail(
              listing.slug,
            );

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
                  {loading ? (
                    <Skeleton className="h-5 w-24" />
                  ) : snapshot ? (
                    <span className="inline-flex rounded-md bg-muted/50 px-2 py-0.5 text-xs font-medium capitalize">
                      {LISTING_LIFECYCLE_LABEL[snapshot.listing_lifecycle]}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {loading ? (
                    <Skeleton className="h-4 w-20" />
                  ) : snapshot ? (
                    <div className="flex flex-col gap-1">
                      <GateDotsFromGates gates={snapshot.gates} />
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {countVerifiedGates(snapshot.gates)}/{gatesTotal()}{" "}
                        verified
                      </span>
                      {(() => {
                        const { failed } = summarizeVerificationGates(
                          snapshot.gates,
                        );
                        if (failed.length === 0) return null;
                        return (
                          <span className="text-[10px] text-destructive line-clamp-2">
                            Fix: {failed.map((f) => f.label).join(", ")}
                          </span>
                        );
                      })()}
                    </div>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell tabular-nums text-muted-foreground">
                  {loading ? (
                    <Skeleton className="h-4 w-16" />
                  ) : (
                    (() => {
                      const v = snapshot
                        ? verifiedRevenueAmountFromGates(snapshot.gates)
                        : null;
                      return v != null
                        ? formatShortCurrency(v)
                        : formatShortCurrency(listing.revenue);
                    })()
                  )}
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
