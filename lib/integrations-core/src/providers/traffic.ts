import type { ProviderAdapter, SyncContext, SyncResult } from "../types.js";

function oauthBundle(ctx: SyncContext): Record<string, string> {
  try {
    return JSON.parse(ctx.secret) as Record<string, string>;
  } catch {
    return { access_token: ctx.secret };
  }
}

export const ga4Adapter: ProviderAdapter = {
  slug: "ga4",
  category: "traffic",
  async sync(ctx: SyncContext): Promise<SyncResult> {
    const tokens = oauthBundle(ctx);
    const propertyId = ctx.externalAccountId ?? ctx.syncCursor.property_id;
    if (!propertyId) {
      return {
        recordsWritten: 0,
        connectionStatus: "error",
        healthStatus: "unhealthy",
        lastError: "GA4 property id required as external_account_id",
      };
    }
    const res = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
          metrics: [{ name: "sessions" }, { name: "totalUsers" }],
        }),
      },
    );
    const json = (await res.json()) as {
      error?: { message: string };
      rows?: { metricValues?: { value: string }[] }[];
    };
    if (!res.ok) {
      return {
        recordsWritten: 0,
        connectionStatus: "error",
        healthStatus: "unhealthy",
        lastError: json.error?.message ?? `GA4 HTTP ${res.status}`,
      };
    }
    const sessions = Number(json.rows?.[0]?.metricValues?.[0]?.value ?? 0);
    const users = Number(json.rows?.[0]?.metricValues?.[1]?.value ?? 0);
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return {
      recordsWritten: 1,
      verificationDimension: "traffic",
      verificationStatus: sessions > 0 ? "pass" : "partial",
      trafficMetrics: [
        {
          periodStart: start.toISOString().slice(0, 10),
          periodEnd: new Date().toISOString().slice(0, 10),
          sessions,
          users,
          pageviews: null,
          source: "ga4",
        },
      ],
      connectionStatus: "connected",
      healthStatus: sessions > 0 ? "healthy" : "degraded",
    };
  },
};

export const ahrefsAdapter: ProviderAdapter = {
  slug: "ahrefs",
  category: "traffic",
  async sync(ctx) {
    const res = await fetch(
      "https://api.ahrefs.com/v3/site-explorer/domain-rating",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ctx.secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: ctx.externalAccountId ?? ctx.syncCursor.domain,
        }),
      },
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        recordsWritten: 0,
        connectionStatus: "error",
        healthStatus: "unhealthy",
        lastError: `Ahrefs HTTP ${res.status}`,
      };
    }
    return {
      recordsWritten: 1,
      verificationDimension: "traffic",
      verificationStatus: "pass",
      verificationSummary: json as Record<string, unknown>,
      connectionStatus: "connected",
      healthStatus: "healthy",
    };
  },
};

export const semrushAdapter: ProviderAdapter = {
  slug: "semrush",
  category: "traffic",
  async sync(ctx) {
    const domain = ctx.externalAccountId ?? "";
    const url = `https://api.semrush.com/?type=domain_ranks&key=${encodeURIComponent(ctx.secret)}&domain=${encodeURIComponent(domain)}&export_columns=Db,Dn`;
    const res = await fetch(url);
    const text = await res.text();
    if (!res.ok) {
      return {
        recordsWritten: 0,
        connectionStatus: "error",
        healthStatus: "unhealthy",
        lastError: text.slice(0, 200),
      };
    }
    return {
      recordsWritten: 1,
      verificationDimension: "traffic",
      verificationStatus: "pass",
      verificationSummary: { raw: text.slice(0, 500) },
      connectionStatus: "connected",
      healthStatus: "healthy",
    };
  },
};

export const similarwebAdapter: ProviderAdapter = {
  slug: "similarweb",
  category: "traffic",
  async sync(ctx) {
    const domain = ctx.externalAccountId ?? "";
    const res = await fetch(
      `https://api.similarweb.com/v1/website/${encodeURIComponent(domain)}/total-traffic-and-engagement/visits?api_key=${encodeURIComponent(ctx.secret)}`,
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        recordsWritten: 0,
        connectionStatus: "error",
        healthStatus: "unhealthy",
        lastError: `SimilarWeb HTTP ${res.status}`,
      };
    }
    return {
      recordsWritten: 1,
      verificationDimension: "traffic",
      verificationStatus: "pass",
      verificationSummary: json as Record<string, unknown>,
      connectionStatus: "connected",
      healthStatus: "healthy",
    };
  },
};

export const gscAdapter: ProviderAdapter = {
  slug: "google_search_console",
  category: "traffic",
  async sync(ctx) {
    const tokens = oauthBundle(ctx);
    const siteUrl = ctx.externalAccountId ?? "";
    const res = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: new Date(Date.now() - 30 * 864e5)
            .toISOString()
            .slice(0, 10),
          endDate: new Date().toISOString().slice(0, 10),
          dimensions: ["date"],
        }),
      },
    );
    const json = await res.json();
    if (!res.ok) {
      return {
        recordsWritten: 0,
        connectionStatus: "error",
        healthStatus: "unhealthy",
        lastError: JSON.stringify(json).slice(0, 200),
      };
    }
    return {
      recordsWritten: 1,
      verificationDimension: "traffic",
      verificationStatus: "pass",
      verificationSummary: {
        rows: (json as { rows?: unknown[] }).rows?.length ?? 0,
      },
      connectionStatus: "connected",
      healthStatus: "healthy",
    };
  },
};
