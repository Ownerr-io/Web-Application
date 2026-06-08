import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { fetchListingVerificationSnapshotBySlug } from "@/lib/intelligence/listingVerificationApi";
import { fetchStartupTrustPublic } from "@/lib/intelligence/trustApi";
import { ListingVerificationHub } from "@/components/marketplace/ListingVerificationHub";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";
import {
  countVerifiedGates,
  gateBadgeClass,
  gateStatusTone,
  gatesTotal,
  LISTING_LIFECYCLE_LABEL,
  MANDATORY_VERIFICATION_GATE_ROWS,
  verifiedRevenueAmountFromGates,
} from "@/lib/marketplace/verificationDesk";
import { cn } from "@/lib/utils";

type Props = {
  startupSlug: string;
  /** Full hub on seller company workspace; compact summary elsewhere. */
  variant?: "full" | "compact";
};

function CompactVerificationSummary({
  startupSlug,
  trustScore,
  trustLevel,
}: {
  startupSlug: string;
  trustScore: number;
  trustLevel: string;
}) {
  const { data: snapshot, isLoading } = useQuery({
    queryKey: ["listing-verification-snapshot", startupSlug],
    queryFn: () => fetchListingVerificationSnapshotBySlug(startupSlug),
  });

  const gates = snapshot?.gates;
  const verifiedCount = gates ? countVerifiedGates(gates) : 0;
  const lifecycle = snapshot?.listing_lifecycle;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Trust score{" "}
        <span className="font-mono font-semibold text-foreground">
          {trustScore}
        </span>{" "}
        ({trustLevel})
        {lifecycle ? (
          <>
            {" "}
            · Listing{" "}
            <span className="font-medium text-foreground">
              {LISTING_LIFECYCLE_LABEL[lifecycle] ?? lifecycle}
            </span>
          </>
        ) : null}
      </p>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading verification…</p>
      ) : !gates ? (
        <p className="text-sm text-muted-foreground">
          Verification not started. Open your company workspace to connect
          providers and complete gates.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {verifiedCount}/{gatesTotal()} gates verified
            {verifiedRevenueAmountFromGates(gates) != null
              ? ` · Verified revenue $${verifiedRevenueAmountFromGates(gates)!.toLocaleString()}`
              : ""}
          </p>
          <ul className="space-y-2 rounded-lg border border-border bg-muted/10 p-3 text-sm">
            {MANDATORY_VERIFICATION_GATE_ROWS.map((row) => {
              const status = gates[row.key];
              const tone = gateStatusTone(status);
              return (
                <li key={row.key} className="flex justify-between gap-2">
                  <span>{row.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
                      gateBadgeClass(tone),
                    )}
                  >
                    {status.replace(/_/g, " ")}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <Button variant="secondary" size="sm" asChild>
        <Link href={MARKETPLACE_ROUTES.sellerVerificationDetail(startupSlug)}>
          Open company verification
        </Link>
      </Button>
    </div>
  );
}

export function StartupVerificationCenter({
  startupSlug,
  variant = "full",
}: Props) {
  const { data: trust } = useQuery({
    queryKey: ["startup-trust", startupSlug],
    queryFn: () => fetchStartupTrustPublic(startupSlug),
  });

  if (variant === "full") {
    return <ListingVerificationHub startupSlug={startupSlug} />;
  }

  return (
    <CompactVerificationSummary
      startupSlug={startupSlug}
      trustScore={trust?.score ?? 0}
      trustLevel={trust?.level ?? "unverified"}
    />
  );
}
