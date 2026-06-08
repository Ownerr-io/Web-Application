/** Strip protocol/path; lowercase — matches DB normalize_verification_domain. */
export function normalizeVerificationDomain(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^https?:\/\//i, "");
  s = s.split("/")[0] ?? s;
  s = s.replace(/\.$/, "");
  return s.toLowerCase();
}
