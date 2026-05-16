import { DashboardMobileNav, DashboardSidebar } from '@/components/Sidebar';

type Props = {
  children: React.ReactNode;
};

/**
 * Authenticated `/app` shell: no global marketing/marketplace navbar.
 * In-app navigation only (sidebar + mobile sheet); leave via Logout only.
 */
export function DashboardLayout({ children }: Props) {
  return (
    <div className="desk-app-shell flex min-h-screen w-full flex-col pb-[env(safe-area-inset-bottom,0px)]">
      <header className="sticky top-0 z-40 flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 pt-[env(safe-area-inset-top,0px)] lg:hidden">
        <div className="flex items-center gap-2 font-bold tracking-tight text-foreground">
          <img src="/Ownerr Logo.svg" alt="" className="h-7 w-7" width={28} height={35} />
          <span>Ownerr</span>
        </div>
        <DashboardMobileNav />
      </header>
      <div className="grid min-h-0 w-full flex-1 lg:grid-cols-[240px_1fr]">
        <aside className="hidden border-r border-border bg-background lg:sticky lg:top-0 lg:block lg:h-[100dvh] lg:max-h-[100dvh] lg:self-start">
          <DashboardSidebar />
        </aside>
        <main className="flex min-h-0 min-w-0 flex-col overflow-x-hidden">
          <div className="flex-1 px-3 py-4 sm:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
