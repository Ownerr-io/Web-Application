import { AdminLayout } from "@/pages/admin/layout";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  fetchAllOsListings,
  fetchOsFounderAnalytics,
} from "@/lib/ownerr-os/adminApi";
import { useAdminPageView } from "@/lib/admin/useAdminPageView";

export default function OwnerrOsAdminDashboard() {
  useAdminPageView("dashboard");
  const [, navigate] = useLocation();

  const { data: listings = [] } = useQuery({
    queryKey: ["admin", "ownerr-os", "listings-count"],
    queryFn: fetchAllOsListings,
  });
  const { data: analytics } = useQuery({
    queryKey: ["admin", "ownerr-os", "analytics-summary"],
    queryFn: () => fetchOsFounderAnalytics(),
  });

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Ownerr OS</h2>
          <p className="text-sm text-muted-foreground">
            Founder listings and viral referral analytics
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card
            className="p-6 cursor-pointer hover:shadow-md transition"
            onClick={() => navigate("/admin/ownerr-os/listings")}
          >
            <p className="text-sm text-muted-foreground">Listings</p>
            <h3 className="mt-2 text-2xl font-bold">{listings.length}</h3>
          </Card>
          <Card
            className="p-6 cursor-pointer hover:shadow-md transition"
            onClick={() => navigate("/admin/ownerr-os/analytics")}
          >
            <p className="text-sm text-muted-foreground">Founders</p>
            <h3 className="mt-2 text-2xl font-bold">
              {analytics?.totalFounders ?? "—"}
            </h3>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Referral Clicks</p>
            <h3 className="mt-2 text-2xl font-bold">
              {analytics?.totalReferralClicks ?? "—"}
            </h3>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Conversions</p>
            <h3 className="mt-2 text-2xl font-bold">
              {analytics?.totalConversions ?? "—"}
            </h3>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
