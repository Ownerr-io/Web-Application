import { getSupabase } from "@/lib/supabase/client";
import type {
  FounderListFilter,
  OwnerrOsCharts,
  OwnerrOsFounderDetail,
  OwnerrOsFounderRow,
} from "./adminFoundersTypes";

function mapFounder(raw: Record<string, unknown>): OwnerrOsFounderRow {
  const founderId = String(raw.founderId ?? "");
  return {
    id: founderId,
    founderId,
    founderName: String(raw.founderName ?? ""),
    startupName: String(raw.startupName ?? ""),
    referralCode: String(raw.referralCode ?? ""),
    visitCount: Number(raw.visitCount) || 0,
    signupCount: Number(raw.signupCount) || 0,
    conversionRate: Number(raw.conversionRate) || 0,
    viralScore: Number(raw.viralScore) || 0,
    category: raw.category != null ? String(raw.category) : null,
    location: raw.location != null ? String(raw.location) : null,
    createdAt: String(raw.createdAt ?? ""),
  };
}

export async function fetchAdminOwnerrOsFounders(): Promise<
  OwnerrOsFounderRow[]
> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("admin_ownerr_os_founders");
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map(mapFounder);
}

export async function fetchAdminOwnerrOsFounderDetail(
  founderId: string,
): Promise<OwnerrOsFounderDetail | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("admin_ownerr_os_founder_detail", {
    p_founder_id: founderId,
  });
  if (error) throw new Error(error.message);
  if (!data) return null;
  return data as OwnerrOsFounderDetail;
}

export async function fetchAdminOwnerrOsCharts(): Promise<OwnerrOsCharts | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("admin_ownerr_os_charts");
  if (error) return null;
  const raw = data as Record<string, unknown>;
  return {
    submissionsByDay: Array.isArray(raw.submissionsByDay)
      ? (raw.submissionsByDay as OwnerrOsCharts["submissionsByDay"])
      : [],
    visitsByDay: Array.isArray(raw.visitsByDay)
      ? (raw.visitsByDay as OwnerrOsCharts["visitsByDay"])
      : [],
    signupsByDay: Array.isArray(raw.signupsByDay)
      ? (raw.signupsByDay as OwnerrOsCharts["signupsByDay"])
      : [],
    trafficSources: Array.isArray(raw.trafficSources)
      ? (raw.trafficSources as OwnerrOsCharts["trafficSources"])
      : [],
    listingStatusBreakdown: Array.isArray(raw.listingStatusBreakdown)
      ? (raw.listingStatusBreakdown as OwnerrOsCharts["listingStatusBreakdown"])
      : [],
    founderFunnel: Array.isArray(raw.founderFunnel)
      ? (raw.founderFunnel as OwnerrOsCharts["founderFunnel"])
      : [],
  };
}

export function filterOwnerrOsFounders(
  rows: OwnerrOsFounderRow[],
  filter: FounderListFilter,
): OwnerrOsFounderRow[] {
  if (filter === "all") return rows;
  return rows.filter((f) => {
    switch (filter) {
      case "high_performers":
        return f.viralScore >= 10 || f.signupCount >= 3;
      case "no_visits":
        return f.visitCount === 0;
      case "has_signups":
        return f.signupCount > 0;
      default:
        return true;
    }
  });
}
