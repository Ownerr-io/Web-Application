import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  fetchListingVerificationSnapshotBySlug,
  submitListingForVerification,
  type ListingLifecycle,
} from "@/lib/intelligence/listingVerificationApi";
import { invalidateSellerDeskQueries } from "@/lib/marketplace/invalidateSellerDeskQueries";
import { cn } from "@/lib/utils";

const LIFECYCLE_LABEL: Record<ListingLifecycle, string> = {
  draft: "Draft",
  verification_required: "Verification required",
  verification_in_progress: "Verification in progress",
  verification_failed: "Verification failed",
  verification_review: "Under review",
  verified: "Verified — publishing…",
  published: "Published on marketplace",
  suspended: "Suspended",
  under_contract: "Under contract — offer accepted",
};

export function ListingLifecycleBanner({
  startupSlug,
}: {
  startupSlug: string;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["listing-verification-snapshot", startupSlug],
    queryFn: () => fetchListingVerificationSnapshotBySlug(startupSlug),
    refetchInterval: (q) =>
      q.state.data?.listing_lifecycle === "verification_in_progress"
        ? 5000
        : false,
  });

  const submitMut = useMutation({
    mutationFn: () => submitListingForVerification(startupSlug),
    onSuccess: () => {
      toast({
        title: "Verification started",
        description: "Complete all automated checks below.",
      });
      invalidateSellerDeskQueries(qc);
      void qc.invalidateQueries({
        queryKey: ["listing-verification-snapshot", startupSlug],
      });
    },
    onError: (e: Error) =>
      toast({
        title: "Could not start",
        description: e.message,
        variant: "destructive",
      }),
  });

  if (isLoading || !data) return null;

  const lc = data.listing_lifecycle;
  const isPublic = lc === "published";

  return (
    <div
      className={cn(
        "rounded-xl border p-4 space-y-3",
        isPublic
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-border bg-muted/15",
      )}
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Listing status
        </p>
        <p className="text-lg font-semibold">{LIFECYCLE_LABEL[lc]}</p>
        {!isPublic ? (
          <p className="text-sm text-muted-foreground mt-1">
            When all verification gates pass, your listing publishes
            automatically — no admin approval. High-risk fraud flags may pause
            auto-publish.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mt-1">
            Live on the public marketplace with verified evidence only.
          </p>
        )}
      </div>
      <GateChecklist gates={data.gates} fraudRisk={data.gates.fraud_risk} />
      <div className="flex flex-wrap gap-2">
        {lc === "draft" ||
        lc === "verification_required" ||
        lc === "verification_failed" ? (
          <Button
            size="sm"
            onClick={() => submitMut.mutate()}
            disabled={submitMut.isPending}
          >
            Start verification
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function GateChecklist({
  gates,
  fraudRisk,
}: {
  gates: {
    identity_status: string;
    domain_status: string;
    business_email_status: string;
    revenue_status: string;
    registration_status: string;
  };
  fraudRisk?: string;
}) {
  const items = [
    { label: "Founder verification", status: gates.identity_status },
    { label: "Domain", status: gates.domain_status },
    { label: "Business email", status: gates.business_email_status },
    { label: "Revenue sync", status: gates.revenue_status },
  ];
  return (
    <div className="space-y-2">
      {fraudRisk && fraudRisk !== "clear" ? (
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
          Fraud scan: {fraudRisk.replace(/_/g, " ")}
          {fraudRisk === "high_risk"
            ? " — auto-publish blocked until cleared"
            : ""}
        </p>
      ) : null}
      <ul className="grid gap-1 sm:grid-cols-2 text-xs">
        {items.map((item) => (
          <li
            key={item.label}
            className="flex justify-between gap-2 rounded-md bg-background/60 px-2 py-1"
          >
            <span>{item.label}</span>
            <span className="font-semibold capitalize">
              {item.status.replace(/_/g, " ")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
