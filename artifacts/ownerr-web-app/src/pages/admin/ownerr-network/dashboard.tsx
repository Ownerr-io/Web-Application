import { AdminLayout } from "@/pages/admin/layout";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  fetchAllUsers,
  fetchAllProfiles,
  fetchAllLedgerEntries,
  fetchAllReferrals,
} from "@/lib/ownerr-network/adminApi";
import { useAdminPageView } from "@/lib/admin/useAdminPageView";

export default function OwnerrNetworkAdminDashboard() {
  useAdminPageView("dashboard");
  const [, navigate] = useLocation();

  const { data: users = [] } = useQuery({
    queryKey: ["admin", "ownerr-network", "users-count"],
    queryFn: fetchAllUsers,
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin", "ownerr-network", "profiles-count"],
    queryFn: fetchAllProfiles,
  });
  const { data: ledger = [] } = useQuery({
    queryKey: ["admin", "ownerr-network", "ledger-count"],
    queryFn: fetchAllLedgerEntries,
  });
  const { data: referrals = [] } = useQuery({
    queryKey: ["admin", "ownerr-network", "referrals-count"],
    queryFn: fetchAllReferrals,
  });

  const cards = [
    { label: "Users", count: users.length, path: "/admin/ownerr-network/users" },
    { label: "Profiles", count: profiles.length, path: "/admin/ownerr-network/profiles" },
    { label: "Transactions", count: ledger.length, path: "/admin/ownerr-network/ledger" },
    { label: "Referrals", count: referrals.length, path: "/admin/ownerr-network/referrals" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Ownerr Network</h2>
          <p className="text-sm text-muted-foreground">
            Users, profiles, wallet activity, and referral growth
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Card
              key={card.path}
              onClick={() => navigate(card.path)}
              className="p-6 cursor-pointer hover:shadow-md transition"
            >
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <h3 className="mt-2 text-2xl font-bold">{card.count}</h3>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
