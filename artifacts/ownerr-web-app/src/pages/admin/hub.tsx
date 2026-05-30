import { useEffect } from "react";
import { useLocation } from "wouter";
import { AdminLayout } from "@/pages/admin/layout";
import { Card } from "@/components/ui/card";
import { ADMIN_APPS } from "@/lib/admin/config";
import { trackAdminPageView } from "@/lib/admin/analytics";
import { ArrowRight } from "lucide-react";

export default function AdminHubPage() {
  const [, navigate] = useLocation();

  useEffect(() => {
    trackAdminPageView("ownerr_network", "hub");
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Platform Admin</h2>
          <p className="text-sm text-muted-foreground">
            Manage data and analytics across all Ownerr products
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ADMIN_APPS.map((app) => (
            <Card
              key={app.slug}
              className="p-6 cursor-pointer hover:shadow-md transition group"
              onClick={() => navigate(app.dashboardPath)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{app.label}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {app.description}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition" />
              </div>
              <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
                {app.nav.slice(1, 4).map((item) => (
                  <li key={item.path}>• {item.label}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
