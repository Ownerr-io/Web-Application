import { Link } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { useMarketplace } from '@/context/marketplace/MarketplaceProvider';
import { marketplaceAppRoutes } from '@/routes/appRoutes';
import { MARKETPLACE_ROUTES, PRODUCT_ROUTES } from '@/routing/routeRegistry';
import { marketplaceWorkspaceForRole } from '@/routing/navigationRegistry';
import type { AuthRole } from '@/lib/auth/types';

/**
 * Authenticated hub at `/marketplace/app`.
 */
export default function DashboardHubPage() {
  const { currentUser } = useAuth();
  const { profile: marketplaceProfile, loading, error } = useMarketplace();

  const deskRole =
    (marketplaceProfile?.desk_role as AuthRole | null | undefined) ?? currentUser?.role ?? null;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Operations</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Desk overview</h1>
        <p className="text-sm text-muted-foreground">
          Profile and shortcuts for your marketplace desk (loaded from your database record).
        </p>
        {loading ? (
          <p className="text-xs text-muted-foreground">Refreshing desk profile…</p>
        ) : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        {deskRole ? (
          <p className="text-sm font-medium">
            Active desk: <span className="capitalize">{deskRole}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No desk role on file yet. Use buyer or founder flows to create your marketplace profile.
          </p>
        )}
      </header>

      {deskRole === 'buyer' ? (
        <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-5">
          <h2 className="text-sm font-bold">Buyer</h2>
          <ul className="flex flex-col gap-2 text-sm font-medium">
            <li>
              <Link className="text-primary underline-offset-4 hover:underline" href={marketplaceAppRoutes.buyerBids}>
                My bids
              </Link>
            </li>
            <li>
              <Link className="text-primary underline-offset-4 hover:underline" href={marketplaceAppRoutes.buyerInterests}>
                Saved startups
              </Link>
            </li>
            <li>
              <Link className="text-primary underline-offset-4 hover:underline" href={marketplaceAppRoutes.buyerAcquire}>
                Browse startups
              </Link>
            </li>
          </ul>
        </div>
      ) : null}

      {deskRole === 'founder' ? (
        <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-5">
          <h2 className="text-sm font-bold">Seller</h2>
          <ul className="flex flex-col gap-2 text-sm font-medium">
            <li>
              <Link className="text-primary underline-offset-4 hover:underline" href={marketplaceAppRoutes.founderListings}>
                My listings
              </Link>
            </li>
            <li>
              <Link className="text-primary underline-offset-4 hover:underline" href={marketplaceAppRoutes.founderInbox}>
                Inbox
              </Link>
            </li>
            <li>
              <Link className="text-primary underline-offset-4 hover:underline" href={marketplaceAppRoutes.founderVerification}>
                Verification
              </Link>
            </li>
          </ul>
        </div>
      ) : null}

      {deskRole ? (
        <ButtonRow deskRole={deskRole} />
      ) : null}

      <p className="text-center text-xs text-muted-foreground">
        <Link href={MARKETPLACE_ROUTES.settings} className="font-bold hover:text-foreground">
          Marketplace settings
        </Link>
      </p>
    </div>
  );
}

function ButtonRow({ deskRole }: { deskRole: AuthRole }) {
  const deskHref = marketplaceWorkspaceForRole(deskRole);
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={deskHref}
        className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground"
      >
        Open {deskRole} workspace
      </Link>
      <Link href={PRODUCT_ROUTES.ownerrOsSettings} className="text-sm font-bold text-muted-foreground hover:text-foreground">
        OWNERR OS settings
      </Link>
    </div>
  );
}
