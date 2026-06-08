import type {
  ListingLifecycle,
  ListingVerificationGates,
} from "@/lib/intelligence/listingVerificationApi";

export const LISTING_LIFECYCLE_LABEL: Record<ListingLifecycle, string> = {
  draft: "Draft",
  verification_required: "Verification required",
  verification_in_progress: "In progress",
  verification_failed: "Failed",
  verification_review: "Under review",
  verified: "Verified",
  published: "Published",
  suspended: "Suspended",
  under_contract: "Under contract",
};

/** Gates required for auto-publish (person founder + company evidence). */
export const MANDATORY_VERIFICATION_GATE_ROWS: {
  key: keyof Pick<
    ListingVerificationGates,
    | "identity_status"
    | "domain_status"
    | "business_email_status"
    | "revenue_status"
  >;
  label: string;
  step: number;
}[] = [
  { step: 1, key: "identity_status", label: "Founder verification (person)" },
  { step: 2, key: "domain_status", label: "Domain ownership" },
  { step: 3, key: "business_email_status", label: "Business email" },
  { step: 4, key: "revenue_status", label: "Revenue (provider sync)" },
];

/** @deprecated Use MANDATORY_VERIFICATION_GATE_ROWS — registration not required yet. */
export const VERIFICATION_GATE_ROWS = MANDATORY_VERIFICATION_GATE_ROWS;

export function countVerifiedGates(gates: ListingVerificationGates): number {
  let n = 0;
  for (const row of MANDATORY_VERIFICATION_GATE_ROWS) {
    if (gates[row.key] === "verified") n += 1;
  }
  return n;
}

export function gatesTotal(): number {
  return MANDATORY_VERIFICATION_GATE_ROWS.length;
}

/** Normalized gate revenue (falls back to legacy verified_mrr). */
export function verifiedRevenueAmountFromGates(
  gates: Pick<
    ListingVerificationGates,
    "verified_revenue_amount" | "verified_mrr"
  >,
): number | null {
  if (
    gates.verified_revenue_amount != null &&
    gates.verified_revenue_amount > 0
  ) {
    return gates.verified_revenue_amount;
  }
  if (gates.verified_mrr != null && gates.verified_mrr > 0)
    return gates.verified_mrr;
  return null;
}

export function gateNeedsSellerAction(status: string): boolean {
  return status !== "verified" && status !== "not_required";
}

export type GateSummaryItem = { label: string; detail?: string };

export function summarizeVerificationGates(gates: ListingVerificationGates): {
  verified: GateSummaryItem[];
  failed: GateSummaryItem[];
  pending: GateSummaryItem[];
} {
  const verified: GateSummaryItem[] = [];
  const failed: GateSummaryItem[] = [];
  const pending: GateSummaryItem[] = [];

  for (const row of MANDATORY_VERIFICATION_GATE_ROWS) {
    const status = gates[row.key];
    const detail = gateDetailForRow(row.key, gates, status);
    const item = { label: row.label, detail };

    if (status === "verified") verified.push(item);
    else if (status === "failed") failed.push(item);
    else pending.push(item);
  }

  return { verified, failed, pending };
}

function gateDetailForRow(
  key: (typeof MANDATORY_VERIFICATION_GATE_ROWS)[number]["key"],
  gates: ListingVerificationGates,
  status: string,
): string | undefined {
  if (status === "verified") {
    switch (key) {
      case "revenue_status": {
        const amt =
          gates.verified_revenue_amount != null &&
          gates.verified_revenue_amount > 0
            ? gates.verified_revenue_amount
            : gates.verified_mrr;
        if (amt == null || amt <= 0) return undefined;
        const cur = gates.revenue_currency ?? "USD";
        const label = gates.revenue_source_provider
          ? ` ${gates.revenue_source_provider}`
          : "";
        return `${new Intl.NumberFormat(undefined, { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(amt)} verified${label}`;
      }
      case "domain_status":
        return gates.verified_domain ?? undefined;
      default:
        return undefined;
    }
  }
  if (status === "failed") {
    switch (key) {
      case "revenue_status":
        return "Sync failed or verified revenue not detected — reconnect or validate again";
      case "domain_status":
        return "DNS record missing or incorrect";
      case "identity_status":
        return "Complete founder verification in the Verification desk";
      default:
        return undefined;
    }
  }
  if (status === "partial") {
    return "Connected but verified revenue is still zero or sync is stale (30 days)";
  }
  return undefined;
}

export function formatValidateAllToast(gates: ListingVerificationGates): {
  title: string;
  description: string;
} {
  const { verified, failed, pending } = summarizeVerificationGates(gates);
  const n = verified.length;
  const total = gatesTotal();

  if (n === total) {
    return {
      title: "All checks verified",
      description: "Your listing will go live automatically.",
    };
  }

  const onlyFounderPending =
    pending.length === 1 &&
    pending[0]?.label === "Founder verification (person)" &&
    failed.length === 0 &&
    verified.length === total - 1;

  if (onlyFounderPending) {
    return {
      title: "Almost there — founder profile",
      description:
        "Company checks are done. Open Verification in the sidebar, complete your founder profile (name, country, LinkedIn), then run Validate all checks again.",
    };
  }

  const parts: string[] = [`${n}/${total} verified`];
  if (failed.length > 0) {
    parts.push(`Fix: ${failed.map((f) => f.label).join(", ")}`);
  }
  if (pending.length > 0) {
    parts.push(`Remaining: ${pending.map((p) => p.label).join(", ")}`);
  }

  return {
    title: failed.length > 0 ? "Some checks failed" : "Checks updated",
    description: parts.join(" · "),
  };
}

export function gateStatusTone(
  status: string,
): "ok" | "bad" | "pending" | "skipped" {
  if (status === "verified") return "ok";
  if (status === "failed") return "bad";
  if (status === "not_required") return "skipped";
  return "pending";
}

export function gateBadgeClass(
  tone: ReturnType<typeof gateStatusTone>,
): string {
  if (tone === "ok")
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (tone === "bad") return "bg-destructive/15 text-destructive";
  if (tone === "skipped") return "bg-muted/80 text-muted-foreground";
  return "bg-muted text-muted-foreground";
}
