import { founderAvatarUrl } from "@/lib/utils";

type OwnerrNetworkAvatarUser = {
  profile_image: string | null;
  username: string;
  auth_user_id?: string;
};

/** Same avatar URL in app nav and profile — uploaded image or stable Dicebear from username. */
export function ownerrNetworkAvatarUrl(user: OwnerrNetworkAvatarUser): string {
  const uploaded = user.profile_image?.trim();
  if (uploaded) return uploaded;
  const seed = user.username?.trim() || user.auth_user_id || "member";
  return founderAvatarUrl(seed);
}
