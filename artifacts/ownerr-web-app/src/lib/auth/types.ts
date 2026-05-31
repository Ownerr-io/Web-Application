export type AuthRole = "buyer" | "founder";

/** Marketplace desk identity (Supabase Auth + user_metadata.role). */
export type DeskUser = {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
  avatarSeed?: string;
  createdAt: string;
};
