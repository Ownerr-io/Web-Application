import type { FounderSubmissionRecord } from "./founderTypes";
import {
  OWNERR_OS_SHARE_CARD_PATH,
  getOwnerrOsShareCardUrl,
  getPublicSiteOrigin,
} from "./ownerrOsShareAssets";

/** Origin used for absolute OG / share page URLs (must be public for LinkedIn crawler). */
export function getPublicShareOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return getPublicSiteOrigin();
}

/** Static OWNERR OS share card (JPEG in /public). */
export function getFounderCardImageUrl(_record?: FounderSubmissionRecord): string {
  return getOwnerrOsShareCardUrl();
}

export { OWNERR_OS_SHARE_CARD_PATH, getOwnerrOsShareCardUrl, getPublicSiteOrigin };

/** HTML share landing with OG tags — opens this page, not the raw image. */
export function getFounderSharePageUrl(record: FounderSubmissionRecord): string {
  const origin = getPublicShareOrigin();
  return `${origin}/share/founder/${encodeURIComponent(record.referralCode)}`;
}

/** @deprecated Use getFounderSharePageUrl */
export const getLinkedInSharePageUrl = getFounderSharePageUrl;
