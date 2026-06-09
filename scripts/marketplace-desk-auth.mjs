import pg from "pg";
import { createClient } from "@supabase/supabase-js";

export const QA_COMPANY_SLUG = "ownerr-desk-qa";

export function deskEnv() {
  const databaseUrl =
    process.env.DATABASE_URL_MIGRATE?.trim() ??
    process.env.DATABASE_URL?.trim() ??
    process.env.DATABASE_URL_POOLER?.trim();
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim();
  return { databaseUrl, supabaseUrl, serviceKey, anonKey };
}

export function pgClient(databaseUrl) {
  return new pg.Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
  });
}

export async function resolveClykurFounderEmail(databaseUrl) {
  const client = pgClient(databaseUrl);
  await client.connect();
  try {
    const { rows } = await client.query(`
      SELECT u.email
      FROM public.marketplace_companies s
      JOIN auth.users u ON u.id = s.founder_user_id
      WHERE s.slug = 'clykur-f6724fa7'
      LIMIT 1`);
    if (!rows[0]?.email) throw new Error("Clykur founder not found");
    return rows[0].email;
  } finally {
    await client.end();
  }
}

export async function resolveBuyerDeskEmail(databaseUrl) {
  const client = pgClient(databaseUrl);
  await client.connect();
  try {
    const { rows } = await client.query(`
      SELECT u.email
      FROM auth.users u
      JOIN public.marketplace_accounts mp ON mp.auth_user_id = u.id AND mp.desk_role = 'buyer'
      WHERE u.raw_user_meta_data->>'role' = 'buyer' AND mp.status = 'active'
      ORDER BY u.updated_at DESC NULLS LAST
      LIMIT 1`);
    if (!rows[0]?.email) throw new Error("Buyer desk user not found");
    return rows[0].email;
  } finally {
    await client.end();
  }
}

/** Real user JWT for PostgREST (same as app after magic link). */
export async function sessionForEmail(supabaseUrl, serviceKey, anonKey, email) {
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anon = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkErr) throw linkErr;
  const tokenHash = link.properties?.hashed_token;
  if (!tokenHash) throw new Error("hashed_token missing from generateLink");
  const { data, error } = await anon.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });
  if (error) throw error;
  if (!data.session?.access_token) throw new Error("No session from verifyOtp");
  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await client.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
  return {
    client,
    userId: data.session.user.id,
    email: data.session.user.email,
    role: data.session.user.user_metadata?.role,
  };
}
