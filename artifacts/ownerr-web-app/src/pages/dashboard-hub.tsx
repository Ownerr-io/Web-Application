import { Link } from 'wouter';
import { useMockSession } from '@/context/MockSessionContext';
import { appRoutes } from '@/routes/appRoutes';

/**
 * Authenticated hub at `/app` — in-app links only (public site after Logout).
 */
export default function DashboardHubPage() {
  const { currentUser } = useMockSession();
  const role = currentUser?.role;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Operations</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Desk overview</h1>
        <p className="text-sm text-muted-foreground">
          Use the sidebar to move between tools. To visit the public marketing site or marketplace, sign out first.
        </p>
      </header>

      {role === 'buyer' ? (
        <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-5">
          <h2 className="text-sm font-bold">Buyer</h2>
          <ul className="flex flex-col gap-2 text-sm font-medium">
            <li>
              <Link className="text-primary underline-offset-4 hover:underline" href={appRoutes.buyerBids}>
                My bids
              </Link>
            </li>
            <li>
              <Link className="text-primary underline-offset-4 hover:underline" href={appRoutes.buyerInterests}>
                Saved startups
              </Link>
            </li>
            <li>
              <Link className="text-primary underline-offset-4 hover:underline" href={appRoutes.buyerAcquire}>
                Browse startups
              </Link>
            </li>
          </ul>
        </div>
      ) : null}

      {role === 'founder' ? (
        <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-5">
          <h2 className="text-sm font-bold">Seller</h2>
          <ul className="flex flex-col gap-2 text-sm font-medium">
            <li>
              <Link className="text-primary underline-offset-4 hover:underline" href={appRoutes.sellerListings}>
                My listings
              </Link>
            </li>
            <li>
              <Link className="text-primary underline-offset-4 hover:underline" href={appRoutes.sellerInbox}>
                Inbox
              </Link>
            </li>
            <li>
              <Link className="text-primary underline-offset-4 hover:underline" href={appRoutes.sellerVerification}>
                Verification
              </Link>
            </li>
          </ul>
        </div>
      ) : null}

      <p className="text-center text-xs text-muted-foreground">
        <Link href={appRoutes.settings} className="font-bold hover:text-foreground">
          Settings
        </Link>
        <span className="mx-2 opacity-40">·</span>
        <Link href={appRoutes.messages} className="font-bold hover:text-foreground">
          Messages
        </Link>
      </p>
    </div>
  );
}
