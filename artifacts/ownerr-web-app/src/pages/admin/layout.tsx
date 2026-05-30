import { ReactNode, useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { ChevronDown, LayoutGrid, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { ADMIN_APPS, getAdminAppFromPath } from "@/lib/admin/config";

function AdminSidebar() {
  const [location, navigate] = useLocation();
  const activeApp = getAdminAppFromPath(location);
  const navItems = activeApp?.nav ?? [];

  const handleLogout = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <aside className="hidden lg:flex w-64 min-w-[16rem] max-w-[16rem] flex-shrink-0 flex-col border-r bg-background">
      <div className="p-6">
        <button
          type="button"
          onClick={() => navigate("/admin")}
          className="flex items-center gap-2 text-left"
        >
          <LayoutGrid className="h-5 w-5" />
          <span className="text-xl font-bold">Admin</span>
        </button>
        {activeApp && (
          <p className="mt-1 text-xs text-muted-foreground">{activeApp.label}</p>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-4">
        {navItems.map((item) => {
          const isActive = location === item.path;
          return (
            <div
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "cursor-pointer rounded-md px-4 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {item.label}
            </div>
          );
        })}
      </nav>

      <div className="border-t p-4 mt-auto">
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
    <header className="flex h-14 items-center justify-between border-b px-4 bg-background">
      <h2 className="text-sm font-semibold">
        {activeApp?.label ?? "Platform Admin"}
      </h2>
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
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b px-4 bg-background lg:hidden">
        <h2 className="text-sm font-semibold">Admin</h2>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex flex-1">
        <AdminSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <div className="hidden lg:block">
            <AdminHeader />
          </div>
          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
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
