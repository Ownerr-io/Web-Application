import { mockStartups, type Startup } from "@/lib/mockData";
import {
  addMarketplaceInterestDB,
  getMarketplaceInterestRecordsByBuyerDB,
  getMarketplaceInterestRecordsDB,
  getMarketplaceInterestRecordsByListingDB,
  getMarketplaceListingDB,
  getMarketplaceListingsDB,
  putMarketplaceInterestDB,
  putMarketplaceListingDB,
} from "@/lib/db";
import type { AuthRole } from "./mockAuthService";

export type TimeSeriesPoint = {
  label: string;
  timestamp: string;
  value: number;
};

export type VerificationStatus = "unverified" | "pending" | "verified" | "failed";

export type VerificationSnapshot = {
  status: VerificationStatus;
  provider: string | null;
  updatedAt: string | null;
  requestedAt: string | null;
  note: string;
  sourceLabel?: string;
  mode?: "manual" | "google_analytics" | "dns_txt";
  expectedValue?: string | null;
};

export type TrustLabel = "High Trust" | "Medium Trust" | "Low Trust";

export type DealRelationshipStage = "interested" | "contacted" | "negotiating" | "closed";

export type MarketplaceThreadMessage = {
  id: string;
  senderUserId: string;
  senderName: string;
  senderRole: AuthRole;
  body: string;
  createdAt: string;
};

export type MarketplaceInterestRecord = {
  id: string;
  listingId: string;
  buyerUserId: string;
  buyerName: string;
  buyerRole: AuthRole;
  email: string;
  offerAmount: number | null;
  createdAt: string;
  updatedAt: string;
  stage: DealRelationshipStage;
  messages: MarketplaceThreadMessage[];
};

export type MarketplaceListing = Startup & {
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
  nicheTags: string[];
  keywords: string[];
  revenueHistory: TimeSeriesPoint[];
  trafficHistory: TimeSeriesPoint[];
  growthPct: number;
  trustScore: number;
  trustLabel: TrustLabel;
  verification: {
    revenue: VerificationSnapshot;
    domain: VerificationSnapshot;
    traffic: VerificationSnapshot;
  };
};

const MOCK_LATENCY_MS = 250;

function delay(ms = MOCK_LATENCY_MS): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function ensureSeedBuyerActivity(userId: string): Promise<void> {
  if (userId !== "buyer-olivia") return;
  const existing = await getMarketplaceInterestRecordsByBuyerDB(userId);
  if (existing.length > 0) return;

  const seeded: MarketplaceInterestRecord[] = [
    {
      id: "seed-interest-olivia-sorio",
      listingId: "sorio-ai",
      buyerUserId: "buyer-olivia",
      buyerName: "Olivia Carter",
      buyerRole: "buyer",
      email: "olivia@Ownerr",
      offerAmount: 215000,
      createdAt: new Date("2026-03-01T10:00:00.000Z").toISOString(),
      updatedAt: new Date("2026-03-03T15:30:00.000Z").toISOString(),
      stage: "negotiating",
      messages: [
        {
          id: "seed-msg-olivia-1",
          senderUserId: "buyer-olivia",
          senderName: "Olivia Carter",
          senderRole: "buyer",
          body: "Interested in Sorio AI. Please share retention and churn details for the last 6 months.",
          createdAt: new Date("2026-03-01T10:00:00.000Z").toISOString(),
        },
        {
          id: "seed-msg-olivia-2",
          senderUserId: "alicew",
          senderName: "Alice Wang",
          senderRole: "founder",
          body: "Great to connect. Net revenue retention is 112% with churn at 3.4%.",
          createdAt: new Date("2026-03-01T12:15:00.000Z").toISOString(),
        },
      ],
    },
    {
      id: "seed-interest-olivia-oli",
      listingId: "oli-ai",
      buyerUserId: "buyer-olivia",
      buyerName: "Olivia Carter",
      buyerRole: "buyer",
      email: "olivia@Ownerr",
      offerAmount: null,
      createdAt: new Date("2026-03-05T09:00:00.000Z").toISOString(),
      updatedAt: new Date("2026-03-05T09:00:00.000Z").toISOString(),
      stage: "interested",
      messages: [
        {
          id: "seed-msg-olivia-3",
          senderUserId: "buyer-olivia",
          senderName: "Olivia Carter",
          senderRole: "buyer",
          body: "Would like to review traffic source mix and conversion rates before placing an offer.",
          createdAt: new Date("2026-03-05T09:00:00.000Z").toISOString(),
        },
      ],
    },
    {
      id: "seed-interest-olivia-rezi",
      listingId: "rezi",
      buyerUserId: "buyer-olivia",
      buyerName: "Olivia Carter",
      buyerRole: "buyer",
      email: "olivia@Ownerr",
      offerAmount: 128000,
      createdAt: new Date("2026-03-10T08:20:00.000Z").toISOString(),
      updatedAt: new Date("2026-03-11T14:10:00.000Z").toISOString(),
      stage: "contacted",
      messages: [
        {
          id: "seed-msg-olivia-4",
          senderUserId: "buyer-olivia",
          senderName: "Olivia Carter",
          senderRole: "buyer",
          body: "Submitted an offer at $128k. Happy to move quickly if docs are ready.",
          createdAt: new Date("2026-03-10T08:20:00.000Z").toISOString(),
        },
      ],
    },
  ];

  await Promise.all(seeded.map((record) => putMarketplaceInterestDB(record)));
}

function hash(seed: string): number {
  let value = 0;
  for (let i = 0; i < seed.length; i++) {
    value = (value * 33 + seed.charCodeAt(i)) >>> 0;
  }
  return value;
}

function startOfMonthOffset(offset: number): Date {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  date.setMonth(date.getMonth() + offset);
  return date;
}

function monthLabel(date: Date): string {
  return date.toLocaleString("en-US", { month: "short" });
}

function roundSeries(series: number[], target: number): number[] {
  const rounded = series.map((value) => Math.max(0, Math.round(value)));
  const drift = Math.round(target) - rounded.reduce((sum, value) => sum + value, 0);
  rounded[rounded.length - 1] = Math.max(0, rounded[rounded.length - 1] + drift);
  return rounded;
}

function buildHistorySeries(seed: string, currentValue: number, months: number, variance: number): TimeSeriesPoint[] {
  const values: number[] = [];
  let pointer = hash(seed) || 17;
  const next = () => {
    pointer = (pointer * 1103515245 + 12345) >>> 0;
    return pointer / 4294967296;
  };

  let totalWeight = 0;
  const weights: number[] = [];
  for (let index = 0; index < months; index++) {
    const seasonal = 0.84 + Math.sin(index / 2.8) * variance;
    const noise = 0.9 + next() * variance;
    const weight = Math.max(0.3, seasonal * noise);
    weights.push(weight);
    totalWeight += weight;
  }

  for (let index = 0; index < months; index++) {
    const base = (weights[index] / totalWeight) * currentValue * months;
    values.push(base);
  }

  const normalized = roundSeries(values, currentValue * months);
  return normalized.map((value, index) => {
    const date = startOfMonthOffset(index - (months - 1));
    return {
      label: monthLabel(date),
      timestamp: date.toISOString(),
      value,
    };
  });
}

function inferNicheTags(startup: Startup): string[] {
  const base: string[] = [startup.category];
  const description = startup.description.toLowerCase();
  if (description.includes("ai")) base.push("AI");
  if (description.includes("seo")) base.push("SEO");
  if (description.includes("chat")) base.push("Chat");
  if (description.includes("video")) base.push("Video");
  if (description.includes("analytics")) base.push("Analytics");
  if (startup.forSale) base.push("Acquisition");
  return Array.from(new Set(base));
}

function buildKeywords(startup: Startup, nicheTags: string[]): string[] {
  return Array.from(
    new Set(
      [startup.name, startup.slug, startup.category, startup.description, ...nicheTags]
        .join(" ")
        .toLowerCase()
        .split(/[^a-z0-9]+/g)
        .filter(Boolean),
    ),
  );
}

export function calculateGrowthPct(revenueHistory: TimeSeriesPoint[]): number {
  if (revenueHistory.length < 2) return 0;
  const last = revenueHistory[revenueHistory.length - 1]?.value ?? 0;
  const prev = revenueHistory[revenueHistory.length - 2]?.value ?? 0;
  if (prev <= 0) return last > 0 ? 100 : 0;
  return Math.round(((last - prev) / prev) * 100);
}

function buildVerification(startup: Startup): MarketplaceListing["verification"] {
  const now = new Date().toISOString();
  return {
    revenue: {
      status: startup.revenueVerified ? "verified" : "unverified",
      provider: startup.revenueProvider,
      updatedAt: startup.revenueVerified ? now : null,
      requestedAt: startup.revenueVerified ? now : null,
      note: startup.revenueVerified
        ? `Revenue connected via ${startup.revenueProvider ?? "provider"}`
        : "No revenue provider connected yet",
      sourceLabel: startup.revenueProvider ?? "Manual revenue data",
    },
    domain: {
      status: startup.domainVerified ? "verified" : "unverified",
      provider: "DNS TXT",
      updatedAt: startup.domainVerified ? now : null,
      requestedAt: startup.domainVerified ? now : null,
      note: startup.domainVerified ? "DNS ownership confirmed" : "DNS check not started",
      mode: "dns_txt",
      sourceLabel: "TXT record",
      expectedValue: `ownerr-verification=${startup.slug}-${Math.abs(hash(startup.slug)).toString(36)}`,
    },
    traffic: {
      status: startup.trafficVerified ? "verified" : "unverified",
      provider: startup.trafficVerified ? "Google Analytics" : null,
      updatedAt: startup.trafficVerified ? now : null,
      requestedAt: startup.trafficVerified ? now : null,
      note: startup.trafficVerified ? "Analytics property connected" : "Analytics not connected",
      mode: startup.trafficVerified ? "google_analytics" : "manual",
      sourceLabel: startup.trafficVerified ? "Google Analytics connected (mock)" : "Manual upload",
    },
  };
}

export function computeTrustScore(listing: Pick<MarketplaceListing, "revenueVerified" | "domainVerified" | "trafficVerified">): number {
  const score =
    (listing.revenueVerified ? 40 : 0) +
    (listing.domainVerified ? 30 : 0) +
    (listing.trafficVerified ? 30 : 0);
  return Math.max(0, Math.min(100, score));
}

export function trustLabelFromScore(score: number): TrustLabel {
  if (score >= 70) return "High Trust";
  if (score >= 40) return "Medium Trust";
  return "Low Trust";
}

function normalizeRevenueVerification(
  revenueHistory: TimeSeriesPoint[],
  revenue: number,
  verification: MarketplaceListing["verification"]["revenue"],
): MarketplaceListing["verification"]["revenue"] {
  const historyIsSufficient = revenueHistory.filter((point) => point.value > 0).length >= 3;
  const hasMrr = revenue > 0;
  if (!historyIsSufficient || !hasMrr) {
    return {
      ...verification,
      status: "unverified",
      note: "Requires at least 3 months of revenue history and non-zero MRR.",
    };
  }
  return verification;
}

export function buildMarketplaceListingFromStartup(
  startup: Startup,
  overrides?: Partial<MarketplaceListing>,
): MarketplaceListing {
  const revenueHistory =
    overrides?.revenueHistory ??
    buildHistorySeries(`${startup.slug}:revenue`, Math.max(1, Math.round(startup.revenue)), 12, 0.18);
  const growthPct = overrides?.growthPct ?? calculateGrowthPct(revenueHistory);
  const trafficBase =
    startup.trafficMonthlyVisitors ?? Math.max(400, Math.round(startup.customers * 2.2) || startup.revenue * 2);
  const trafficHistory =
    overrides?.trafficHistory ??
    buildHistorySeries(`${startup.slug}:traffic`, Math.max(1, Math.round(trafficBase)), 12, 0.22);
  const nicheTags = overrides?.nicheTags ?? inferNicheTags(startup);
  const createdAt =
    overrides?.createdAt ??
    new Date(startup.foundedYear, Math.min(hash(startup.slug) % 12, 11), 1).toISOString();
  const updatedAt = overrides?.updatedAt ?? new Date().toISOString();
  const verificationBase = overrides?.verification ?? buildVerification(startup);
  const verification = {
    ...verificationBase,
    revenue: normalizeRevenueVerification(revenueHistory, startup.revenue, verificationBase.revenue),
  };

  const enriched: MarketplaceListing = {
    ...startup,
    ownerUserId: overrides?.ownerUserId ?? startup.founderHandle,
    createdAt,
    updatedAt,
    nicheTags,
    keywords: overrides?.keywords ?? buildKeywords(startup, nicheTags),
    revenueHistory,
    trafficHistory,
    growthPct,
    trustScore: 0,
    trustLabel: "Low Trust",
    trafficMonthlyVisitors: trafficHistory.at(-1)?.value ?? startup.trafficMonthlyVisitors ?? null,
    trafficTrend:
      trafficHistory.length >= 2
        ? trafficHistory.at(-1)!.value > trafficHistory.at(-2)!.value
          ? "up"
          : trafficHistory.at(-1)!.value < trafficHistory.at(-2)!.value
            ? "down"
            : "flat"
        : startup.trafficTrend,
    revenueGrowth30dPct: growthPct,
    verification,
  };

  enriched.revenueVerified = verification.revenue.status === "verified";
  enriched.revenueProvider =
    verification.revenue.status === "verified"
      ? (verification.revenue.provider as Startup["revenueProvider"])
      : null;
  enriched.domainVerified = verification.domain.status === "verified";
  enriched.trafficVerified = verification.traffic.status === "verified";
  enriched.trustScore = computeTrustScore(enriched);
  enriched.trustLabel = trustLabelFromScore(enriched.trustScore);
  return enriched;
}

export async function fetchMarketplaceListings(baseStartups: Startup[]): Promise<MarketplaceListing[]> {
  await delay();
  const persisted = await getMarketplaceListingsDB();
  const overrides = new Map(persisted.map((listing) => [listing.slug, listing]));
  return baseStartups.map((startup) => overrides.get(startup.slug) ?? buildMarketplaceListingFromStartup(startup));
}

export async function fetchMarketplaceListingBySlug(
  baseStartups: Startup[],
  slug: string,
): Promise<MarketplaceListing | null> {
  await delay();
  const persisted = await getMarketplaceListingDB(slug);
  if (persisted) return persisted;
  const startup = baseStartups.find((item) => item.slug === slug);
  return startup ? buildMarketplaceListingFromStartup(startup) : null;
}

export async function upsertMarketplaceListing(listing: MarketplaceListing): Promise<MarketplaceListing> {
  const next = buildMarketplaceListingFromStartup(listing, {
    ...listing,
    updatedAt: new Date().toISOString(),
  });
  await putMarketplaceListingDB(next);
  await delay(120);
  return next;
}

export async function submitMarketplaceInterest(
  record: {
    listingId: string;
    buyerUserId: string;
    buyerName: string;
    buyerRole: AuthRole;
    email: string;
    message: string;
    offerAmount: number | null;
  },
): Promise<MarketplaceInterestRecord> {
  const existingForBuyer = await getMarketplaceInterestRecordsByBuyerDB(record.buyerUserId);
  const listingCount = existingForBuyer.filter((item) => item.listingId === record.listingId).length;
  if (listingCount >= 3) {
    throw new Error("You have reached the 3-thread limit for this listing.");
  }
  const now = new Date().toISOString();
  const created: MarketplaceInterestRecord = {
    id: globalThis.crypto?.randomUUID?.() ?? `interest-${Date.now()}`,
    listingId: record.listingId,
    buyerUserId: record.buyerUserId,
    buyerName: record.buyerName,
    buyerRole: record.buyerRole,
    email: record.email,
    offerAmount: record.offerAmount,
    createdAt: now,
    updatedAt: now,
    stage: "interested",
    messages: [
      {
        id: globalThis.crypto?.randomUUID?.() ?? `msg-${Date.now()}`,
        senderUserId: record.buyerUserId,
        senderName: record.buyerName,
        senderRole: record.buyerRole,
        body: record.message,
        createdAt: now,
      },
    ],
  };
  await addMarketplaceInterestDB(created);
  await delay();
  return created;
}

export async function fetchMarketplaceInterests(listingId: string): Promise<MarketplaceInterestRecord[]> {
  await delay(120);
  return getMarketplaceInterestRecordsByListingDB(listingId);
}

export async function appendMarketplaceThreadMessage(input: {
  threadId: string;
  senderUserId: string;
  senderName: string;
  senderRole: AuthRole;
  body: string;
}): Promise<MarketplaceInterestRecord> {
  const candidates = await getMarketplaceInterestRecordsDB();
  const thread = candidates.find((item) => item.id === input.threadId);
  if (!thread) throw new Error("Conversation not found.");
  const next: MarketplaceInterestRecord = {
    ...thread,
    updatedAt: new Date().toISOString(),
    messages: [
      ...thread.messages,
      {
        id: globalThis.crypto?.randomUUID?.() ?? `msg-${Date.now()}`,
        senderUserId: input.senderUserId,
        senderName: input.senderName,
        senderRole: input.senderRole,
        body: input.body.trim(),
        createdAt: new Date().toISOString(),
      },
    ],
  };
  await putMarketplaceInterestDB(next);
  await delay(80);
  return next;
}

export async function updateMarketplaceInterestStage(
  record: MarketplaceInterestRecord,
  stage: DealRelationshipStage,
): Promise<MarketplaceInterestRecord> {
  const next = { ...record, stage, updatedAt: new Date().toISOString() };
  await putMarketplaceInterestDB(next);
  await delay(80);
  return next;
}

export function bestDealScore(listing: Pick<MarketplaceListing, "revenue" | "growthPct" | "multiple" | "trustScore">): number {
  const normalizedRevenue = Math.min(listing.revenue / 1000, 200);
  const normalizedGrowth = Math.max(-20, Math.min(100, listing.growthPct + 20));
  const multiplePenalty = Math.max(0, 20 - (listing.multiple ?? 0) * 4);
  return normalizedRevenue * 0.35 + normalizedGrowth * 0.25 + multiplePenalty * 0.15 + listing.trustScore * 0.25;
}

export async function updateMarketplaceVerification(
  listing: MarketplaceListing,
  kind: keyof MarketplaceListing["verification"],
  nextStatus: VerificationStatus,
  provider?: string | null,
): Promise<MarketplaceListing> {
  const now = new Date().toISOString();
  const next: MarketplaceListing = {
    ...listing,
    verification: {
      ...listing.verification,
      [kind]: {
        ...listing.verification[kind],
        status: nextStatus,
        provider: provider ?? listing.verification[kind].provider,
        requestedAt: listing.verification[kind].requestedAt ?? now,
        updatedAt: now,
        note:
          nextStatus === "verified"
            ? `${kind} verified successfully (mock)`
            : nextStatus === "pending"
              ? `${kind} verification is running (mock)`
              : nextStatus === "failed"
                ? `${kind} verification failed (mock)`
                : `${kind} verification disconnected (mock)`,
      },
    },
  };
  if (kind === "traffic") {
    next.verification.traffic.mode = provider === "Google Analytics" ? "google_analytics" : "manual";
    next.verification.traffic.sourceLabel =
      provider === "Google Analytics" ? "Google Analytics connected (mock)" : "Manual upload";
    if (provider === "Google Analytics" && nextStatus === "verified") {
      next.trafficHistory = buildHistorySeries(`${listing.slug}:ga`, Math.max(500, listing.revenue * 3), 12, 0.24);
    }
  }
  return upsertMarketplaceListing(buildMarketplaceListingFromStartup(next, next));
}

export async function runMockDomainVerification(listing: MarketplaceListing): Promise<MarketplaceListing> {
  const pending = await updateMarketplaceVerification(listing, "domain", "pending", "DNS TXT");
  await delay(500);
  const didSucceed = hash(`${listing.slug}:${Date.now()}`) % 2 === 0;
  return updateMarketplaceVerification(pending, "domain", didSucceed ? "verified" : "failed", "DNS TXT");
}



// V2: Dashboard data functions

export async function getUserInterests(userId: string): Promise<MarketplaceInterestRecord[]> {
  await ensureSeedBuyerActivity(userId);
  await delay();
  const rows = await getMarketplaceInterestRecordsByBuyerDB(userId);
  return [...rows].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getUserBids(userId: string): Promise<MarketplaceInterestRecord[]> {
  await ensureSeedBuyerActivity(userId);
  await delay();
  const interests = await getMarketplaceInterestRecordsByBuyerDB(userId);
  return interests.filter((i) => i.offerAmount && i.offerAmount > 0);
}

export async function getUserListings(ownerId: string): Promise<MarketplaceListing[]> {
  await delay();
  const all = await fetchMarketplaceListings(mockStartups);
  return all.filter((l) => l.ownerUserId === ownerId || l.founderHandle === ownerId);
}

export async function getAllThreadsForOwner(ownerId: string): Promise<MarketplaceInterestRecord[]> {
  await delay();
  const userListings = await getUserListings(ownerId);
  const listingIds = new Set(userListings.map((l) => l.slug));
  const allInterests = await getMarketplaceInterestRecordsDB();
  return allInterests.filter((i) => listingIds.has(i.listingId));
}