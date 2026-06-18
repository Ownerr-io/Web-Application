import { probeDomainVerification } from "../domainDnsIntelligence.js";
import type { ProviderAdapter, SyncContext, SyncResult } from "../types.js";

function domainDnsLog(message: string, data?: Record<string, unknown>): void {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.SYNC_WORKER_VERIFICATION_DEBUG !== "1"
  ) {
    return;
  }
  const tag = "[verification:domain-dns]";
  if (data) console.info(tag, message, data);
  else console.info(tag, message);
}

export const domainAdapter: ProviderAdapter = {
  slug: "domain",
  category: "domain",
  async sync(ctx: SyncContext): Promise<SyncResult> {
    const challengeId = ctx.jobPayload.challenge_id as string | undefined;
    const host = ctx.jobPayload.host as string | undefined;
    const expected = ctx.jobPayload.expected_record as string | undefined;
    const method = ctx.jobPayload.method as "txt" | "cname" | undefined;

    if (!challengeId || !host || !expected || !method) {
      domainDnsLog("Missing challenge fields", {
        challengeId: !!challengeId,
        host,
        expected,
        method,
      });
      return {
        recordsWritten: 0,
        connectionStatus: "error",
        healthStatus: "unhealthy",
        lastError: "domain job missing challenge fields",
      };
    }

    domainDnsLog("DNS lookup starting", { method, host, expected });

    const probe = await probeDomainVerification({
      host,
      expected,
      method,
    });

    domainDnsLog(probe.pass ? "DNS lookup passed" : "DNS lookup failed", {
      method,
      host: probe.host,
      pass: probe.pass,
      diagnostic: probe.diagnostic.status,
      evidence: probe.evidence,
    });

    return {
      recordsWritten: 1,
      verificationDimension: "domain",
      verificationStatus: probe.pass ? "pass" : "fail",
      verificationSummary: {
        host: probe.host,
        pass: probe.pass,
        diagnostic_status: probe.diagnostic.status,
      },
      connectionStatus: "connected",
      healthStatus: probe.pass ? "healthy" : "degraded",
      syncCursor: {
        challenge_id: challengeId,
        pass: probe.pass,
        evidence: probe.evidence,
        diagnostic: probe.diagnostic,
        entered_domain: ctx.jobPayload.domain as string | undefined,
      },
    };
  },
};
