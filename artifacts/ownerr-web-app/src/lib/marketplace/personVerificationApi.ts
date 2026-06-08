import { getSupabase } from "@/lib/supabase/client";
import type { AuthRole } from "@/lib/auth/types";

export type PersonVerificationStatus =
  | "draft"
  | "pending"
  | "verified"
  | "rejected";

export type PersonVerificationProfile = {
  id: string;
  marketplace_profile_id: string;
  auth_user_id: string;
  full_name: string | null;
  country_code: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  email: string | null;
  id_document_type: "passport" | "national_id" | "driver_license" | null;
  verification_status: PersonVerificationStatus;
  verification_level: number;
  identity_provider: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
};

function parseProfile(data: unknown): PersonVerificationProfile {
  const row =
    typeof data === "object" && data !== null && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  return {
    id: String(row.id ?? ""),
    marketplace_profile_id: String(row.marketplace_profile_id ?? ""),
    auth_user_id: String(row.auth_user_id ?? ""),
    full_name: typeof row.full_name === "string" ? row.full_name : null,
    country_code:
      typeof row.country_code === "string" ? row.country_code : null,
    linkedin_url:
      typeof row.linkedin_url === "string" ? row.linkedin_url : null,
    twitter_url: typeof row.twitter_url === "string" ? row.twitter_url : null,
    email: typeof row.email === "string" ? row.email : null,
    id_document_type:
      row.id_document_type === "passport" ||
      row.id_document_type === "national_id" ||
      row.id_document_type === "driver_license"
        ? row.id_document_type
        : null,
    verification_status:
      row.verification_status === "draft" ||
      row.verification_status === "pending" ||
      row.verification_status === "verified" ||
      row.verification_status === "rejected"
        ? row.verification_status
        : "draft",
    verification_level:
      typeof row.verification_level === "number" ? row.verification_level : 0,
    identity_provider:
      typeof row.identity_provider === "string" ? row.identity_provider : null,
    verified_at: typeof row.verified_at === "string" ? row.verified_at : null,
    rejection_reason:
      typeof row.rejection_reason === "string" ? row.rejection_reason : null,
  };
}

export function deskRoleForPersonVerification(
  role: AuthRole,
): "buyer" | "seller" {
  return role === "buyer" ? "buyer" : "seller";
}

export async function fetchPersonVerificationProfile(
  deskRole: "buyer" | "seller",
): Promise<PersonVerificationProfile> {
  const { data, error } = await getSupabase().rpc(
    "get_or_create_person_verification_profile",
    { p_desk_role: deskRole },
  );
  if (error) throw new Error(error.message);
  return parseProfile(data);
}

export async function savePersonVerificationProfile(
  deskRole: "buyer" | "seller",
  input: {
    full_name: string;
    country_code: string;
    linkedin_url: string;
    twitter_url?: string;
    email?: string;
    id_document_type?: PersonVerificationProfile["id_document_type"];
  },
): Promise<PersonVerificationProfile> {
  const { data, error } = await getSupabase().rpc(
    "upsert_person_verification_profile",
    {
      p_desk_role: deskRole,
      p_payload: input,
    },
  );
  if (error) throw new Error(error.message);
  return parseProfile(data);
}

export async function submitPersonVerificationProfile(
  deskRole: "buyer" | "seller",
): Promise<PersonVerificationProfile> {
  const { data, error } = await getSupabase().rpc(
    "submit_person_verification_profile",
    { p_desk_role: deskRole },
  );
  if (error) throw new Error(error.message);
  return parseProfile(data);
}
