import { Link } from 'wouter';
import { MarketingLayout } from '@/components/MarketingLayout';
import { Button } from '@/components/ui/button';
import { AUTH_ROUTES, PUBLIC_ROUTES } from '@/routing/routeRegistry';

export default function ForbiddenPage() {
  return (
    <MarketingLayout>
      <div className="saas-section-shell flex min-h-[50vh] flex-col items-center justify-center py-16 text-center">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">403</p>
        <h1 className="marketing-section-heading mt-2">You don&apos;t have access</h1>
        <p className="marketing-body-sm mt-3 max-w-md">
          This page requires a different role or product membership. Switch apps or contact support if you think this
          is a mistake.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline">
            <Link href={PUBLIC_ROUTES.home}>Home</Link>
          </Button>
          <Button asChild className="btn-platform-gradient font-bold">
            <Link href={AUTH_ROUTES.start}>Open app picker</Link>
          </Button>
        </div>
      </div>
    </MarketingLayout>
  );
}
