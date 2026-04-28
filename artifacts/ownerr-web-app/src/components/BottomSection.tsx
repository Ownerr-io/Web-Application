import { Link } from 'wouter';
import * as Icons from 'lucide-react';
import { BROWSE_LABEL_TO_ACQUIRE_CATEGORY } from '@/lib/acquireBrowseCategoryMap';
import { browseCategories } from '@/lib/mockData';
import { useMockSession } from '@/context/MockSessionContext';
import { useAddStartup } from '@/context/AddStartupContext';

function getIcon(name: string) {
  const Lib = Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  const Comp = Lib[name] ?? Icons.Circle;
  return Comp;
}

export function BottomSection() {
  const { openAddStartup } = useAddStartup();
  const { isAuthenticated, openAuthDialog } = useMockSession();

  return (
    <div className="border-t border-border pt-8">
      <div className="mb-12 flex flex-col items-stretch gap-5 text-left sm:items-center sm:text-center">
        <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
          The database of verified startup revenues
        </h2>

        <div className="mx-auto flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:items-stretch">
          <div className="relative min-w-0 flex-1">
            <Icons.Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search, e.g. SaaS over $10K/mo"
              className="h-11 w-full min-w-0 rounded-[8px] border border-border bg-card pl-10 pr-4 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring sm:text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => (isAuthenticated ? openAddStartup() : openAuthDialog())}
            className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-1 rounded-[10px] border border-border bg-card px-5 font-bold text-foreground transition-transform hover:-translate-y-0.5 sm:w-auto"
          >
            <Icons.Plus className="h-4 w-4 shrink-0" /> Add startup
          </button>
        </div>
      </div>

      {/* Browse by category */}
      <div className="my-12 sm:my-16">
        <h3 className="mb-4 text-center text-sm font-bold sm:mb-6 sm:text-base">Browse by category</h3>
        <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-1.5 sm:gap-2">
          {browseCategories.map((c) => {
            const Icon = getIcon(c.icon);
            const acq = BROWSE_LABEL_TO_ACQUIRE_CATEGORY[c.label];
            const href = acq
              ? `/acquire?category=${encodeURIComponent(acq)}`
              : '/acquire';
            return (
              <Link
                key={c.label}
                href={href}
                className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-xs transition-colors hover:bg-muted sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-sm"
              >
                <Icon className="h-3 w-3 shrink-0 text-muted-foreground sm:h-3.5 sm:w-3.5" />
                <span className="truncate">{c.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}