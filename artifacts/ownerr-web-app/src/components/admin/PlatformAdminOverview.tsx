import type {
  AdminMarketplaceSummary,
  AdminNetworkSummary,
  AdminOsSummary,
  AdminPlatformIntelligence,
} from "@/lib/admin/summaryTypes";
import { AdminKpiGrid } from "@/components/admin/AdminKpiGrid";
import { AdminSection } from "@/components/admin/AdminIntelligence";

function fmt(n: number): string {
  return n.toLocaleString();
}

export function PlatformDataFreshness({
  generatedAt,
}: {
  generatedAt: string;
}) {
  const when = new Date(generatedAt);
  const label = Number.isNaN(when.getTime())
    ? generatedAt
    : when.toLocaleString();
  return (
    <p className="text-xs text-muted-foreground">
      Data as of <time dateTime={generatedAt}>{label}</time>
    </p>
  );
}

/** Headline KPIs for Platform Intelligence hub. */
export function PlatformExecutiveSnapshot({
  platform,
  network,
}: {
  platform?: AdminPlatformIntelligence;
  network?: AdminNetworkSummary;
}) {
  if (!platform) return null;
  return (
    <AdminSection
      title="Executive snapshot"
      description="Platform-wide signals — open a product console below for deep dives."
    >
      <AdminKpiGrid
        columns={4}
        items={[
          {
            label: "Total users",
            value: fmt(platform.totalUsers),
            hint: `${fmt(platform.newUsersToday)} today`,
          },
          {
            label: "Active (7d)",
            value: fmt(platform.activeUsers7d),
            hint: `${fmt(platform.activeUsers30d)} active 30d`,
            accent: "success",
          },
          {
            label: "Multi-product",
            value: fmt(platform.multiProductUsers),
            accent: "success",
          },
          {
            label: "Platform admins",
            value: fmt(network?.platformAdmins ?? 0),
          },
        ]}
      />
    </AdminSection>
  );
}

/** Read-only cross-product counts (same RPC as hub; not product admin pages). */
export function CrossProductPulse({
  network,
  marketplace,
  ownerrOs,
}: {
  network?: AdminNetworkSummary;
  marketplace?: AdminMarketplaceSummary;
  ownerrOs?: AdminOsSummary;
}) {
  if (!network && !marketplace && !ownerrOs) return null;
  return (
    <AdminSection
      title="Cross-product pulse"
      description="Live aggregates from each product area — use product consoles for CRUD."
    >
      <AdminKpiGrid
        columns={4}
        items={[
          {
            label: "Network members",
            value: network ? fmt(network.totalUsers) : "—",
            hint: network ? `${fmt(network.newUsers7d)} new · 7d` : undefined,
          },
          {
            label: "Published listings",
            value: marketplace ? fmt(marketplace.publishedListings) : "—",
            hint: marketplace
              ? `${fmt(marketplace.pendingSubmissions)} submissions pending`
              : undefined,
          },
          {
            label: "OS founders",
            value: ownerrOs
              ? fmt(ownerrOs.founderAnalytics?.totalFounders ?? 0)
              : "—",
            hint: ownerrOs
              ? `${fmt(ownerrOs.publishedListings)} published listings`
              : undefined,
          },
          {
            label: "Referrals completed",
            value: network ? fmt(network.completedReferrals) : "—",
            hint: network
              ? `${fmt(network.totalReferrals)} total referrals`
              : undefined,
          },
          {
            label: "Wallet volume",
            value: network ? fmt(network.walletVolume) : "—",
            hint: network
              ? `${fmt(network.walletTransactions)} transactions`
              : undefined,
          },
          {
            label: "Marketplace bids pipeline",
            value: marketplace?.dealPipeline?.length
              ? fmt(marketplace.dealPipeline.reduce((s, r) => s + r.count, 0))
              : "—",
            hint: "Interest + bid stages (see Operations)",
          },
          {
            label: "Verified network users",
            value: network ? fmt(network.verifiedUsers) : "—",
          },
          {
            label: "Avg submission score",
            value: marketplace
              ? marketplace.avgSubmissionScore.toFixed(1)
              : "—",
          },
        ]}
      />
    </AdminSection>
  );
}

const TABLE_GROUP_LABELS: Record<string, string> = {
  identity: "Identity & sessions",
  marketplace: "Marketplace",
  network: "Network & referrals",
  ownerr_os: "Ownerr OS",
};

export function SystemDatabaseOverview({
  tableCounts,
  usersTotal,
  usersDeleted,
  platformAdmins,
  productSessionsTotal,
  productSessionsActive24h,
}: {
  tableCounts: { name: string; rows: number; group?: string }[];
  usersTotal?: number;
  usersDeleted?: number;
  platformAdmins?: number;
  productSessionsTotal: number;
  productSessionsActive24h: number;
}) {
  const groups = new Map<string, { name: string; rows: number }[]>();
  for (const t of tableCounts) {
    const key = t.group ?? "other";
    const list = groups.get(key) ?? [];
    list.push({ name: t.name, rows: t.rows });
    groups.set(key, list);
  }

  const totalRows = tableCounts.reduce((s, t) => s + t.rows, 0);

  return (
    <div className="space-y-8">
      <AdminSection title="Identity footprint">
        <AdminKpiGrid
          columns={4}
          items={[
            {
              label: "Users (active)",
              value: usersTotal != null ? fmt(usersTotal) : "—",
            },
            {
              label: "Users (deleted)",
              value: usersDeleted != null ? fmt(usersDeleted) : "—",
            },
            {
              label: "Platform admins",
              value: platformAdmins != null ? fmt(platformAdmins) : "—",
            },
            {
              label: "Indexed rows (sampled tables)",
              value: fmt(totalRows),
              hint: `${tableCounts.length} tables tracked`,
            },
          ]}
        />
      </AdminSection>

      <AdminSection title="Sessions">
        <AdminKpiGrid
          columns={2}
          items={[
            {
              label: "Product sessions (total)",
              value: fmt(productSessionsTotal),
            },
            {
              label: "Active sessions (24h)",
              value: fmt(productSessionsActive24h),
              accent: "success",
            },
          ]}
        />
      </AdminSection>

      <div className="grid gap-6 lg:grid-cols-2">
        {[...groups.entries()].map(([key, rows]) => (
          <AdminSection key={key} title={TABLE_GROUP_LABELS[key] ?? key}>
            <ul className="brand-breakdown-list divide-y rounded-lg text-sm">
              {rows.map((row) => (
                <li
                  key={row.name}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    {row.name}
                  </span>
                  <span className="font-semibold tabular-nums text-brand-lime">
                    {fmt(row.rows)}
                  </span>
                </li>
              ))}
            </ul>
          </AdminSection>
        ))}
      </div>
    </div>
  );
}
