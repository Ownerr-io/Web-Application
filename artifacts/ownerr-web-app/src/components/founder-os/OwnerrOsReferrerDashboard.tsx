import { Link } from 'wouter';
import { FounderSharePanel } from '@/components/founder-os/FounderSharePanel';
import { OwnerrOsAppPageShell } from '@/components/founder-os/OwnerrOsAppPageShell';
import { Button } from '@/components/ui/button';
import { useOwnerrFounderRecord } from '@/hooks/founder-os/useOwnerrFounderRecord';
import { PRODUCT_ROUTES } from '@/routing/routeRegistry';
import { OWNERR_OS_APP_CONTENT_CLASS } from '@/lib/ownerrOsAppLayout';
import { cn } from '@/lib/utils';

export function OwnerrOsReferrerDashboard() {
  const { record, loading } = useOwnerrFounderRecord();

  if (loading) {
    return (
      <div
        className={cn(
          OWNERR_OS_APP_CONTENT_CLASS,
          'flex min-h-[40vh] items-center justify-center text-sm font-bold text-muted-foreground',
        )}
      >
        Loading referral tools…
      </div>
    );
  }

  if (!record) {
    return (
      <OwnerrOsAppPageShell
        title="Invite & Stats"
        description="Create your startup listing first to get a referral link and share assets."
      >
        <Button type="button" className="btn-platform-gradient font-bold" asChild>
          <Link href={PRODUCT_ROUTES.ownerrOsListings}>Create listing</Link>
        </Button>
      </OwnerrOsAppPageShell>
    );
  }

  return (
    <OwnerrOsAppPageShell
      title="Invite & Stats"
      description={
        <>
          Share your link — visits: <span className="font-bold tabular-nums">{record.visitCount}</span>
          {' · '}
          signups: <span className="font-bold tabular-nums">{record.referralSignupCount}</span>
        </>
      }
    >
      <FounderSharePanel record={record} prominent />
      <p className="text-xs text-muted-foreground">
        Invitees land on your public join page (works on localhost and production).
      </p>
    </OwnerrOsAppPageShell>
  );
}
