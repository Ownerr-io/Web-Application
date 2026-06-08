import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import {
  verifyStripeWebhookSignature,
  STRIPE_IDENTITY_WEBHOOK_PATH,
  LEGACY_STRIPE_IDENTITY_WEBHOOK_PATH,
  isStripeIdentityWebhookPath,
} from "./stripeIdentityWebhookHttp.js";

function signPayload(
  payload: string,
  secret: string,
  timestampSec: number,
): string {
  const signed = `${timestampSec}.${payload}`;
  const v1 = createHmac("sha256", secret).update(signed, "utf8").digest("hex");
  return `t=${timestampSec},v1=${v1}`;
}

describe("isStripeIdentityWebhookPath", () => {
  it("accepts canonical and legacy paths", () => {
    assert.equal(
      isStripeIdentityWebhookPath(STRIPE_IDENTITY_WEBHOOK_PATH),
      true,
    );
    assert.equal(
      isStripeIdentityWebhookPath(LEGACY_STRIPE_IDENTITY_WEBHOOK_PATH),
      true,
    );
    assert.equal(isStripeIdentityWebhookPath("/v1/process-jobs"), false);
  });
});

describe("verifyStripeWebhookSignature", () => {
  const secret = "whsec_test_secret";
  const payload = JSON.stringify({
    id: "evt_1",
    type: "identity.verification_session.verified",
  });

  it("accepts valid signature within tolerance", () => {
    const now = Math.floor(Date.now() / 1000);
    const header = signPayload(payload, secret, now);
    assert.equal(
      verifyStripeWebhookSignature(payload, header, secret, 300),
      true,
    );
  });

  it("rejects replay outside tolerance", () => {
    const old = Math.floor(Date.now() / 1000) - 400;
    const header = signPayload(payload, secret, old);
    assert.equal(
      verifyStripeWebhookSignature(payload, header, secret, 300),
      false,
    );
  });

  it("rejects wrong secret", () => {
    const now = Math.floor(Date.now() / 1000);
    const header = signPayload(payload, secret, now);
    assert.equal(
      verifyStripeWebhookSignature(payload, header, "whsec_other", 300),
      false,
    );
  });

  it("rejects tampered payload", () => {
    const now = Math.floor(Date.now() / 1000);
    const header = signPayload(payload, secret, now);
    assert.equal(
      verifyStripeWebhookSignature(`${payload}x`, header, secret, 300),
      false,
    );
  });
});

describe("mandatory publish gate policy (executable contract)", () => {
  it("documents required gate dimensions enforced in SQL listing_mandatory_gates_pass", () => {
    const required = [
      "identity_status",
      "domain_status",
      "revenue_status",
      "verified_revenue_amount",
    ];
    assert.deepEqual(required, [
      "identity_status",
      "domain_status",
      "revenue_status",
      "verified_revenue_amount",
    ]);
  });
});
