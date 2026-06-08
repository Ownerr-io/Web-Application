import { isDemoAccountEmail } from "@/lib/marketplace/demoUsers";
import { useAuth } from "@/context/AuthContext";
import { showDemoAccountHints } from "@/lib/demo/demoAccountCatalog";

export function DemoAccountBanner() {
  const { session } = useAuth();
  const email = session?.user.email;
  if (!showDemoAccountHints() || !isDemoAccountEmail(email)) return null;

  return (
    <div
      className="border-b border-[color:color-mix(in_srgb,var(--brand-orange)_35%,var(--terminal-border))] bg-[color:color-mix(in_srgb,var(--brand-orange)_10%,transparent)] px-4 py-2 text-center text-xs font-semibold text-brand-orange"
      role="status"
    >
      Demo account — for local testing only.
    </div>
  );
}

export function DemoAccountBadge({ email }: { email?: string | null }) {
  if (!showDemoAccountHints() || !isDemoAccountEmail(email)) return null;
  return (
    <span className="rounded-full border border-[color:var(--brand-orange)]/40 bg-[color:color-mix(in_srgb,var(--brand-orange)_15%,transparent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-orange">
      Demo
    </span>
  );
}
