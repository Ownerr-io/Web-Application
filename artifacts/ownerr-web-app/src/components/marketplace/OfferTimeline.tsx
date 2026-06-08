import type { BidVersion } from "@/lib/marketplace/types";
import { formatCurrency } from "@/lib/utils";

export function OfferTimeline({ versions }: { versions: BidVersion[] }) {
  if (!versions.length) return null;
  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        Negotiation history
      </p>
      <ul className="space-y-2">
        {versions.map((v) => (
          <li key={v.versionNumber} className="flex gap-2 text-xs">
            <span className="shrink-0 font-mono text-muted-foreground w-6">
              {v.versionNumber}
            </span>
            <div>
              <span className="font-medium capitalize">{v.actorRole}</span>
              {" · "}
              <span className="tabular-nums font-semibold">
                {formatCurrency(v.amount)}
              </span>
              {v.message ? (
                <p className="text-muted-foreground mt-0.5">{v.message}</p>
              ) : null}
              <p className="text-[10px] text-muted-foreground">
                {new Date(v.createdAt).toLocaleString()}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
