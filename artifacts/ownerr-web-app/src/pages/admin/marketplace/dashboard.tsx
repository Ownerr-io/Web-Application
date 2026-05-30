import { AdminLayout } from "@/pages/admin/layout";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  fetchAllMarketplaceListings,
  fetchAllMarketplaceSubmissions,
} from "@/lib/marketplace/adminApi";
import { useAdminPageView } from "@/lib/admin/useAdminPageView";

export default function MarketplaceAdminDashboard() {
  useAdminPageView("dashboard");
  const [, navigate] = useLocation();

  const { data: listings = [] } = useQuery({
    queryKey: ["admin", "marketplace", "listings-count"],
    queryFn: fetchAllMarketplaceListings,
  });
  const { data: submissions = [] } = useQuery({
    queryKey: ["admin", "marketplace", "submissions-count"],
    queryFn: fetchAllMarketplaceSubmissions,
  });

  const published = listings.filter((l) => l.status === "published").length;

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Marketplace</h2>
          <p className="text-sm text-muted-foreground">
            Startup listings and acquisition submissions
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          <Card
            className="p-6 cursor-pointer hover:shadow-md transition"
            onClick={() => navigate("/admin/marketplace/listings")}
          >
            <p className="text-sm text-muted-foreground">Total Listings</p>
            <h3 className="mt-2 text-2xl font-bold">{listings.length}</h3>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Published</p>
            <h3 className="mt-2 text-2xl font-bold">{published}</h3>
          </Card>
          <Card
            className="p-6 cursor-pointer hover:shadow-md transition"
            onClick={() => navigate("/admin/marketplace/submissions")}
          >
            <p className="text-sm text-muted-foreground">Submissions</p>
            <h3 className="mt-2 text-2xl font-bold">{submissions.length}</h3>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
