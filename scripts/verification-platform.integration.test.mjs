/**
 * Optional integration checks against a live Postgres (DATABASE_URL).
 * Skips when DATABASE_URL is unset — not a mock pass.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import pg from "pg";

const databaseUrl =
  process.env.DATABASE_URL_MIGRATE?.trim() ??
  process.env.DATABASE_URL?.trim() ??
  process.env.DATABASE_URL_POOLER?.trim();

describe("verification SQL (requires DATABASE_URL)", { skip: !databaseUrl }, () => {
  it("listing_fraud_blocks_publish blocks high risk only", async () => {
    const client = new pg.Client({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
    });
    await client.connect();
    try {
      const { rows } = await client.query(
        `SELECT
          public.listing_fraud_blocks_publish('high') AS high_blocks,
          public.listing_fraud_blocks_publish('medium') AS medium_blocks,
          public.listing_fraud_blocks_publish('clear') AS clear_blocks`,
      );
      assert.equal(rows[0].high_blocks, true);
      assert.equal(rows[0].medium_blocks, false);
      assert.equal(rows[0].clear_blocks, false);
    } finally {
      await client.end();
    }
  });

  it("confirm_business_email_verification rejects expired tokens", async () => {
    const client = new pg.Client({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
    });
    await client.connect();
    try {
      await assert.rejects(
        () =>
          client.query(`SELECT public.confirm_business_email_verification($1)`, [
            "0".repeat(64),
          ]),
        /Invalid or expired/i,
      );
    } finally {
      await client.end();
    }
  });
});
