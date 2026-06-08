/**
 * Ensures a draft QA company exists on the Clykur founder seller desk for gate / intake testing.
 * Idempotent: re-runs update intake; does not delete Clykur production listing.
 *
 * Usage: node --env-file=.env.local scripts/seed-marketplace-qa-company.mjs
 */
import {
  QA_COMPANY_SLUG,
  deskEnv,
  pgClient,
  resolveClykurFounderEmail,
  sessionForEmail,
} from "./marketplace-desk-auth.mjs";

const { databaseUrl, supabaseUrl, serviceKey, anonKey } = deskEnv();
if (!databaseUrl || !supabaseUrl || !serviceKey || !anonKey) {
  console.error("Missing DATABASE_URL / SUPABASE_URL / keys in .env.local");
  process.exit(1);
}

const founderEmail = await resolveClykurFounderEmail(databaseUrl);
const session = await sessionForEmail(supabaseUrl, serviceKey, anonKey, founderEmail);
const { client, email: founderLoginEmail } = session;

const payload = {
  slug: QA_COMPANY_SLUG,
  company_name: "Ownerr Desk QA",
  description: "Automated QA listing for seller desk smoke tests. Not for publish.",
  industry: "SaaS",
  currency: "USD",
  one_line_pitch: "Internal QA — verification gate testing",
  founder_name: "Desk QA Founder",
  founder_email: founderLoginEmail ?? founderEmail,
  founder_linkedin: "https://linkedin.com/in/ownerr-qa",
  declared_domain: "ownerr-desk-qa.test",
  asking_price_usd: "250000",
  business_model: "Subscription",
};

const { data, error } = await client.rpc("founder_save_seller_intake", {
  p_payload: payload,
  p_finalize: false,
});
if (error) {
  console.error("founder_save_seller_intake failed:", error.message);
  process.exit(1);
}

const row = data ?? {};
const startupId = String(row.startup_id ?? "");
const slug = String(row.slug ?? QA_COMPANY_SLUG);
if (!startupId) {
  console.error("No startup_id returned");
  process.exit(1);
}

const { error: submitErr } = await client.rpc("founder_submit_listing_for_verification", {
  p_slug: slug,
});
if (submitErr && !/already|submitted/i.test(submitErr.message)) {
  console.warn("submit listing (non-fatal):", submitErr.message);
}

const pg = pgClient(databaseUrl);
await pg.connect();
try {
  const { rows } = await pg.query(
    `SELECT s.slug, s.listing_lifecycle, g.identity_status, g.domain_status,
            g.business_email_status, g.revenue_status
     FROM startups s
     LEFT JOIN listing_verification_gates g ON g.startup_id = s.id
     WHERE s.id = $1`,
    [startupId],
  );
  console.log("QA company ready:", rows[0] ?? { slug, startupId });
} finally {
  await pg.end();
}
