import { OWNERR_NETWORK_SOCIAL } from "@/lib/ownerr-network/social";

export type OwnerrNetworkShareInput = {
  username: string;
  displayName?: string | null;
  headline?: string | null;
  referralLink: string;
  publicProfileUrl: string;
};

export type SharePayload = {
  title: string;
  text: string;
  profileUrl: string;
  referralUrl: string;
  /** Passed to `navigator.share({ url })` when file sharing is unavailable. */
  primaryUrl: string;
};

function firstName(
  displayName: string | null | undefined,
  username: string,
): string {
  const raw = displayName?.trim() || username;
  return raw.split(/\s+/)[0] || username;
}

export function buildOwnerrNetworkSharePayload(
  input: OwnerrNetworkShareInput,
): SharePayload {
  const name = input.displayName?.trim() || `@${input.username}`;
  const first = firstName(input.displayName, input.username);
  const tagline =
    input.headline?.trim() || "Not everyone has a job. Everyone has value.";

  const text = [
    "Join my network on OWNERR.",
    "",
    tagline,
    "",
    `I'm ${name} on Ownerr Network — get discovered, grow reputation, and earn platform credits (1 pt = ₹1).`,
    "",
    "Profile:",
    input.publicProfileUrl,
    "",
    "Join with my invite:",
    input.referralLink,
    "",
    "Follow OWNERR:",
    `LinkedIn: ${OWNERR_NETWORK_SOCIAL.linkedin}`,
    `Instagram: ${OWNERR_NETWORK_SOCIAL.instagram}`,
    `X: ${OWNERR_NETWORK_SOCIAL.x}`,
    "",
    "#OWNERR #OwnerrNetwork #founders",
    "",
    `— ${first}`,
  ].join("\n");

  return {
    title: `${first} invited you to Ownerr Network`,
    text,
    profileUrl: input.publicProfileUrl,
    referralUrl: input.referralLink,
    primaryUrl: input.referralLink,
  };
}
