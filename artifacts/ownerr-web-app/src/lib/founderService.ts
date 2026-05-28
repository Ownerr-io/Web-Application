import type {
  CreateFounderInput,
  FounderAnalytics,
  FounderSocialLinks,
  FounderSubmissionRecord,
} from "./founderTypes";
import { buildReferralLink, generateReferralCode } from "./founderReferral";
import {
  getAllFounderSubmissionsDB,
  getFounderByReferralCodeDB,
  getFounderSubmissionDB,
  putFounderSubmissionDB,
} from "./db";
import { getSupabase, isSupabaseConfigured } from "./supabase/client";

type FounderSubmissionDbRow = {
  id: string;
  founder_name: string;
  startup_name: string;
  tagline: string;
  description: string;
  website: string | null;
  social_links: FounderSocialLinks | null;
  founder_photo: string | null;
  category: string | null;
  location: string | null;
  referral_code: string;
  referral_link: string;
  share_card_url: string | null;
  visit_count: number;
  referral_signup_count: number;
  created_at: string;
};

const FOUNDER_SUBMISSION_SELECT =
  "id, founder_name, startup_name, tagline, description, website, social_links, founder_photo, category, location, referral_code, referral_link, share_card_url, visit_count, referral_signup_count, created_at";

function mapFounderSubmissionRow(
  row: FounderSubmissionDbRow,
): FounderSubmissionRecord {
  return {
    id: row.id,
    founderName: row.founder_name,
    startupName: row.startup_name,
    tagline: row.tagline,
    description: row.description,
    website: row.website,
    socialLinks: row.social_links ?? {},
    founderPhoto: row.founder_photo,
    category: row.category,
    location: row.location,
    referralCode: row.referral_code,
    referralLink: row.referral_link,
    shareCardUrl: row.share_card_url,
    visitCount: Number(row.visit_count) || 0,
    referralSignupCount: Number(row.referral_signup_count) || 0,
    createdAt: row.created_at,
  };
}

function mapFounderFromRpcJson(data: unknown): FounderSubmissionRecord | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const id = o.id;
  if (typeof id !== "string") return null;
  return {
    id,
    founderName: String(o.founderName ?? ""),
    startupName: String(o.startupName ?? ""),
    tagline: String(o.tagline ?? ""),
    description: String(o.description ?? ""),
    website: (o.website as string | null) ?? null,
    socialLinks: (o.socialLinks as FounderSocialLinks) ?? {},
    founderPhoto: (o.founderPhoto as string | null) ?? null,
    category: (o.category as string | null) ?? null,
    location: (o.location as string | null) ?? null,
    referralCode: String(o.referralCode ?? ""),
    referralLink: String(o.referralLink ?? ""),
    shareCardUrl: (o.shareCardUrl as string | null) ?? null,
    visitCount: Number(o.visitCount) || 0,
    referralSignupCount: Number(o.referralSignupCount) || 0,
    createdAt:
      typeof o.createdAt === "string"
        ? o.createdAt
        : new Date(String(o.createdAt ?? Date.now())).toISOString(),
  };
}

export class FounderApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "FounderApiError";
  }
}

function siteOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return (
    (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) ??
    "https://ownerros.com"
  );
}

function normalizeShareCardPng(raw?: string): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if (t.startsWith("data:image/")) return t;
  return `data:image/png;base64,${t}`;
}

async function requireAuthUserId(): Promise<string> {
  if (!isSupabaseConfigured())
    throw new FounderApiError(503, "Supabase is not configured");
  const { data, error } = await getSupabase().auth.getUser();
  if (error) throw new FounderApiError(401, error.message);
  if (!data.user) throw new FounderApiError(401, "Not authenticated");
  return data.user.id;
}

async function createLocal(
  input: CreateFounderInput,
): Promise<FounderSubmissionRecord> {
  const origin = siteOrigin();
  let referralCode = generateReferralCode(8);
  for (let i = 0; i < 8; i++) {
    const existing = await getFounderByReferralCodeDB(referralCode);
    if (!existing) break;
    referralCode = generateReferralCode(8);
  }
  const id = crypto.randomUUID();
  const record: FounderSubmissionRecord = {
    id,
    founderName: input.founderName.trim(),
    startupName: input.startupName.trim(),
    tagline: input.tagline.trim(),
    description: input.description.trim(),
    website: input.website?.trim() || null,
    socialLinks: input.socialLinks ?? {},
    founderPhoto: input.founderPhoto ?? null,
    category: input.category?.trim() || null,
    location: input.location?.trim() || null,
    referralCode,
    referralLink: buildReferralLink(origin, referralCode),
    visitCount: 0,
    referralSignupCount: 0,
    createdAt: new Date().toISOString(),
    shareCardUrl: normalizeShareCardPng(input.shareCardPngBase64),
  };
  await putFounderSubmissionDB(record);
  return record;
}

async function createFounderSupabase(
  input: CreateFounderInput,
): Promise<FounderSubmissionRecord> {
  const authUserId = await requireAuthUserId();
  const supabase = getSupabase();
  const origin = siteOrigin();
  const socialLinks = input.socialLinks ?? {};
  const website = input.website?.trim() || null;

  for (let attempt = 0; attempt < 6; attempt++) {
    const referralCode = generateReferralCode(8);
    const referralLink = buildReferralLink(origin, referralCode);
    const { data, error } = await supabase
      .from("founder_submissions")
      .insert({
        auth_user_id: authUserId,
        founder_name: input.founderName.trim(),
        startup_name: input.startupName.trim(),
        tagline: input.tagline.trim(),
        description: input.description.trim(),
        website,
        social_links: socialLinks,
        founder_photo: input.founderPhoto ?? null,
        category: input.category?.trim() || null,
        location: input.location?.trim() || null,
        referral_code: referralCode,
        referral_link: referralLink,
        share_card_url: normalizeShareCardPng(input.shareCardPngBase64),
      })
      .select(FOUNDER_SUBMISSION_SELECT)
      .single();

    if (error) {
      if (error.code === "23505") continue;
      throw new FounderApiError(400, error.message);
    }
    return mapFounderSubmissionRow(data as FounderSubmissionDbRow);
  }
  throw new FounderApiError(503, "Failed to allocate unique referral code");
}

async function updateFounderSupabase(
  recordId: string,
  input: CreateFounderInput,
): Promise<FounderSubmissionRecord> {
  const authUserId = await requireAuthUserId();
  const supabase = getSupabase();
  const socialLinks = input.socialLinks ?? {};
  const website = input.website?.trim() || null;
  const { data, error } = await supabase
    .from("founder_submissions")
    .update({
      founder_name: input.founderName.trim(),
      startup_name: input.startupName.trim(),
      tagline: input.tagline.trim(),
      description: input.description.trim(),
      website,
      social_links: socialLinks,
      founder_photo: input.founderPhoto ?? null,
      category: input.category?.trim() || null,
      location: input.location?.trim() || null,
    })
    .eq("id", recordId)
    .eq("auth_user_id", authUserId)
    .select(FOUNDER_SUBMISSION_SELECT)
    .single();
  if (error) throw new FounderApiError(400, error.message);
  return mapFounderSubmissionRow(data as FounderSubmissionDbRow);
}

/** Update an existing listing for the signed-in founder (keeps referral code). */
export async function updateFounderSubmission(
  recordId: string,
  input: CreateFounderInput,
): Promise<{ record: FounderSubmissionRecord; savedToDatabase: boolean }> {
  const existing = await getFounderSubmissionDB(recordId);
  if (!isSupabaseConfigured()) {
    if (!existing) throw new FounderApiError(404, "Listing not found");
    const updated: FounderSubmissionRecord = {
      ...existing,
      founderName: input.founderName.trim(),
      startupName: input.startupName.trim(),
      tagline: input.tagline.trim(),
      description: input.description.trim(),
      website: input.website?.trim() || null,
      socialLinks: input.socialLinks ?? {},
      founderPhoto: input.founderPhoto ?? null,
      category: input.category?.trim() || null,
      location: input.location?.trim() || null,
    };
    await putFounderSubmissionDB(updated);
    return { record: updated, savedToDatabase: false };
  }
  try {
    const record = await updateFounderSupabase(recordId, input);
    await putFounderSubmissionDB(record);
    return { record, savedToDatabase: true };
  } catch (err) {
    console.warn("[OWNERR OS] Supabase update failed:", err);
    if (!existing) throw err;
    const updated: FounderSubmissionRecord = {
      ...existing,
      founderName: input.founderName.trim(),
      startupName: input.startupName.trim(),
      tagline: input.tagline.trim(),
      description: input.description.trim(),
      website: input.website?.trim() || null,
      socialLinks: input.socialLinks ?? {},
      founderPhoto: input.founderPhoto ?? null,
      category: input.category?.trim() || null,
      location: input.location?.trim() || null,
    };
    await putFounderSubmissionDB(updated);
    return { record: updated, savedToDatabase: false };
  }
}

/** Persists to Supabase; falls back to IndexedDB only if Supabase is unavailable. */
export async function submitFounder(
  input: CreateFounderInput,
): Promise<{ record: FounderSubmissionRecord; savedToDatabase: boolean }> {
  if (!isSupabaseConfigured()) {
    const local = await createLocal(input);
    return { record: local, savedToDatabase: false };
  }
  try {
    const record = await createFounderSupabase(input);
    await putFounderSubmissionDB(record);
    return { record, savedToDatabase: true };
  } catch (err) {
    console.warn("[OWNERR OS] Supabase save failed, using local backup:", err);
    const local = await createLocal(input);
    return { record: local, savedToDatabase: false };
  }
}

export async function saveFounderShareCard(
  record: FounderSubmissionRecord,
  dataUrl: string,
): Promise<{ record: FounderSubmissionRecord; savedToDatabase: boolean }> {
  const shareCardUrl = normalizeShareCardPng(dataUrl);
  const updatedLocal: FounderSubmissionRecord = {
    ...record,
    shareCardUrl,
  };

  if (!isSupabaseConfigured() || !shareCardUrl) {
    await putFounderSubmissionDB(updatedLocal);
    return { record: updatedLocal, savedToDatabase: false };
  }

  try {
    const authUserId = await requireAuthUserId();
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("founder_submissions")
      .update({ share_card_url: shareCardUrl })
      .eq("id", record.id)
      .eq("auth_user_id", authUserId)
      .select(FOUNDER_SUBMISSION_SELECT)
      .single();
    if (error) throw error;
    const mapped = mapFounderSubmissionRow(data as FounderSubmissionDbRow);
    await putFounderSubmissionDB(mapped);
    return { record: mapped, savedToDatabase: true };
  } catch (err) {
    console.warn("[OWNERR OS] Share image Supabase save failed:", err);
    await putFounderSubmissionDB(updatedLocal);
    return { record: updatedLocal, savedToDatabase: false };
  }
}

export async function trackReferral(
  referralCode: string,
  eventType: "visit" | "signup",
  sourcePlatform?: string,
): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await getSupabase().rpc("founder_track_referral", {
        p_referral_code: referralCode,
        p_event_type: eventType,
        p_source_platform: sourcePlatform ?? null,
      });
      if (!error) return;
    } catch {
      /* fall through to local */
    }
  }

  const local = await getFounderByReferralCodeDB(referralCode);
  if (!local) return;
  const updated: FounderSubmissionRecord = {
    ...local,
    visitCount: eventType === "visit" ? local.visitCount + 1 : local.visitCount,
    referralSignupCount:
      eventType === "signup"
        ? local.referralSignupCount + 1
        : local.referralSignupCount,
  };
  await putFounderSubmissionDB(updated);
}

function toPublicFounderRecord(
  record: FounderSubmissionRecord,
): FounderSubmissionRecord {
  return {
    ...record,
    visitCount: 0,
    referralSignupCount: 0,
  };
}

export async function fetchFounderByReferralCodePublic(
  code: string,
): Promise<FounderSubmissionRecord | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabase().rpc(
      "founder_public_by_referral_code",
      {
        p_code: trimmed,
      },
    );
    if (!error && data) {
      const mapped = mapFounderFromRpcJson(data);
      if (mapped) return toPublicFounderRecord(mapped);
    }
  }
  const local = (await getFounderByReferralCodeDB(trimmed)) ?? null;
  return local ? toPublicFounderRecord(local) : null;
}

export async function fetchFounderSubmissionById(
  id: string,
): Promise<FounderSubmissionRecord | null> {
  const trimmed = id.trim();
  if (!trimmed) return null;
  const cached = (await getFounderSubmissionDB(trimmed)) ?? null;

  if (!isSupabaseConfigured()) return cached;

  try {
    const authUserId = await requireAuthUserId();
    const { data, error } = await getSupabase()
      .from("founder_submissions")
      .select(FOUNDER_SUBMISSION_SELECT)
      .eq("id", trimmed)
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (!error && data) {
      const record = mapFounderSubmissionRow(data as FounderSubmissionDbRow);
      await putFounderSubmissionDB(record);
      return record;
    }
  } catch {
    /* use cache */
  }
  return cached;
}

export async function loadFounderSubmissionsForUser(
  authUserId: string,
): Promise<FounderSubmissionRecord[]> {
  const userId = authUserId.trim();
  if (!userId) return [];

  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabase()
      .from("founder_submissions")
      .select(FOUNDER_SUBMISSION_SELECT)
      .eq("auth_user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const records = (data as FounderSubmissionDbRow[]).map((row) =>
        mapFounderSubmissionRow(row),
      );
      for (const record of records) {
        await putFounderSubmissionDB(record);
      }
      return records;
    }
  }

  if (!isSupabaseConfigured()) {
    return getAllFounderSubmissionsDB();
  }
  return [];
}

export async function loadFounderSubmissionForUser(
  authUserId: string,
): Promise<FounderSubmissionRecord | null> {
  const rows = await loadFounderSubmissionsForUser(authUserId);
  return rows[0] ?? null;
}

export async function fetchFounderAnalytics(
  adminKey?: string,
): Promise<FounderAnalytics> {
  const key = adminKey?.trim() ?? "";
  if (isSupabaseConfigured() && key) {
    try {
      const { data, error } = await getSupabase().rpc(
        "founder_analytics_summary",
        {
          p_admin_key: key,
        },
      );
      if (!error && data && typeof data === "object") {
        return data as FounderAnalytics;
      }
    } catch {
      /* fall through */
    }
  }

  const rows = await getAllFounderSubmissionsDB();
  const totalFounders = rows.length;
  const totalReferralClicks = rows.reduce((s, r) => s + r.visitCount, 0);
  const totalConversions = rows.reduce((s, r) => s + r.referralSignupCount, 0);
  const topFounders = [...rows]
    .sort(
      (a, b) =>
        b.visitCount +
        b.referralSignupCount * 3 -
        (a.visitCount + a.referralSignupCount * 3),
    )
    .slice(0, 10)
    .map((r) => ({
      id: r.id,
      founderName: r.founderName,
      startupName: r.startupName,
      referralCode: r.referralCode,
      visitCount: r.visitCount,
      referralSignupCount: r.referralSignupCount,
      viralScore: r.visitCount + r.referralSignupCount * 3,
    }));

  const startupMap = new Map<
    string,
    { founders: number; visitCount: number; referralSignupCount: number }
  >();
  for (const r of rows) {
    const cur = startupMap.get(r.startupName) ?? {
      founders: 0,
      visitCount: 0,
      referralSignupCount: 0,
    };
    cur.founders += 1;
    cur.visitCount += r.visitCount;
    cur.referralSignupCount += r.referralSignupCount;
    startupMap.set(r.startupName, cur);
  }
  const topStartups = [...startupMap.entries()]
    .map(([startupName, v]) => ({ startupName, ...v }))
    .sort((a, b) => b.visitCount - a.visitCount)
    .slice(0, 10);

  return {
    totalFounders,
    totalReferralClicks,
    totalConversions,
    topFounders,
    topStartups,
    trafficSources: [],
  };
}
