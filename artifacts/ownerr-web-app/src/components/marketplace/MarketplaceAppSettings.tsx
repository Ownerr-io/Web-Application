import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { syncMarketplaceDeskRoleForPath } from '@/lib/auth/syncMarketplaceDeskRole';
import type { AuthRole } from '@/lib/auth/types';
import { marketplaceWorkspaceForRole } from '@/routing/navigationRegistry';
import { AUTH_ROUTES, MARKETPLACE_ROUTES } from '@/routing/routeRegistry';

type DeskView = 'buyer' | 'seller';

function activeDeskFromPath(path: string, fallback: AuthRole | null): DeskView {
  if (path.includes('/marketplace/app/seller')) return 'seller';
  if (path.includes('/marketplace/app/buyer')) return 'buyer';
  return fallback === 'buyer' ? 'buyer' : 'seller';
}

const BUYER_LINKS = [
  { href: MARKETPLACE_ROUTES.buyerDashboard, label: 'Overview' },
  { href: MARKETPLACE_ROUTES.buyerBrowse, label: 'Browse' },
  { href: MARKETPLACE_ROUTES.buyerBids, label: 'Bids' },
  { href: MARKETPLACE_ROUTES.buyerInterests, label: 'Interests' },
];

const SELLER_LINKS = [
  { href: MARKETPLACE_ROUTES.sellerDashboard, label: 'Overview' },
  { href: MARKETPLACE_ROUTES.sellerListings, label: 'My listings' },
  { href: MARKETPLACE_ROUTES.sellerInbox, label: 'Inbox' },
  { href: MARKETPLACE_ROUTES.sellerVerification, label: 'Verification' },
];

export function MarketplaceAppSettings() {
  const [location, navigate] = useLocation();
  const { session, currentUser, logout } = useAuth();
  const [switching, setSwitching] = useState(false);

  const activeDesk = activeDeskFromPath(location, currentUser?.role ?? null);
  const workspaceLinks = activeDesk === 'buyer' ? BUYER_LINKS : SELLER_LINKS;
  const otherDesk: DeskView = activeDesk === 'buyer' ? 'seller' : 'buyer';
  const otherRole: AuthRole = otherDesk === 'buyer' ? 'buyer' : 'founder';

  async function switchToOtherDesk() {
    const dest = marketplaceWorkspaceForRole(otherRole);
    setSwitching(true);
    try {
      await syncMarketplaceDeskRoleForPath(dest);
      navigate(dest, { replace: true });
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <p className="text-sm text-muted-foreground">
            {activeDesk === 'buyer' ? 'Buyer' : 'Seller'} desk · signed in as{' '}
            {session?.user.email ?? '—'}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              This workspace
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {workspaceLinks.map((item) => (
                <Button key={item.href} type="button" variant="secondary" size="sm" asChild>
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Switch desk
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Open the {otherDesk} app with the matching demo account when enabled.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              disabled={switching}
              onClick={() => void switchToOtherDesk()}
            >
              Switch to {otherDesk} desk
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeDesk === 'seller' ? (
              <Button type="button" variant="outline" size="sm" asChild>
                <Link href={MARKETPLACE_ROUTES.sellerProfile}>Desk profile</Link>
              </Button>
            ) : null}
            {/* <Button type="button" variant="outline" size="sm" asChild>
              <Link href={MARKETPLACE_ROUTES.root}>Public marketplace</Link>
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href={AUTH_ROUTES.start}>All products</Link>
            </Button> */}
          </div>

          <Button type="button" variant="destructive" onClick={() => void logout()}>
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
