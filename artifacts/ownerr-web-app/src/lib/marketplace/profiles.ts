import type { User } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import type { DeskMarketplaceRole } from '@/lib/marketplace/types';
import type { AuthRole } from '@/lib/auth/types';

export type MarketplaceProfileRow = {
  id: string;
  auth_user_id: string;
  desk_role: string | null;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export function authRoleToDeskRole(role: AuthRole): DeskMarketplaceRole {
  return role === 'buyer' ? 'buyer' : 'seller';
}

export function deskRoleToAuthRole(desk: string | null): AuthRole | null {
  if (desk === 'buyer') return 'buyer';
  if (desk === 'seller' || desk === 'founder') return 'founder';
  return null;
}

export async function fetchMarketplaceProfilesForUser(
  authUserId: string,
): Promise<MarketplaceProfileRow[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await getSupabase()
    .from('marketplace_profiles')
    .select('id, auth_user_id, desk_role, status, metadata, created_at, updated_at')
    .eq('auth_user_id', authUserId)
    .eq('status', 'active');
  if (error) throw error;
  return (data ?? []) as MarketplaceProfileRow[];
}

const PROFILE_SELECT =
  'id, auth_user_id, desk_role, status, metadata, created_at, updated_at';

function isUpsertConstraintMismatch(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '42P10' ||
    error.code === '23505' ||
    (typeof error.message === 'string' &&
      (error.message.includes('no unique or exclusion constraint matching the ON CONFLICT') ||
        error.message.includes('duplicate key')))
  );
}

async function upsertMarketplaceProfileRow(
  authUserId: string,
  deskRole: 'buyer' | 'seller',
  metadata: Record<string, unknown>,
): Promise<MarketplaceProfileRow> {
  const supabase = getSupabase();
  const row = {
    auth_user_id: authUserId,
    desk_role: deskRole,
    status: 'active' as const,
    metadata,
  };

  const { data, error } = await supabase
    .from('marketplace_profiles')
    .upsert(row, { onConflict: 'auth_user_id,desk_role' })
    .select(PROFILE_SELECT)
    .single();

  if (!error) return data as MarketplaceProfileRow;
  if (!isUpsertConstraintMismatch(error)) throw error;

  const { data: rows, error: listErr } = await supabase
    .from('marketplace_profiles')
    .select(PROFILE_SELECT)
    .eq('auth_user_id', authUserId);
  if (listErr) throw listErr;

  const list = (rows ?? []) as MarketplaceProfileRow[];
  const matching = list.find((r) => r.desk_role === deskRole);
  if (matching) {
    const { data: updated, error: upErr } = await supabase
      .from('marketplace_profiles')
      .update({ status: 'active', metadata })
      .eq('id', matching.id)
      .select(PROFILE_SELECT)
      .single();
    if (upErr) throw upErr;
    return updated as MarketplaceProfileRow;
  }

  if (list.length === 1) {
    const { data: updated, error: upErr } = await supabase
      .from('marketplace_profiles')
      .update({ status: 'active', desk_role: deskRole, metadata })
      .eq('id', list[0]!.id)
      .select(PROFILE_SELECT)
      .single();
    if (upErr) throw upErr;
    return updated as MarketplaceProfileRow;
  }

  const { data: inserted, error: insErr } = await supabase
    .from('marketplace_profiles')
    .insert(row)
    .select(PROFILE_SELECT)
    .single();
  if (insErr) {
    if (isUpsertConstraintMismatch(insErr) && list[0]) {
      const { data: updated, error: upErr } = await supabase
        .from('marketplace_profiles')
        .update({ status: 'active', desk_role: deskRole, metadata })
        .eq('id', list[0].id)
        .select(PROFILE_SELECT)
        .single();
      if (upErr) throw upErr;
      return updated as MarketplaceProfileRow;
    }
    throw insErr;
  }
  return inserted as MarketplaceProfileRow;
}

export async function ensureMarketplaceProfile(
  user: User,
  role: DeskMarketplaceRole,
  metadata?: Record<string, unknown>,
): Promise<MarketplaceProfileRow> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }
  const deskRole = role === 'seller' ? 'seller' : 'buyer';
  const baseMeta = {
    email: user.email,
    display_name: user.user_metadata?.full_name ?? user.email?.split('@')[0],
  };
  return upsertMarketplaceProfileRow(user.id, deskRole, { ...baseMeta, ...metadata });
}

export async function ensureBuyerProfile(user: User): Promise<MarketplaceProfileRow> {
  return ensureMarketplaceProfile(user, 'buyer');
}

export async function ensureSellerProfile(user: User): Promise<MarketplaceProfileRow> {
  return ensureMarketplaceProfile(user, 'seller');
}

export async function getBuyerProfileId(authUserId: string): Promise<string | null> {
  const rows = await fetchMarketplaceProfilesForUser(authUserId);
  return rows.find((r) => r.desk_role === 'buyer')?.id ?? null;
}

export async function getSellerProfileId(authUserId: string): Promise<string | null> {
  const rows = await fetchMarketplaceProfilesForUser(authUserId);
  return rows.find((r) => r.desk_role === 'seller' || r.desk_role === 'founder')?.id ?? null;
}
