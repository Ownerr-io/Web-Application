import { gateStatusTone } from "@/lib/marketplace/verificationDesk";
import type { ListingVerificationGates } from "@/lib/intelligence/listingVerificationApi";
import { cn } from "@/lib/utils";

type Props = {
  gates: Pick<
    ListingVerificationGates,
    "revenue_status" | "domain_status" | "identity_status"
  >;
  className?: string;
};

/** Revenue · domain · identity */
export function SellerCompanyGateDots({ gates, className }: Props) {
  const items = [
    gates.revenue_status,
    gates.domain_status,
    gates.identity_status,
  ];
  return (
    <div
      className={cn("flex items-center gap-1", className)}
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
              tone === "skipped" && "bg-muted-foreground/20",
            )}
          />
        );
      })}
    </div>
  );
}
