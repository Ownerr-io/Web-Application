import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ProductSettingsShell } from '@/components/settings/ProductSettingsShell';
import { useAuth } from '@/context/AuthContext';
import { loadFounderSubmissionForUser } from '@/lib/founderService';
import type { FounderSubmissionRecord } from '@/lib/founderTypes';
import { PRODUCT_ROUTES } from '@/routing/routeRegistry';

export default function OwnerrOsAppSettingsPage() {
  const { session } = useAuth();
  const [founder, setFounder] = useState<FounderSubmissionRecord | null>(null);

  useEffect(() => {
    const uid = session?.user.id;
    if (!uid) return;
    void loadFounderSubmissionForUser(uid).then(setFounder);
  }, [session?.user.id]);

  return (
    <ProductSettingsShell product="ownerr-os" title="OWNERR OS settings">
      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Founder listing</h2>
        {founder ? (
          <>
            <p className="text-lg font-bold">{founder.startupName}</p>
            <p className="text-sm text-muted-foreground">{founder.tagline}</p>
            <p className="font-mono text-xs text-muted-foreground">Referral: {founder.referralCode}</p>
            <Button type="button" variant="secondary" asChild>
              <Link href={PRODUCT_ROUTES.ownerrOsDashboard}>Open dashboard</Link>
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href={PRODUCT_ROUTES.ownerrOsAnalytics}>View analytics</Link>
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">No startup listing linked to this account yet.</p>
            <Button type="button" variant="secondary" asChild>
              <Link href={PRODUCT_ROUTES.ownerrOsListings}>Create listing</Link>
            </Button>
          </>
        )}
      </section>
    </ProductSettingsShell>
  );
}
