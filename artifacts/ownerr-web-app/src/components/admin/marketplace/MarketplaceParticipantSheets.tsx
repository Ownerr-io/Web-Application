import type { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatDistanceToNow } from "date-fns";
import type {
  MarketplaceBuyerDetail,
  MarketplaceSellerDetail,
} from "@/lib/marketplace/adminParticipantsTypes";

function fmtDate(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

export function MarketplaceBuyerDetailSheet({
  open,
  onOpenChange,
  detail,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: MarketplaceBuyerDetail | null | undefined;
  loading: boolean;
}) {
  const p = detail?.profile;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Buyer profile</SheetTitle>
          <SheetDescription>
            Interests, bids, and conversations from live marketplace tables
          </SheetDescription>
        </SheetHeader>
        {loading ? (
          <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
        ) : !p ? (
          <p className="mt-6 text-sm text-muted-foreground">Buyer not found.</p>
        ) : (
          <div className="mt-6 space-y-6 text-sm">
            <section className="space-y-1">
              <p className="font-semibold">{p.fullName || p.username}</p>
              <p className="text-muted-foreground">{p.email || "—"}</p>
              <p>
                Status: <span className="font-medium">{p.status}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Joined {fmtDate(p.createdAt)}
              </p>
            </section>

            <DetailSection title={`Interests (${detail!.interests.length})`}>
              {detail!.interests.length === 0 ? (
                <EmptyLine />
              ) : (
                <ul className="divide-y rounded-md border">
                  {detail!.interests.map((i) => (
                    <li key={i.interestId} className="px-3 py-2">
                      <p className="font-medium">{i.startupTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.status} · {i.industry ?? "—"} ·{" "}
                        {fmtDate(i.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </DetailSection>

            <DetailSection title={`Bids (${detail!.bids.length})`}>
              {detail!.bids.length === 0 ? (
                <EmptyLine />
              ) : (
                <ul className="divide-y rounded-md border">
                  {detail!.bids.map((b) => (
                    <li key={b.bidId} className="px-3 py-2">
                      <p className="font-medium">{b.startupTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.currency} {Number(b.amount).toLocaleString()} ·{" "}
                        {b.status} · {fmtDate(b.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </DetailSection>

            <DetailSection
              title={`Conversations (${detail!.conversations.length})`}
            >
              {detail!.conversations.length === 0 ? (
                <EmptyLine />
              ) : (
                <ul className="divide-y rounded-md border">
                  {detail!.conversations.map((c) => (
                    <li key={c.conversationId} className="px-3 py-2">
                      <p className="font-medium">{c.startupTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.status} · {fmtDate(c.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </DetailSection>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function MarketplaceSellerDetailSheet({
  open,
  onOpenChange,
  detail,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: MarketplaceSellerDetail | null | undefined;
  loading: boolean;
}) {
  const p = detail?.profile;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Seller profile</SheetTitle>
          <SheetDescription>
            Listings they publish and verification requests
          </SheetDescription>
        </SheetHeader>
        {loading ? (
          <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
        ) : !p ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Seller not found.
          </p>
        ) : (
          <div className="mt-6 space-y-6 text-sm">
            <section className="space-y-1">
              <p className="font-semibold">{p.fullName || p.username}</p>
              <p className="text-muted-foreground">{p.email || "—"}</p>
              <p>
                Status: <span className="font-medium">{p.status}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Joined {fmtDate(p.createdAt)}
              </p>
            </section>

            <DetailSection title={`Listings (${detail!.listings.length})`}>
              {detail!.listings.length === 0 ? (
                <EmptyLine />
              ) : (
                <ul className="divide-y rounded-md border">
                  {detail!.listings.map((l) => (
                    <li key={l.sellerListingId} className="px-3 py-2">
                      <p className="font-medium">{l.startupTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        Listing {l.listingStatus} · Startup {l.startupStatus} ·{" "}
                        {l.interestCount} interests · {l.bidCount} bids
                      </p>
                      {l.publishedAt ? (
                        <p className="text-xs text-muted-foreground">
                          Published {fmtDate(l.publishedAt)}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </DetailSection>

            <DetailSection
              title={`Verification requests (${detail!.verificationRequests.length})`}
            >
              {detail!.verificationRequests.length === 0 ? (
                <EmptyLine />
              ) : (
                <ul className="divide-y rounded-md border">
                  {detail!.verificationRequests.map((v) => (
                    <li key={v.requestId} className="px-3 py-2">
                      <p className="font-medium">{v.startupTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {v.status} · {fmtDate(v.submittedAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </DetailSection>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        {title}
      </h3>
      {children}
    </section>
  );
}

function EmptyLine() {
  return <p className="text-muted-foreground text-xs">No records yet.</p>;
}
