import { Link } from 'wouter';
import { BarChart3, Briefcase, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OwnerrOsAppPageShell } from '@/components/founder-os/OwnerrOsAppPageShell';
import { OwnerrOsStartupsTable } from '@/components/founder-os/OwnerrOsStartupsTable';
import { useOwnerrFounderRecords } from '@/hooks/founder-os/useOwnerrFounderRecords';
import { PRODUCT_ROUTES } from '@/routing/routeRegistry';
import { OWNERR_OS_APP_CONTENT_CLASS } from '@/lib/ownerrOsAppLayout';
import { cn } from '@/lib/utils';

export function OwnerrOsDashboardSummary() {
  const { records, loading, totals } = useOwnerrFounderRecords();

  if (loading) {
    return (
      <div
        className={cn(
          OWNERR_OS_APP_CONTENT_CLASS,
          'flex min-h-[40vh] items-center justify-center text-sm font-bold text-muted-foreground',
        )}
      >
        Loading workspace…
      </div>
    );
  }

  return (
    <OwnerrOsAppPageShell
      title="Overview"
      description="Workspace summary across all of your OWNERR OS startup listings."
    >
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-muted/20 p-5">
          <dt className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Startups listed</dt>
          <dd className="mt-2 text-3xl font-bold tabular-nums">{records.length}</dd>
        </div>
        <div className="rounded-xl border border-border bg-muted/20 p-5">
          <dt className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total profile visits</dt>
          <dd className="mt-2 text-3xl font-bold tabular-nums">{totals.visits}</dd>
        </div>
        <div className="rounded-xl border border-border bg-muted/20 p-5">
          <dt className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total referral signups</dt>
          <dd className="mt-2 text-3xl font-bold tabular-nums">{totals.signups}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" asChild>
          <Link href={PRODUCT_ROUTES.ownerrOsListings}>
            <Briefcase className="mr-2 h-4 w-4" />
            My Startups
          </Link>
        </Button>
        <Button type="button" variant="secondary" size="sm" asChild>
          <Link href={PRODUCT_ROUTES.ownerrOsReferrals}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite &amp; Stats
          </Link>
        </Button>
        <Button type="button" variant="secondary" size="sm" asChild>
          <Link href={PRODUCT_ROUTES.ownerrOsAnalytics}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Analytics
          </Link>
        </Button>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Your startups</h2>
        <OwnerrOsStartupsTable records={records} />
      </div>
    </OwnerrOsAppPageShell>
  );
}
