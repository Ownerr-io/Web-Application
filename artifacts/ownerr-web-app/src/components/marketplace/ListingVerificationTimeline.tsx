import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Shield } from "lucide-react";
import {
  fetchPublicVerificationTimeline,
  type PublicVerificationTimeline,
} from "@/lib/intelligence/listingVerificationApi";
import { formatShortCurrency, cn } from "@/lib/utils";

function TimelineRow({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail?: string | null;
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-2 border-b border-border py-2 last:border-0">
      <span className="text-sm font-medium">{label}</span>
      <div className="text-right">
        <span
          className={cn(
            "text-xs font-semibold uppercase",
            ok
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground",
          )}
        >
          {ok ? "Verified" : "Not verified"}
        </span>
        {detail ? (
          <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
        ) : null}
      </div>
    </li>
  );
}

export function ListingVerificationTimeline({
  startupSlug,
}: {
  startupSlug: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["listing-verification-timeline", startupSlug],
    queryFn: () => fetchPublicVerificationTimeline(startupSlug),
  });

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading verification timeline…
      </p>
    );
  }

  if (!data?.is_public) {
    return null;
  }

  return <TimelineContent data={data} />;
}

function TimelineContent({ data }: { data: PublicVerificationTimeline }) {
  const b = data.badges;
  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-brand-lime" aria-hidden />
        <h2 className="text-lg font-bold">Verification timeline</h2>
        {b.marketplace_published ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <BadgeCheck className="h-3.5 w-3.5" />
            Verified listing
          </span>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Trust score{" "}
        <span className="font-mono font-semibold text-foreground">
          {data.trust?.score ?? 0}
        </span>{" "}
        ({data.trust?.level ?? "unverified"}) — from verified evidence only.
      </p>
      <ul className="divide-y divide-border rounded-lg border border-border bg-muted/10 px-3">
        <TimelineRow
          label="Founder verification"
          ok={b.founder_verified}
          detail={
            data.identity_verified_at
              ? `Verified ${new Date(data.identity_verified_at).toLocaleDateString()}`
              : null
          }
        />
        <TimelineRow
          label="Domain ownership"
          ok={b.domain_verified}
          detail={data.verified_domain ?? undefined}
        />
        <TimelineRow
          label="Revenue (provider sync)"
          ok={b.revenue_verified}
          detail={
            data.verified_revenue_amount != null &&
            data.verified_revenue_amount > 0
              ? `Verified revenue ${formatShortCurrency(data.verified_revenue_amount)}${data.revenue_source_provider ? ` (${data.revenue_source_provider})` : ""}`
              : data.verified_mrr != null && data.verified_mrr > 0
                ? `Verified revenue ${formatShortCurrency(data.verified_mrr)}`
                : undefined
          }
        />
      </ul>
      {data.published_at ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Published to marketplace{" "}
          {new Date(data.published_at).toLocaleString()}
        </p>
      ) : null}
    </section>
  );
}
