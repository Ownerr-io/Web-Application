import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketplaceAppPageShell } from "@/components/marketplace/MarketplaceAppPageShell";
import { MarketplaceProfileAccountSection } from "@/components/marketplace/MarketplaceProfileAccountSection";
import { AccountChangePasswordSection } from "@/components/auth/AccountChangePasswordSection";
import {
  MarketplaceDeskKpiCard,
  MarketplaceDeskStat,
  marketplaceDeskCardClass,
  marketplaceDeskKpiValueClass,
} from "@/components/marketplace/MarketplaceDeskUi";
import { useAuth } from "@/context/AuthContext";
import { founderAvatarUrl, cn } from "@/lib/utils";

export default function SellerProfilePage() {
  const { currentUser } = useAuth();
  const email = currentUser?.email ?? "";
  const displayName = currentUser?.name ?? "Account";
  const avatarSrc = founderAvatarUrl(
    currentUser?.avatarSeed ?? currentUser?.id ?? "founder",
  );

  return (
    <MarketplaceAppPageShell
      kicker="Seller desk"
      title="Profile"
      description="Your seller desk identity and account"
    >
      <section
        className={cn(
          marketplaceDeskCardClass,
          "flex flex-col gap-4 rounded-xl p-5 sm:flex-row sm:items-center",
        )}
      >
        <img
          src={avatarSrc}
          alt=""
          className="h-16 w-16 shrink-0 rounded-full border border-[color:var(--terminal-border)] object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-foreground">{displayName}</p>
          {email ? (
            <p className="text-sm text-muted-foreground">{email}</p>
          ) : null}
          <p className="brand-eyebrow mt-1 text-[10px]">Seller desk</p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className={cn(marketplaceDeskCardClass, "md:col-span-2 shadow-none")}
        >
          <CardHeader className="pb-3">
            <CardTitle className="brand-eyebrow text-xs font-bold tracking-widest">
              Desk snapshot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <MarketplaceDeskStat
                label="Open listings"
                value="2"
                valueClassName={marketplaceDeskKpiValueClass(0)}
              />
              <MarketplaceDeskStat
                label="Avg reply time"
                value="6h"
                valueClassName={marketplaceDeskKpiValueClass(1)}
              />
              <MarketplaceDeskStat
                label="Verification rate"
                value="83%"
                valueClassName={marketplaceDeskKpiValueClass(2)}
              />
            </div>
          </CardContent>
        </Card>
        <MarketplaceDeskKpiCard title="Founder details">
          <div className="space-y-2 text-sm">
            {[
              "Primary vertical: AI SaaS",
              "Current stage: Negotiation-ready",
              "Preferred buyer type: Strategic",
              "Due diligence window: 2-3 weeks",
            ].map((line) => (
              <p
                key={line}
                className="brand-panel-card overflow-hidden rounded-xl border px-3 py-2 shadow-none"
              >
                {line}
              </p>
            ))}
          </div>
        </MarketplaceDeskKpiCard>
      </div>

      <MarketplaceProfileAccountSection showIdentity={false} />
      <AccountChangePasswordSection className="mt-6" />
    </MarketplaceAppPageShell>
  );
}
