import { Link } from 'wouter';
import { appRoutes } from '@/routes/appRoutes';

/** Placeholder for account / notification settings at `/app/settings`. */
export default function AppSettingsPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <p className="text-sm text-muted-foreground">
        Account preferences and notifications will live here. Use the sidebar for role-specific profile pages.
      </p>
      <Link href={appRoutes.hub} className="text-sm font-bold text-primary underline-offset-4 hover:underline">
        ← Back to desk
      </Link>
    </div>
  );
}
