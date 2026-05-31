import { formatDistanceToNow } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { OwnerrOsFounderDetail } from "@/lib/ownerr-os/adminFoundersTypes";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: OwnerrOsFounderDetail | null | undefined;
  loading: boolean;
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function FounderDetailSheet({
  open,
  onOpenChange,
  detail,
  loading,
}: Props) {
  const f = detail?.founder;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {loading || !f ? "Founder" : `${f.founderName} · ${f.startupName}`}
          </SheetTitle>
          <SheetDescription>
            Viral join submission — visits, signups, and referral events
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
        ) : !f ? (
          <p className="mt-6 text-sm text-muted-foreground">Not found.</p>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Visits" value={f.visitCount} />
              <Stat label="Signups" value={f.signupCount} />
              <Stat
                label="Conversion"
                value={
                  f.visitCount > 0
                    ? `${Math.round((f.signupCount / f.visitCount) * 1000) / 10}%`
                    : "—"
                }
              />
            </div>

            {f.tagline ? (
              <p className="text-sm text-muted-foreground italic">
                {f.tagline}
              </p>
            ) : null}

            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Referral code:</span>{" "}
                <code className="text-xs">{f.referralCode}</code>
              </p>
              {f.referralLink ? (
                <p className="break-all">
                  <span className="text-muted-foreground">Link:</span>{" "}
                  <a
                    href={f.referralLink}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2"
                  >
                    {f.referralLink}
                  </a>
                </p>
              ) : null}
              {f.website ? (
                <p>
                  <span className="text-muted-foreground">Website:</span>{" "}
                  <a
                    href={f.website}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    {f.website}
                  </a>
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Joined{" "}
                {formatDistanceToNow(new Date(f.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>

            {detail?.trafficBySource?.length ? (
              <div>
                <p className="text-sm font-medium mb-2">Traffic by source</p>
                <ul className="space-y-1 text-sm">
                  {detail.trafficBySource.map((t) => (
                    <li key={t.source} className="flex justify-between">
                      <span>{t.source}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {t.count}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {detail?.osListings?.length ? (
              <div>
                <p className="text-sm font-medium mb-2">Linked OS listings</p>
                <ul className="space-y-2 text-sm">
                  {detail.osListings.map((l) => (
                    <li key={l.id} className="flex justify-between gap-2">
                      <span className="truncate">{l.title}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {l.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {detail?.recentEvents?.length ? (
              <div>
                <p className="text-sm font-medium mb-2">Recent events</p>
                <ul className="max-h-48 overflow-y-auto space-y-2 text-xs">
                  {detail.recentEvents.map((e, i) => (
                    <li
                      key={`${e.createdAt}-${i}`}
                      className="flex justify-between gap-2 border-b border-border/50 pb-1"
                    >
                      <span>
                        {e.eventType}
                        {e.sourcePlatform ? ` · ${e.sourcePlatform}` : ""}
                      </span>
                      <span className="text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(e.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No referral events recorded yet for this founder.
              </p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
