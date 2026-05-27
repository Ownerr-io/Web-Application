import type { User } from '@supabase/supabase-js';

export function isPlatformAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;
  const role = user.user_metadata?.role;
  if (role === 'admin') return true;
  const raw = import.meta.env.VITE_PLATFORM_ADMIN_EMAILS as string | undefined;
  if (!raw?.trim() || !user.email) return false;
  const allowed = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(user.email.trim().toLowerCase());
}
