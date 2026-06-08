/**
 * End-to-end desk smoke: authenticates real Supabase users (service role magic link)
 * and exercises every buyer/seller desk data path used by app pages.
 *
 * Requires: DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_ANON_KEY
 * Optional: npm run dev (for worker health only; desk tests are API-level)
 */
import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import {
  QA_COMPANY_SLUG,
  deskEnv,
  pgClient,
  resolveBuyerDeskEmail,
  resolveClykurFounderEmail,
  sessionForEmail,
} from "./marketplace-desk-auth.mjs";
import { T } from "../lib/db-schema/physicalTables.mjs";

const { databaseUrl, supabaseUrl, serviceKey, anonKey } = deskEnv();
const skipAll = !databaseUrl || !supabaseUrl || !serviceKey || !anonKey;

async function expectOk(label, fn) {
  try {
    await fn();
    return { label, ok: true };
  } catch (e) {
    const msg =
      e && typeof e === "object" && "message" in e
        ? String(e.message)
        : e instanceof Error
          ? e.message
          : JSON.stringify(e);
    return { label, ok: false, error: msg };
  }
}

async function buyerProfileId(client, authUserId) {
  const { data, error } = await client
    .from(T.accounts)
    .select("id")
    .eq("auth_user_id", authUserId)
    .eq("desk_role", "buyer")
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

async function sellerProfileId(client, authUserId) {
  const { data, error } = await client
    .from(T.accounts)
    .select("id")
    .eq("auth_user_id", authUserId)
    .in("desk_role", ["seller", "founder"])
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

describe("marketplace desk (buyer + seller, live auth)", { skip: skipAll }, () => {
  /** @type {import('@supabase/supabase-js').SupabaseClient} */
  let sellerClient;
  /** @type {import('@supabase/supabase-js').SupabaseClient} */
  let buyerClient;
  let sellerUserId;
  let buyerUserId;
  let clykurSlug = "clykur-f6724fa7";

  before(async () => {
    const sellerEmail = await resolveClykurFounderEmail(databaseUrl);
    const buyerEmail = await resolveBuyerDeskEmail(databaseUrl);
    const seller = await sessionForEmail(supabaseUrl, serviceKey, anonKey, sellerEmail);
    const buyer = await sessionForEmail(supabaseUrl, serviceKey, anonKey, buyerEmail);
    sellerClient = seller.client;
    buyerClient = buyer.client;
    sellerUserId = seller.userId;
    buyerUserId = buyer.userId;
    assert.ok(["founder", "seller"].includes(String(seller.role)), `seller role got ${seller.role}`);
    assert.equal(buyer.role, "buyer", "buyer metadata role");
  });

  it("seller dashboard: listings + snapshots + inbox", async () => {
    const results = [];

    results.push(
      await expectOk("getUserListings (seller_listings/startups)", async () => {
        const { data, error } = await sellerClient
          .from(T.companies)
          .select("id, slug, title, founder_user_id")
          .eq("founder_user_id", sellerUserId);
        if (error) throw error;
        assert.ok(data?.some((r) => r.slug === clykurSlug), "clykur on seller desk");
      }),
    );

    results.push(
      await expectOk("listing_verification_snapshot (clykur)", async () => {
        const { data: row } = await sellerClient
          .from(T.companies)
          .select("id")
          .eq("slug", clykurSlug)
          .maybeSingle();
        const { data, error } = await sellerClient.rpc("listing_verification_snapshot", {
          p_startup_id: row.id,
        });
        if (error) throw error;
        assert.equal(data?.listing_lifecycle, "published");
        assert.equal(data?.gates?.business_email_status, "verified");
      }),
    );

    results.push(
      await expectOk("seller inbox (conversations + profiles join)", async () => {
        const profileId = await sellerProfileId(sellerClient, sellerUserId);
        assert.ok(profileId, "seller marketplace profile");
        const selectCols = `
          id, startup_id, created_at,
          startups(slug, title),
          buyer_profile:marketplace_profiles!conversations_buyer_profile_id_fkey(metadata),
          seller_profile:marketplace_profiles!conversations_seller_profile_id_fkey(metadata)
        `;
        const { error } = await sellerClient
          .from(T.conversations)
          .select(selectCols)
          .eq("seller_profile_id", profileId);
        if (error) throw error;
      }),
    );

    report(results);
  });

  it("seller verification desk: person profile + company intake", async () => {
    const results = [];

    results.push(
      await expectOk("get_or_create_person_verification_profile (seller)", async () => {
        const { data, error } = await sellerClient.rpc(
          "get_or_create_person_verification_profile",
          { p_desk_role: "seller" },
        );
        if (error) throw error;
        assert.equal(data.verification_status, "verified");
        assert.ok(data.verification_level >= 1);
      }),
    );

    results.push(
      await expectOk("founder_get_seller_intake (clykur)", async () => {
        const { data, error } = await sellerClient.rpc("founder_get_seller_intake", {
          p_slug: clykurSlug,
        });
        if (error) throw error;
        assert.ok(data);
      }),
    );

    results.push(
      await expectOk("listing_verification_timeline_public (clykur)", async () => {
        const { data, error } = await sellerClient.rpc(
          "listing_verification_timeline_public",
          { p_startup_slug: clykurSlug },
        );
        if (error) throw error;
        assert.ok(data?.slug === clykurSlug || data === null || data?.slug);
      }),
    );

    report(results);
  });

  it("buyer dashboard: listings, interests, bids, inbox, verification", async () => {
    const results = [];

    results.push(
      await expectOk("public marketplace listings (browse)", async () => {
        const { data, error } = await buyerClient
          .from(T.companies)
          .select("slug")
          .eq("visibility", "public")
          .eq("listing_lifecycle", "published")
          .eq("status", "published")
          .limit(5);
        if (error) throw error;
        assert.ok((data?.length ?? 0) > 0);
        assert.ok(data.some((r) => r.slug === clykurSlug));
      }),
    );

    results.push(
      await expectOk("buyer interests (startup_interests)", async () => {
        const profileId = await buyerProfileId(buyerClient, buyerUserId);
        if (!profileId) return;
        const { error } = await buyerClient
          .from(T.interests)
          .select("id, startup_id")
          .eq("buyer_profile_id", profileId)
          .limit(10);
        if (error) throw error;
      }),
    );

    results.push(
      await expectOk("buyer bids (bids)", async () => {
        const profileId = await buyerProfileId(buyerClient, buyerUserId);
        if (!profileId) return;
        const { error } = await buyerClient
          .from(T.offers)
          .select("id, status")
          .eq("buyer_profile_id", profileId)
          .limit(10);
        if (error) throw error;
      }),
    );

    results.push(
      await expectOk("buyer inbox conversations", async () => {
        const { data, error } = await buyerClient
          .from(T.conversations)
          .select("id")
          .limit(10);
        if (error) throw error;
        assert.ok(Array.isArray(data));
      }),
    );

    results.push(
      await expectOk("get_or_create_person_verification_profile (buyer)", async () => {
        const { data, error } = await buyerClient.rpc(
          "get_or_create_person_verification_profile",
          { p_desk_role: "buyer" },
        );
        if (error) throw error;
        assert.ok(["draft", "pending", "verified"].includes(data.verification_status));
      }),
    );

    results.push(
      await expectOk("buyer browse: public startup detail slug", async () => {
        const { data, error } = await buyerClient
          .from(T.companies)
          .select("slug, listing_lifecycle, visibility")
          .eq("slug", clykurSlug)
          .maybeSingle();
        if (error) throw error;
        assert.ok(data?.slug === clykurSlug);
      }),
    );

    report(results);
  });

  it("seller company workspace: integrations + trust snapshot", async () => {
    const results = [];
    const { data: startup } = await sellerClient
      .from(T.companies)
      .select("id")
      .eq("slug", clykurSlug)
      .maybeSingle();
    assert.ok(startup?.id);

    results.push(
      await expectOk("integration_connections (revenue gate)", async () => {
        const { error } = await sellerClient
          .from(T.integrations)
          .select("id, status, provider_id")
          .eq("startup_id", startup.id)
          .limit(5);
        if (error) throw error;
      }),
    );

    results.push(
      await expectOk("listing_verification_gates row", async () => {
        const { data, error } = await sellerClient
          .from(T.listingGates)
          .select("identity_status, domain_status, business_email_status, revenue_status")
          .eq("startup_id", startup.id)
          .maybeSingle();
        if (error) throw error;
        assert.equal(data?.revenue_status, "verified");
      }),
    );

    results.push(
      await expectOk("seller profile desk (marketplace_profiles)", async () => {
        const { data, error } = await sellerClient
          .from(T.accounts)
          .select("id, desk_role, metadata")
          .eq("auth_user_id", sellerUserId)
          .eq("desk_role", "seller");
        if (error) throw error;
        assert.ok(data?.length);
      }),
    );

    report(results);
  });

  it("QA draft company (ownerr-desk-qa): intake, snapshot, not public", async () => {
    const results = [];

    results.push(
      await expectOk("QA on founder desk", async () => {
        const { data, error } = await sellerClient
          .from(T.companies)
          .select("slug, listing_lifecycle, visibility")
          .eq("slug", QA_COMPANY_SLUG)
          .maybeSingle();
        if (error) throw error;
        assert.ok(data?.slug === QA_COMPANY_SLUG, "run npm run seed:marketplace-qa first");
        assert.notEqual(data.listing_lifecycle, "published");
      }),
    );

    results.push(
      await expectOk("QA listing_verification_snapshot", async () => {
        const { data: row } = await sellerClient
          .from(T.companies)
          .select("id")
          .eq("slug", QA_COMPANY_SLUG)
          .maybeSingle();
        const { data, error } = await sellerClient.rpc("listing_verification_snapshot", {
          p_startup_id: row.id,
        });
        if (error) throw error;
        assert.ok(data?.gates);
        assert.ok(
          ["draft", "verification_required", "verification_in_progress", "verification_failed"].includes(
            data.listing_lifecycle,
          ),
        );
      }),
    );

    results.push(
      await expectOk("QA founder_get_seller_intake", async () => {
        const { data, error } = await sellerClient.rpc("founder_get_seller_intake", {
          p_slug: QA_COMPANY_SLUG,
        });
        if (error) throw error;
        assert.ok(data);
        assert.equal(String(data.slug ?? ""), QA_COMPANY_SLUG);
      }),
    );

    results.push(
      await expectOk("QA not on public browse", async () => {
        const { data, error } = await buyerClient
          .from(T.companies)
          .select("slug")
          .eq("slug", QA_COMPANY_SLUG)
          .eq("visibility", "public")
          .eq("listing_lifecycle", "published")
          .maybeSingle();
        if (error) throw error;
        assert.equal(data, null);
      }),
    );

    report(results);
  });

  it("buyer verification submit (desk QA user)", async () => {
    const { data: before } = await buyerClient.rpc(
      "get_or_create_person_verification_profile",
      { p_desk_role: "buyer" },
    );
    if (before?.verification_status !== "verified") {
      await buyerClient.rpc("upsert_person_verification_profile", {
        p_desk_role: "buyer",
        p_payload: {
          full_name: "Desk QA Buyer",
          country_code: "US",
          linkedin_url: "https://linkedin.com/in/ownerr-desk-qa-buyer",
        },
      });
      const { error } = await buyerClient.rpc("submit_person_verification_profile", {
        p_desk_role: "buyer",
      });
      assert.ifError(error);
    }
    const { data: after, error: err2 } = await buyerClient.rpc(
      "get_or_create_person_verification_profile",
      { p_desk_role: "buyer" },
    );
    assert.ifError(err2);
    assert.equal(after.verification_status, "verified");
  });
});

function report(results) {
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.error(
      failed.map((f) => `  ✗ ${f.label}: ${f.error}`).join("\n"),
    );
  }
  assert.equal(failed.length, 0, `${failed.length} desk check(s) failed`);
}
