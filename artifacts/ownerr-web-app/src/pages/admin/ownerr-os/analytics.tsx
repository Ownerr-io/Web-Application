import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AdminLayout } from "@/pages/admin/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchOsFounderAnalytics } from "@/lib/ownerr-os/adminApi";
import { useAdminPageView } from "@/lib/admin/useAdminPageView";
import { trackAdminAction } from "@/lib/admin/analytics";

export default function OwnerrOsAnalyticsAdminPage() {
  useAdminPageView("analytics");
  const [key, setKey] = useState("");

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin", "ownerr-os", "analytics", key],
    queryFn: () => fetchOsFounderAnalytics(key.trim() || undefined),
  });

  useEffect(() => {
    if (data) {
      trackAdminAction("ownerr_os", "analytics_loaded", {
        total_founders: data.totalFounders,
        total_clicks: data.totalReferralClicks,
      });
    }
  }, [data]);

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Founder Analytics
          </h2>
          <p className="text-sm text-muted-foreground">
            Viral referral performance for Ownerr OS
          </p>
        </div>

        <div className="flex max-w-md gap-2">
          <Input
            type="password"
            placeholder="Admin key (optional)"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
          <Button
            onClick={() => {
              trackAdminAction("ownerr_os", "analytics_refresh");
              void refetch();
            }}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Refresh"
            )}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive">Failed to load analytics.</p>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data ? (
          <>
            <div className="grid gap-6 sm:grid-cols-3">
              <Card className="p-6">
                <p className="text-sm text-muted-foreground">Founders</p>
                <h3 className="mt-2 text-2xl font-bold">{data.totalFounders}</h3>
              </Card>
              <Card className="p-6">
                <p className="text-sm text-muted-foreground">Referral clicks</p>
                <h3 className="mt-2 text-2xl font-bold">
                  {data.totalReferralClicks}
                </h3>
              </Card>
              <Card className="p-6">
                <p className="text-sm text-muted-foreground">Conversions</p>
                <h3 className="mt-2 text-2xl font-bold">
                  {data.totalConversions}
                </h3>
              </Card>
            </div>

            {data.topFounders.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold">Top viral founders</h3>
                <ul className="mt-4 space-y-2">
                  {data.topFounders.map((f) => (
                    <li
                      key={f.id}
                      className="flex justify-between rounded-lg border px-4 py-3 text-sm"
                    >
                      <span>
                        {f.founderName} · {f.startupName}
                      </span>
                      <span className="text-muted-foreground">
                        {f.visitCount} clicks · {f.referralSignupCount} conv.
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
}
