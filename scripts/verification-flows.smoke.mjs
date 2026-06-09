/**
 * Live verification flow smoke tests (Postgres + optional local sync worker HTTP).
 * Skips when DATABASE_URL is unset.
 * HTTP checks run only when /api/sync-worker/health responds (npm run dev on PORT, default 5173).
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { describe, it, before } from "node:test";
import pg from "pg";

const databaseUrl =
  process.env.DATABASE_URL_MIGRATE?.trim() ??
  process.env.DATABASE_URL?.trim() ??
  process.env.DATABASE_URL_POOLER?.trim();

const devPort = process.env.PORT?.trim() || "5173";
const workerBase =
  process.env.VERIFICATION_SMOKE_WORKER_URL?.trim() ??
  `http://127.0.0.1:${devPort}/api/sync-worker`;

const cronSecret = process.env.SYNC_WORKER_CRON_SECRET?.trim();

const CLYKUR_SLUG = "clykur-f6724fa7";

function pgClient() {
  return new pg.Client({
    connectionString: databaseUrl,
    ssl: databaseUrl?.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
  });
}

async function syncWorkerReachable() {
  try {
    const res = await fetch(`${workerBase.replace(/\/$/, "")}/health`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return false;
    const body = await res.json();
    return body?.ok === true;
  } catch {
    try {
      const direct = await fetch("http://127.0.0.1:8787/health", {
        signal: AbortSignal.timeout(1500),
      });
      if (!direct.ok) return false;
      const body = await direct.json();
      return body?.ok === true;
    } catch {
      return false;
    }
  }
}

describe("verification flows smoke (live)", { skip: !databaseUrl }, () => {
  let workerUp = false;

  before(async () => {
    workerUp = await syncWorkerReachable();
  });

  it("blocks government ID person verification RPC", async () => {
    const client = pgClient();
    await client.connect();
    try {
      await assert.rejects(
        () => client.query(`SELECT public.begin_person_identity_verification('seller', 'passport')`),
        /Government ID|not used/i,
      );
    } finally {
      await client.end();
    }
  });

  it("published listings always pass listing_mandatory_gates_pass", async () => {
    const client = pgClient();
    await client.connect();
    try {
      const { rows } = await client.query(`
        SELECT s.slug,
               public.listing_mandatory_gates_pass(s.id) AS gates_pass
        FROM public.marketplace_companies s
        WHERE s.listing_lifecycle = 'published'`);
      for (const row of rows) {
        assert.equal(
          row.gates_pass,
          true,
          `published listing ${row.slug} must pass mandatory gates`,
        );
      }
    } finally {
      await client.end();
    }
  });

  it("clykur fixture: founder person verified (gates may be open while in progress)", async () => {
    const client = pgClient();
    await client.connect();
    try {
      const { rows } = await client.query(
        `
        SELECT s.slug, s.listing_lifecycle,
               public.listing_mandatory_gates_pass(s.id) AS gates_pass,
               public.founder_person_verified_for_auth(s.founder_user_id) AS founder_person
        FROM public.marketplace_companies s
        WHERE s.slug = $1
        LIMIT 1`,
        [CLYKUR_SLUG],
      );
      assert.equal(rows.length, 1, `expected fixture company ${CLYKUR_SLUG}`);
      assert.equal(rows[0].founder_person, true);
      if (rows[0].listing_lifecycle === "published") {
        assert.equal(rows[0].gates_pass, true);
      }
    } finally {
      await client.end();
    }
  });

  it("business email: confirm token via SQL", async () => {
    const client = pgClient();
    await client.connect();
    let verificationId;
    try {
      const { rows: startups } = await client.query(
        `SELECT id FROM public.marketplace_companies WHERE slug = $1 LIMIT 1`,
        [CLYKUR_SLUG],
      );
      assert.ok(startups[0]?.id);
      const startupId = startups[0].id;

      verificationId = crypto.randomUUID();
      const emailToken = crypto.randomBytes(32).toString("hex");
      const emailHash = crypto.createHash("sha256").update(emailToken).digest("hex");

      await client.query(
        `INSERT INTO public.trust_business_email_verifications (
          id, startup_id, email, email_domain, status, verification_token_hash, token_expires_at
        ) VALUES ($1, $2, 'smoke-test@clykur.com', 'clykur.com', 'pending', $3, now() + interval '1 hour')`,
        [verificationId, startupId, emailHash],
      );

      const { rows: confirm } = await client.query(
        `SELECT public.confirm_business_email_verification($1) AS ok`,
        [emailToken],
      );
      const ok = confirm[0]?.ok;
      assert.equal(typeof ok === "object" && ok !== null ? ok.verified : ok, true);
    } finally {
      if (verificationId) {
        await client.query(
          `DELETE FROM public.trust_business_email_verifications WHERE id = $1`,
          [verificationId],
        );
      }
      await client.end();
    }
  });

  it("business email: send endpoint (launch + cron auth)", async (t) => {
    if (!workerUp) {
      t.skip(
        `sync worker not reachable at ${workerBase} — start npm run dev (PORT=${devPort})`,
      );
      return;
    }

    const client = pgClient();
    await client.connect();
    let verificationId;
    try {
      const { rows: startups } = await client.query(
        `SELECT id FROM public.marketplace_companies WHERE slug = $1 LIMIT 1`,
        [CLYKUR_SLUG],
      );
      assert.ok(startups[0]?.id);
      const startupId = startups[0].id;

      verificationId = crypto.randomUUID();
      const emailToken = crypto.randomBytes(32).toString("hex");
      const emailHash = crypto.createHash("sha256").update(emailToken).digest("hex");

      await client.query(
        `INSERT INTO public.trust_business_email_verifications (
          id, startup_id, email, email_domain, status, verification_token_hash, token_expires_at
        ) VALUES ($1, $2, 'smoke-test@clykur.com', 'clykur.com', 'pending', $3, now() + interval '1 hour')`,
        [verificationId, startupId, emailHash],
      );

      const launchPlain = crypto.randomBytes(32).toString("hex");
      const launchHash = crypto.createHash("sha256").update(launchPlain).digest("hex");
      await client.query(
        `INSERT INTO public.sys_business_email_launch_tokens (verification_id, token_hash, expires_at)
         VALUES ($1, $2, now() + interval '15 minutes')`,
        [verificationId, launchHash],
      );

      const launchRes = await fetch(
        `${workerBase.replace(/\/$/, "")}/v1/verification/send-business-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${launchPlain}`,
          },
          body: JSON.stringify({ verification_id: verificationId, token: emailToken }),
        },
      );
      const launchBody = await launchRes.json();
      assert.equal(launchRes.status, 200, JSON.stringify(launchBody));
      assert.ok(launchBody.dev_link || launchBody.sent_via_resend === true);

      if (cronSecret) {
        const cronRes = await fetch(
          `${workerBase.replace(/\/$/, "")}/v1/verification/send-business-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${cronSecret}`,
            },
            body: JSON.stringify({ verification_id: verificationId, token: emailToken }),
          },
        );
        assert.equal(cronRes.status, 200, await cronRes.text());
      }
    } finally {
      if (verificationId) {
        await client.query(
          `DELETE FROM public.trust_business_email_verifications WHERE id = $1`,
          [verificationId],
        );
      }
      await client.end();
    }
  });

  it("worker health via dev proxy or port 8787", async (t) => {
    if (!workerUp) {
      t.skip(
        `sync worker not reachable — npm run dev (inline /api/sync-worker) or npm run sync-worker:http`,
      );
      return;
    }
    const proxyHealth = await fetch(`${workerBase.replace(/\/$/, "")}/health`);
    if (proxyHealth.ok) {
      const body = await proxyHealth.json();
      assert.equal(body.ok, true);
      return;
    }
    const direct = await fetch("http://127.0.0.1:8787/health");
    assert.equal(direct.status, 200);
  });
});
