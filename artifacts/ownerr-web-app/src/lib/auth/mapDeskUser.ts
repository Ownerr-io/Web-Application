import type { User } from "@supabase/supabase-js";
import type { AuthRole, DeskUser } from "@/lib/auth/types";
import {
  DEMO_MARKETPLACE_BUYER_EMAIL,
  DEMO_MARKETPLACE_SELLER_EMAIL,
} from "@/lib/demo/demoAccountCatalog";

function parseRole(
  metadata: Record<string, unknown> | undefined,
): AuthRole | null {
  const role = metadata?.role;
  if (role === "buyer" || role === "founder") return role;
  const desk = metadata?.desk_role;
  if (desk === "buyer") return "buyer";
  if (desk === "seller" || desk === "founder") return "founder";
  return null;
}

function roleFromDemoEmail(email: string | undefined): AuthRole | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  const buyer = DEMO_MARKETPLACE_BUYER_EMAIL.toLowerCase();
  const seller = DEMO_MARKETPLACE_SELLER_EMAIL.toLowerCase();
  if (normalized === buyer) return "buyer";
  if (normalized === seller) return "founder";
  return null;
}

export function mapDeskUserFromSupabase(
  user: User | null | undefined,
): DeskUser | null {
  if (!user) return null;
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const role = parseRole(meta) ?? roleFromDemoEmail(user.email);
  if (!role) return null;
  const name =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "User";
  return {
    id: user.id,
    name,
    email: user.email ?? "",
    role,
    avatarSeed: user.id,
    createdAt: user.created_at ?? new Date().toISOString(),
  };
}
