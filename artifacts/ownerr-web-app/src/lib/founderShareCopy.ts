import type { FounderSubmissionRecord } from "./founderTypes";
import { buildReferralLink } from "./founderReferral";
import {
  getFounderSharePageUrl,
  getPublicShareOrigin,
} from "./founderShareUrls";

export type SharePlatform =
  | "linkedin"
  | "twitter"
  | "whatsapp"
  | "instagram"
  | "generic";

export function buildShareCaptions(record: FounderSubmissionRecord) {
  const link = buildReferralLink(getPublicShareOrigin(), record.referralCode);
  const generic = `Chance to Win $250k\nPosted My Idea Submission on Ownerr OS — ${record.startupName}\nMore reach starts here: ${link}`;
  const linkedin = `Chance to Win $250k\nPosted My Idea Submission on Ownerr OS\n\nI'm listing ${record.startupName} — ${record.tagline}\n\nTop 100 get $2,500 each in Founders Capital for what they're building. Join the list:\n${link}\n\n#startup #founder #OwnerrOS`;
  const twitter = `Listed on OWNERR OS — ${record.startupName}\n${record.tagline}\n\nChance to Win $250k — more reach here:\n${link}`;
  const whatsapp = `Hey! I just listed ${record.startupName} on OWNERR OS — thought you'd want in too:\n${link}`;
  const instagram = `Listed on OWNERR OS — ${record.startupName} — more reach, $250k pool. Link in story:\n${link}`;
  return { generic, linkedin, twitter, whatsapp, instagram };
}

export function captionForPlatform(
  record: FounderSubmissionRecord,
  platform: SharePlatform,
): string {
  const c = buildShareCaptions(record);
  if (platform === "linkedin") return c.linkedin;
  if (platform === "twitter") return c.twitter;
  if (platform === "whatsapp") return c.whatsapp;
  if (platform === "instagram") return c.instagram;
  return c.generic;
}

export function shareUrlForPlatform(
  record: FounderSubmissionRecord,
  platform: SharePlatform,
): string {
  const text = encodeURIComponent(captionForPlatform(record, platform));
  const sharePage = encodeURIComponent(getFounderSharePageUrl(record));
  if (platform === "linkedin") {
    return `https://www.linkedin.com/sharing/share-offsite/?url=${sharePage}`;
  }
  if (platform === "twitter") {
    return `https://twitter.com/intent/tweet?text=${text}&url=${sharePage}`;
  }
  if (platform === "whatsapp") {
    const body = `${captionForPlatform(record, "whatsapp")}\n\n${getFounderSharePageUrl(record)}`;
    return `https://wa.me/?text=${encodeURIComponent(body)}`;
  }
  return buildReferralLink(getPublicShareOrigin(), record.referralCode);
}
