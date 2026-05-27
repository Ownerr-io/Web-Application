import { isDemoAccountEmail } from '@/lib/marketplace/demoUsers';
import { useAuth } from '@/context/AuthContext';

export function DemoAccountBanner() {
  const { session } = useAuth();
  const email = session?.user.email;
  if (!isDemoAccountEmail(email)) return null;

  return (
    <div
      className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs font-semibold text-amber-950 dark:text-amber-100"
      role="status"
    >
      Demo Account — data is for testing only. Use reset script before QA demos if needed.
    </div>
  );
}

export function DemoAccountBadge({ email }: { email?: string | null }) {
  if (!isDemoAccountEmail(email)) return null;
  return (
    <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 dark:text-amber-100">
      Demo Account
    </span>
  );
}
