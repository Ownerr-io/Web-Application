import { ReactNode, useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { ChevronDown, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminLogo } from "@/components/admin/AdminDashboardShell";
import { getSupabase } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ADMIN_APPS,
  ADMIN_SIDEBAR_PLATFORM_SECTION,
  ADMIN_SIDEBAR_PRODUCT_SECTION,
  getAdminAppFromPath,
} from "@/lib/admin/config";

function AdminSidebar() {
  const [location, navigate] = useLocation();
  const activeApp = getAdminAppFromPath(location);
  const navSections = activeApp
    ? [{ title: activeApp.label, items: activeApp.nav }]
    : [ADMIN_SIDEBAR_PLATFORM_SECTION, ADMIN_SIDEBAR_PRODUCT_SECTION];

  const handleLogout = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <aside className="brand-sidebar hidden lg:flex h-full w-64 min-w-[16rem] max-w-[16rem] shrink-0 flex-col border-r">
      <div className="brand-sidebar-brand shrink-0">
        <button
          type="button"
          onClick={() => navigate("/admin")}
          className="flex min-w-0 items-center gap-3 text-left"
        >
          <AdminLogo className="h-8 w-8 shrink-0" />
          <span className="brand-shell-title truncate text-base font-bold">
            Admin
          </span>
        </button>
      </div>

      <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-2">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="brand-eyebrow mb-2 px-2 text-[10px]">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = location === item.path;
                return (
                  <div
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "brand-nav-item cursor-pointer px-4 py-2 text-sm font-medium transition",
                      isActive
                        ? "brand-nav-item--active"
                        : "text-muted-foreground",
                    )}
                  >
                    {item.label}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto shrink-0 border-t p-4">
        <Button
          variant="outline"
          className="w-full flex items-center gap-2"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}

function AdminHeader() {
  const [location, navigate] = useLocation();
  const activeApp = getAdminAppFromPath(location);

  return (
    <header className="brand-header-bar flex shrink-0 items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <AdminLogo className="h-7 w-7 lg:hidden" />
        <h2 className="text-sm font-semibold text-brand-lime">
          {activeApp?.label ?? "Platform Admin"}
        </h2>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            {activeApp?.label ?? "Select app"}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => navigate("/admin")}>
            All apps
          </DropdownMenuItem>
          {ADMIN_APPS.map((app) => (
            <DropdownMenuItem
              key={app.slug}
              onClick={() => navigate(app.dashboardPath)}
            >
              {app.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="admin-app-shell flex h-[100dvh] flex-col overflow-hidden">
      <header className="brand-header-bar sticky top-0 z-40 flex shrink-0 items-center justify-between px-4 pt-[env(safe-area-inset-top,0px)] lg:hidden">
        <div className="flex items-center gap-2">
          <AdminLogo className="h-7 w-7" />
          <h2 className="text-sm font-semibold brand-shell-title">Admin</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <AdminSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="hidden shrink-0 lg:block">
            <AdminHeader />
          </div>
          <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="admin-app-theme">
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
            <DialogDescription>
              Are you sure you want to logout?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
