import dns from "node:dns/promises";
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

function dnsNameNorm(name: string): string {
  return name.trim().replace(/\.$/, "").toLowerCase();
}

function cnameMatches(actual: string, expected: string): boolean {
  const a = dnsNameNorm(actual);
  const e = dnsNameNorm(expected);
  if (!e) return false;
  return a === e || a.endsWith(`.${e}`) || a.includes(e);
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

    let pass = false;
    const evidence: Record<string, unknown> = { method, host };

    const hostNorm = dnsNameNorm(host);
    evidence.host_queried = hostNorm;
    evidence.expected_record = expected;
    domainDnsLog("DNS lookup starting", { method, host: hostNorm, expected });

    try {
      if (method === "txt") {
        const records = await dns.resolveTxt(hostNorm);
        const perRecord = records.map((r) => r.join("").trim());
        const flat = perRecord.join(" ");
        const expectedNorm = expected.trim();
        pass = perRecord.some(
          (txt) =>
            txt === expectedNorm ||
            txt.includes(expectedNorm) ||
            txt.replace(/\s+/g, "") === expectedNorm.replace(/\s+/g, ""),
        );
        evidence.records = flat;
        evidence.per_record = perRecord;
        evidence.txt_match = pass;
      } else {
        let cnames: string[] = [];
        try {
          cnames = await dns.resolveCname(hostNorm);
        } catch (cnameErr) {
          const code =
            cnameErr && typeof cnameErr === "object" && "code" in cnameErr
              ? String((cnameErr as { code: string }).code)
              : "";
          if (code === "ENODATA" || code === "ENOTFOUND") {
            evidence.cnames = [];
          } else {
            throw cnameErr;
          }
        }
        pass = cnames.some((c) => cnameMatches(c, expected));
        evidence.cnames = cnames;
        evidence.expected = dnsNameNorm(expected);
        evidence.cname_match = pass;
      }
    } catch (e) {
      evidence.error = e instanceof Error ? e.message : String(e);
      pass = false;
    }

    domainDnsLog(pass ? "DNS lookup passed" : "DNS lookup failed", {
      method,
      host: hostNorm,
      pass,
      evidence,
    });

    return {
      recordsWritten: 1,
      verificationDimension: "domain",
      verificationStatus: pass ? "pass" : "fail",
      verificationSummary: { host, pass },
      connectionStatus: "connected",
      healthStatus: pass ? "healthy" : "degraded",
      syncCursor: { challenge_id: challengeId, pass, evidence },
    };
  },
};
