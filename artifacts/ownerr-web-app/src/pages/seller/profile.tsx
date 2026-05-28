import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketplaceProfileAccountSection } from "@/components/marketplace/MarketplaceProfileAccountSection";
import { useAuth } from "@/context/AuthContext";
import { founderAvatarUrl } from "@/lib/utils";

export default function SellerProfilePage() {
  const { currentUser } = useAuth();
  const email = currentUser?.email ?? "";
  const displayName = currentUser?.name ?? "Account";
  const avatarSrc = founderAvatarUrl(
    currentUser?.avatarSeed ?? currentUser?.id ?? "founder",
  );

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your seller desk identity and account
        </p>
      </header>

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center">
        <img
          src={avatarSrc}
          alt=""
          className="h-16 w-16 shrink-0 rounded-full border border-border object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-foreground">{displayName}</p>
          {email ? (
            <p className="text-sm text-muted-foreground">{email}</p>
          ) : null}
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Seller desk
          </p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Desk snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Open Listings
                </p>
                <p className="mt-1 text-lg font-bold">2</p>
              </div>
              <div className="rounded-lg border border-border px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Avg Reply Time
                </p>
                <p className="mt-1 text-lg font-bold">6h</p>
              </div>
              <div className="rounded-lg border border-border px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Verification Rate
                </p>
                <p className="mt-1 text-lg font-bold">83%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Founder details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="rounded-md border border-border px-3 py-2">
              Primary vertical: AI SaaS
            </p>
            <p className="rounded-md border border-border px-3 py-2">
              Current stage: Negotiation-ready
            </p>
            <p className="rounded-md border border-border px-3 py-2">
              Preferred buyer type: Strategic
            </p>
            <p className="rounded-md border border-border px-3 py-2">
              Due diligence window: 2-3 weeks
            </p>
          </CardContent>
        </Card>
      </div>

      <MarketplaceProfileAccountSection showIdentity={false} />
    </div>
  );
}
