import { getSupabase } from "@/lib/supabase/client";
import type {
  MemberListFilter,
  NetworkCharts,
  NetworkMemberDetail,
  NetworkMemberRow,
} from "./adminMembersTypes";

function mapMember(raw: Record<string, unknown>): NetworkMemberRow {
  const userId = String(raw.userId ?? "");
  return {
    id: userId,
    userId,
    username: String(raw.username ?? ""),
    email: String(raw.email ?? ""),
    fullName: String(raw.fullName ?? ""),
    status: String(raw.status ?? "active"),
    verificationStatus: String(raw.verificationStatus ?? "unverified"),
    platformRole: String(raw.platformRole ?? "member"),
    referralCode: String(raw.referralCode ?? ""),
    createdAt: String(raw.createdAt ?? ""),
    lastLoginAt: raw.lastLoginAt != null ? String(raw.lastLoginAt) : null,
    onboardingCompleted: Boolean(raw.onboardingCompleted),
    profileCompletionScore: Number(raw.profileCompletionScore) || 0,
    userType: raw.userType != null ? String(raw.userType) : null,
    headline: raw.headline != null ? String(raw.headline) : null,
    points: Number(raw.points) || 0,
    walletBalance: Number(raw.walletBalance) || 0,
    referralsMade: Number(raw.referralsMade) || 0,
    referralsReceived: Number(raw.referralsReceived) || 0,
  };
}

export async function fetchAdminNetworkMembers(): Promise<NetworkMemberRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("admin_network_members");
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map(mapMember);
}

export async function fetchAdminNetworkMemberDetail(
  userId: string,
): Promise<NetworkMemberDetail | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("admin_network_member_detail", {
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
  if (!data) return null;
  return data as NetworkMemberDetail;
}

export async function fetchAdminNetworkCharts(): Promise<NetworkCharts | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("admin_network_charts");
  if (error) return null;
  const raw = data as Record<string, unknown>;
  return {
    signupsByDay: Array.isArray(raw.signupsByDay)
      ? (raw.signupsByDay as NetworkCharts["signupsByDay"])
      : [],
    referralsByDay: Array.isArray(raw.referralsByDay)
      ? (raw.referralsByDay as NetworkCharts["referralsByDay"])
      : [],
    walletVolumeByDay: Array.isArray(raw.walletVolumeByDay)
      ? (raw.walletVolumeByDay as NetworkCharts["walletVolumeByDay"])
      : [],
    referralStatusBreakdown: Array.isArray(raw.referralStatusBreakdown)
      ? (raw.referralStatusBreakdown as NetworkCharts["referralStatusBreakdown"])
      : [],
    profileCompletionBuckets: Array.isArray(raw.profileCompletionBuckets)
      ? (raw.profileCompletionBuckets as NetworkCharts["profileCompletionBuckets"])
      : [],
  };
}

export function filterNetworkMembers(
  rows: NetworkMemberRow[],
  filter: MemberListFilter,
): NetworkMemberRow[] {
  if (filter === "all") return rows;
  const now = Date.now();
  const inactiveMs = 30 * 24 * 60 * 60 * 1000;

  return rows.filter((m) => {
    switch (filter) {
      case "verification_pending":
        return m.verificationStatus === "pending";
      case "incomplete_profile":
        return !m.onboardingCompleted || m.profileCompletionScore < 50;
      case "inactive": {
        const last = m.lastLoginAt ?? m.createdAt;
        return now - new Date(last).getTime() > inactiveMs;
      }
      case "suspended":
        return m.status === "suspended";
      default:
        return true;
    }
  });
}
