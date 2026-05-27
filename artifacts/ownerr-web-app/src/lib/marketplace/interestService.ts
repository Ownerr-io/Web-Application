import type { User } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { MarketplaceError, mapSupabaseError } from '@/lib/marketplace/errors';
import { ensureBuyerProfile, getBuyerProfileId, getSellerProfileId } from '@/lib/marketplace/profiles';
import type { DealRelationshipStage, MarketplaceInterestRecord } from '@/lib/marketplace/types';
import type { AuthRole } from '@/lib/auth/types';

function requireSupabase() {
  if (!isSupabaseConfigured()) throw new MarketplaceError('Supabase is not configured', 'not_configured');
  return getSupabase();
}

function slugFromRow(row: { startups?: { slug: string } | { slug: string }[] | null }): string {
  const s = row.startups;
  if (Array.isArray(s)) return s[0]?.slug ?? '';
  return s?.slug ?? '';
}

function mapRow(
  row: {
    id: string;
    startup_id: string;
    status: string;
    message: string | null;
    created_at: string;
    updated_at: string;
    startups?: { slug: string } | { slug: string }[] | null;
  },
  buyer: { auth_user_id: string; metadata: Record<string, unknown> },
  offerAmount: number | null,
): MarketplaceInterestRecord {
  const meta = buyer.metadata ?? {};
  return {
    id: row.id,
    listingId: slugFromRow(row) || row.startup_id,
    buyerUserId: buyer.auth_user_id,
    buyerName: (meta.display_name as string) ?? 'Buyer',
    buyerRole: 'buyer',
    email: (meta.email as string) ?? '',
    offerAmount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    stage: row.status as DealRelationshipStage,
    messages: row.message
      ? [
          {
            id: row.id,
            senderUserId: buyer.auth_user_id,
            senderName: (meta.display_name as string) ?? 'You',
            senderRole: 'buyer' as AuthRole,
            body: row.message,
            createdAt: row.created_at,
          },
        ]
      : [],
  };
}

async function startupIdsForSellerAuthUser(authUserId: string): Promise<string[]> {
  const ids = new Set<string>();
  const sellerProfileId = await getSellerProfileId(authUserId);
  if (sellerProfileId) {
    const { data: links, error: linkErr } = await requireSupabase()
      .from('seller_listings')
      .select('startup_id')
      .eq('seller_profile_id', sellerProfileId);
    if (linkErr) throw mapSupabaseError(linkErr);
    for (const row of links ?? []) ids.add(row.startup_id as string);
  }
  const { data: founderRows, error: founderErr } = await requireSupabase()
    .from('startups')
    .select('id')
    .eq('founder_user_id', authUserId);
  if (founderErr) throw mapSupabaseError(founderErr);
  for (const row of founderRows ?? []) ids.add(row.id as string);
  return [...ids];
}

async function startupIdForSlug(slug: string): Promise<{ id: string; slug: string }> {
  const { data, error } = await requireSupabase()
    .from('startups')
    .select('id, slug')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw mapSupabaseError(error);
  if (!data?.id) throw new MarketplaceError('Startup not found', 'not_found');
  return data as { id: string; slug: string };
}

export async function expressInterest(input: {
  user: User;
  listingSlug: string;
  message: string;
  offerAmount?: number | null;
}): Promise<MarketplaceInterestRecord> {
  const profile = await ensureBuyerProfile(input.user);
  const startup = await startupIdForSlug(input.listingSlug);
  const { data: interest, error } = await requireSupabase()
    .from('startup_interests')
    .upsert(
      {
        startup_id: startup.id,
        buyer_profile_id: profile.id,
        status: 'interested',
        message: input.message,
      },
      { onConflict: 'startup_id,buyer_profile_id' },
    )
    .select('id, startup_id, status, message, created_at, updated_at, startups(slug)')
    .single();
  if (error) throw mapSupabaseError(error);

  if (input.offerAmount != null && input.offerAmount > 0) {
    await requireSupabase().from('bids').insert({
      startup_id: startup.id,
      buyer_profile_id: profile.id,
      amount: input.offerAmount,
      currency: 'USD',
      status: 'submitted',
      message: input.message,
    });
  }

  return mapRow(
    { ...interest, startups: { slug: startup.slug } },
    {
      auth_user_id: input.user.id,
      metadata: {
        display_name: input.user.user_metadata?.full_name ?? input.user.email?.split('@')[0],
        email: input.user.email,
      },
    },
    input.offerAmount ?? null,
  );
}

export async function withdrawInterest(interestId: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('startup_interests')
    .update({ status: 'withdrawn', updated_at: new Date().toISOString() })
    .eq('id', interestId);
  if (error) throw mapSupabaseError(error);
}

export async function listBuyerInterests(authUserId: string): Promise<MarketplaceInterestRecord[]> {
  const buyerProfileId = await getBuyerProfileId(authUserId);
  if (!buyerProfileId) return [];
  const { data, error } = await requireSupabase()
    .from('startup_interests')
    .select('id, startup_id, status, message, created_at, updated_at, startups(slug)')
    .eq('buyer_profile_id', buyerProfileId)
    .neq('status', 'withdrawn')
    .order('updated_at', { ascending: false });
  if (error) throw mapSupabaseError(error);

  const { data: bids } = await requireSupabase()
    .from('bids')
    .select('startup_id, amount')
    .eq('buyer_profile_id', buyerProfileId);
  const offerByStartup = new Map((bids ?? []).map((b) => [b.startup_id as string, Number(b.amount)]));

  return (data ?? []).map((row) =>
    mapRow(
      row as Parameters<typeof mapRow>[0],
      { auth_user_id: authUserId, metadata: {} },
      offerByStartup.get(row.startup_id as string) ?? null,
    ),
  );
}

export async function listInterestsForStartupSlug(slug: string): Promise<MarketplaceInterestRecord[]> {
  const startup = await startupIdForSlug(slug);
  const { data, error } = await requireSupabase()
    .from('startup_interests')
    .select(
      'id, startup_id, status, message, created_at, updated_at, startups(slug), marketplace_profiles!inner(auth_user_id, metadata)',
    )
    .eq('startup_id', startup.id)
    .neq('status', 'withdrawn');
  if (error) throw mapSupabaseError(error);

  return (data ?? []).map((row) => {
    const raw = row as {
      marketplace_profiles:
        | { auth_user_id: string; metadata: Record<string, unknown> }
        | { auth_user_id: string; metadata: Record<string, unknown> }[];
    };
    const mp = Array.isArray(raw.marketplace_profiles)
      ? raw.marketplace_profiles[0]
      : raw.marketplace_profiles;
    return mapRow(row as Parameters<typeof mapRow>[0], mp, null);
  });
}

export async function listSellerInterestsForOwner(authUserId: string): Promise<MarketplaceInterestRecord[]> {
  const ids = await startupIdsForSellerAuthUser(authUserId);
  if (!ids.length) return [];

  const { data, error } = await requireSupabase()
    .from('startup_interests')
    .select(
      'id, startup_id, status, message, created_at, updated_at, startups(slug), marketplace_profiles!inner(auth_user_id, metadata)',
    )
    .in('startup_id', ids)
    .neq('status', 'withdrawn');
  if (error) throw mapSupabaseError(error);

  return (data ?? []).map((row) => {
    const raw = row as {
      marketplace_profiles:
        | { auth_user_id: string; metadata: Record<string, unknown> }
        | { auth_user_id: string; metadata: Record<string, unknown> }[];
    };
    const mp = Array.isArray(raw.marketplace_profiles)
      ? raw.marketplace_profiles[0]
      : raw.marketplace_profiles;
    return mapRow(row as Parameters<typeof mapRow>[0], mp, null);
  });
}

export async function updateInterestStage(
  interestId: string,
  stage: DealRelationshipStage,
): Promise<void> {
  const { error } = await requireSupabase()
    .from('startup_interests')
    .update({ status: stage, updated_at: new Date().toISOString() })
    .eq('id', interestId);
  if (error) throw mapSupabaseError(error);
}
