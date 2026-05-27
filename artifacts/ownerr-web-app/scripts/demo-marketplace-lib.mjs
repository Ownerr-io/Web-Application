import { createClient } from '@supabase/supabase-js';
import {
  DEMO_BUYER,
  DEMO_SELLER,
  DEMO_CONVERSATION_STARTUP_SLUG,
  DEMO_SELLER_STARTUP_SLUGS,
} from './demo-marketplace.constants.mjs';

export function createAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env.local',
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function findUserByEmail(admin, email) {
  let page = 1;
  const perPage = 200;
  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

export async function ensureAuthUser(admin, spec) {
  let user = await findUserByEmail(admin, spec.email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: spec.email,
      password: spec.password,
      email_confirm: true,
      user_metadata: spec.metadata,
    });
    if (error) throw error;
    user = data.user;
    console.log(`Created auth user: ${spec.email} (${user.id})`);
  } else {
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password: spec.password,
      user_metadata: { ...user.user_metadata, ...spec.metadata },
    });
    if (error) throw error;
    console.log(`Updated auth user: ${spec.email} (${user.id})`);
  }
  return user;
}

export async function upsertPlatformUser(admin, authUserId, email, displayName) {
  const { error } = await admin.from('platform_users').upsert(
    { auth_user_id: authUserId, email, display_name: displayName },
    { onConflict: 'auth_user_id' },
  );
  if (error) {
    const code = error.code ?? '';
    const status = error.status;
    const message = typeof error.message === 'string' ? error.message : '';
    const isMissing =
      code === '42P01' ||
      code === 'PGRST205' ||
      code === 'PGRST204' ||
      status === 404 ||
      message.includes('platform_users');

    if (isMissing) {
      const updateData = { email };
      if (displayName) {
        updateData.full_name = displayName;
      }
      const { error: userUpdateErr } = await admin
        .from('users')
        .update(updateData)
        .eq('auth_user_id', authUserId);
      if (userUpdateErr) {
        console.warn('Failed to update public.users:', userUpdateErr);
      }
      return;
    }
    throw error;
  }
}

export async function upsertMarketplaceProfile(admin, authUserId, spec) {
  const row = {
    auth_user_id: authUserId,
    desk_role: spec.profile.desk_role,
    metadata: spec.profile.metadata,
  };

  const { data: byRole } = await admin
    .from('marketplace_profiles')
    .select('id')
    .eq('auth_user_id', authUserId)
    .eq('desk_role', spec.profile.desk_role)
    .maybeSingle();
  if (byRole?.id) {
    const { error: upErr } = await admin.from('marketplace_profiles').update(row).eq('id', byRole.id);
    if (upErr) throw upErr;
    return byRole.id;
  }

  const tryComposite = await admin
    .from('marketplace_profiles')
    .upsert(row, { onConflict: 'auth_user_id,desk_role' })
    .select('id')
    .single();
  if (!tryComposite.error) return tryComposite.data.id;

  const trySingle = await admin
    .from('marketplace_profiles')
    .upsert(row, { onConflict: 'auth_user_id' })
    .select('id')
    .single();
  if (!trySingle.error) return trySingle.data.id;

  const { data: inserted, error: insErr } = await admin
    .from('marketplace_profiles')
    .insert(row)
    .select('id')
    .single();
  if (insErr) throw insErr;
  return inserted.id;
}

export async function upsertAppAccess(admin, authUserId, appSlug, role, profileId) {
  const { error } = await admin.from('user_app_access').upsert(
    {
      auth_user_id: authUserId,
      app_slug: appSlug,
      role,
      status: 'active',
      profile_id: profileId,
    },
    { onConflict: 'auth_user_id,app_slug' },
  );
  if (error) throw error;
}

async function upsertOwnerrProfile(admin, authUserId) {
  const { data: existing } = await admin
    .from('ownerr_profiles')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await admin
    .from('ownerr_profiles')
    .insert({ auth_user_id: authUserId })
    .select('id')
    .single();
  if (error) {
    const retry = await admin
      .from('ownerr_profiles')
      .select('id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (retry.data?.id) return retry.data.id;
    throw error;
  }
  return data.id;
}

async function startupIdsBySlug(admin, slugs) {
  const { data, error } = await admin.from('startups').select('id, slug').in('slug', slugs);
  if (error) throw error;
  const map = new Map((data ?? []).map((r) => [r.slug, r.id]));
  for (const slug of slugs) {
    if (!map.has(slug)) throw new Error(`Startup slug not found: ${slug}. Run marketplace seed migration.`);
  }
  return map;
}

/** Prefer catalog slugs; fall back to any published listings in production. */
export async function resolveDemoStartupSlugs(admin) {
  const preferred = [...DEMO_SELLER_STARTUP_SLUGS];
  const { data: preferredRows } = await admin
    .from('startups')
    .select('slug')
    .in('slug', preferred)
    .eq('status', 'published');
  const found = new Set((preferredRows ?? []).map((r) => r.slug));
  const sellerSlugs = preferred.filter((s) => found.has(s));
  if (sellerSlugs.length >= 3) {
    return {
      sellerSlugs: sellerSlugs.slice(0, 3),
      conversationSlug: found.has(DEMO_CONVERSATION_STARTUP_SLUG)
        ? DEMO_CONVERSATION_STARTUP_SLUG
        : sellerSlugs[0],
    };
  }

  const { data: fallback, error } = await admin
    .from('startups')
    .select('slug')
    .eq('status', 'published')
    .eq('visibility', 'public')
    .order('asking_price', { ascending: false, nullsFirst: false })
    .limit(3);
  if (error) throw error;
  const slugs = (fallback ?? []).map((r) => r.slug).filter(Boolean);
  if (slugs.length < 1) {
    throw new Error(
      'No published startups in database. Run: npm run marketplace:ensure-schema',
    );
  }
  while (slugs.length < 3) slugs.push(slugs[0]);
  return {
    sellerSlugs: slugs.slice(0, 3),
    conversationSlug: slugs.includes(DEMO_CONVERSATION_STARTUP_SLUG)
      ? DEMO_CONVERSATION_STARTUP_SLUG
      : slugs[0],
  };
}

export async function linkSellerStartups(admin, sellerAuthUserId, sellerProfileId, sellerSlugs) {
  const slugToId = await startupIdsBySlug(admin, sellerSlugs);
  for (const slug of sellerSlugs) {
    const startupId = slugToId.get(slug);
    const { error: upErr } = await admin
      .from('startups')
      .update({
        founder_user_id: sellerAuthUserId,
        status: 'published',
        visibility: 'public',
        updated_at: new Date().toISOString(),
      })
      .eq('id', startupId);
    if (upErr) throw upErr;

    const { error: listErr } = await admin.from('seller_listings').upsert(
      {
        startup_id: startupId,
        seller_profile_id: sellerProfileId,
        status: 'published',
        published_at: new Date().toISOString(),
      },
      { onConflict: 'startup_id,seller_profile_id' },
    );
    if (listErr) throw listErr;
  }
  console.log(`Linked ${sellerSlugs.length} startups to demo seller: ${sellerSlugs.join(', ')}`);
}

export async function clearDemoTransactionalData(admin, buyerProfileId, sellerProfileId) {
  const { data: convs, error: cErr } = await admin
    .from('conversations')
    .select('id')
    .or(`buyer_profile_id.eq.${buyerProfileId},seller_profile_id.eq.${sellerProfileId}`);
  if (cErr) throw cErr;
  const convIds = (convs ?? []).map((c) => c.id);
  if (convIds.length) {
    const { error: mErr } = await admin.from('messages').delete().in('conversation_id', convIds);
    if (mErr) throw mErr;
    const { error: dErr } = await admin.from('conversations').delete().in('id', convIds);
    if (dErr) throw dErr;
  }

  const { error: bErr } = await admin.from('bids').delete().eq('buyer_profile_id', buyerProfileId);
  if (bErr) throw bErr;
  const { error: iErr } = await admin
    .from('startup_interests')
    .delete()
    .eq('buyer_profile_id', buyerProfileId);
  if (iErr) throw iErr;
  console.log('Cleared demo bids, interests, conversations, and messages.');
}

export async function seedDemoTransactionalData(
  admin,
  buyerProfileId,
  sellerProfileId,
  buyerAuthUserId,
  sellerAuthUserId,
  { sellerSlugs, conversationSlug },
) {
  const interestSlugs = [...new Set([sellerSlugs[0], conversationSlug])];
  const slugToId = await startupIdsBySlug(admin, [
    ...new Set([...sellerSlugs, conversationSlug, ...interestSlugs]),
  ]);
  const stanId = slugToId.get(interestSlugs[0]);
  const sorioId = slugToId.get(conversationSlug);

  const interests = [
    {
      startup_id: stanId,
      buyer_profile_id: buyerProfileId,
      status: 'interested',
      message: 'Reviewing metrics and team structure for a potential acquisition.',
    },
    {
      startup_id: sorioId,
      buyer_profile_id: buyerProfileId,
      status: 'negotiating',
      message: 'Interested in a fast close if retention data checks out.',
    },
  ];

  for (const row of interests) {
    const { error } = await admin.from('startup_interests').upsert(row, {
      onConflict: 'startup_id,buyer_profile_id',
    });
    if (error) throw error;
  }

  await admin.from('bids').delete().eq('buyer_profile_id', buyerProfileId).eq('startup_id', sorioId);
  const { error: insBid } = await admin.from('bids').insert({
    startup_id: sorioId,
    buyer_profile_id: buyerProfileId,
    amount: 215000,
    currency: 'USD',
    status: 'under_review',
    message: 'Formal offer pending diligence on churn and cohort retention.',
  });
  if (insBid) throw insBid;

  const { data: conversation, error: convErr } = await admin
    .from('conversations')
    .upsert(
      {
        startup_id: sorioId,
        buyer_profile_id: buyerProfileId,
        seller_profile_id: sellerProfileId,
        status: 'open',
      },
      { onConflict: 'startup_id,buyer_profile_id,seller_profile_id' },
    )
    .select('id')
    .single();
  if (convErr) throw convErr;

  const now = Date.now();
  const thread = [
    {
      conversation_id: conversation.id,
      sender_user_id: buyerAuthUserId,
      body: 'Hi — we are interested in Sorio AI. Can you share latest MRR and churn by plan?',
      created_at: new Date(now - 3600_000 * 48).toISOString(),
    },
    {
      conversation_id: conversation.id,
      sender_user_id: sellerAuthUserId,
      body: 'Thanks for reaching out. Happy to share a data room link and schedule a call this week.',
      created_at: new Date(now - 3600_000 * 40).toISOString(),
    },
    {
      conversation_id: conversation.id,
      sender_user_id: buyerAuthUserId,
      body: 'Great — please include cohort retention for the last 6 months in the data room.',
      created_at: new Date(now - 3600_000 * 12).toISOString(),
    },
  ];

  const { error: delMsg } = await admin.from('messages').delete().eq('conversation_id', conversation.id);
  if (delMsg) throw delMsg;
  const { error: msgErr } = await admin.from('messages').insert(thread);
  if (msgErr) throw msgErr;

  console.log('Seeded demo interests, bid, conversation, and messages.');
}

export async function seedDemoUsersFull(admin) {
  const { sellerSlugs, conversationSlug } = await resolveDemoStartupSlugs(admin);
  const buyerUser = await ensureAuthUser(admin, DEMO_BUYER);
  const sellerUser = await ensureAuthUser(admin, DEMO_SELLER);

  await upsertPlatformUser(
    admin,
    buyerUser.id,
    DEMO_BUYER.email,
    DEMO_BUYER.metadata.full_name,
  );
  await upsertPlatformUser(
    admin,
    sellerUser.id,
    DEMO_SELLER.email,
    DEMO_SELLER.metadata.full_name,
  );

  const buyerProfileId = await upsertMarketplaceProfile(admin, buyerUser.id, DEMO_BUYER);
  const sellerProfileId = await upsertMarketplaceProfile(admin, sellerUser.id, DEMO_SELLER);

  await upsertAppAccess(admin, buyerUser.id, 'marketplace', DEMO_BUYER.membershipRole, buyerProfileId);
  await upsertAppAccess(admin, sellerUser.id, 'marketplace', DEMO_SELLER.membershipRole, sellerProfileId);

  await linkSellerStartups(admin, sellerUser.id, sellerProfileId, sellerSlugs);
  await clearDemoTransactionalData(admin, buyerProfileId, sellerProfileId);
  await seedDemoTransactionalData(
    admin,
    buyerProfileId,
    sellerProfileId,
    buyerUser.id,
    sellerUser.id,
    { sellerSlugs, conversationSlug },
  );

  return { buyerUser, sellerUser, buyerProfileId, sellerProfileId };
}
