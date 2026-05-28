import type { SharePayload } from "@/lib/share/buildSharePayload";

export type SharePlatformId = "whatsapp" | "x" | "linkedin" | "email";

export function buildWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function buildXShareUrl(text: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

export function buildLinkedInShareUrl(url: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}

export function buildEmailShareUrl(subject: string, body: string): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function openPlatformShare(
  platform: SharePlatformId,
  payload: SharePayload,
): void {
  const note =
    "\n\n(Attach the OWNERR share card image from your device if you downloaded it — image cannot be auto-attached on this platform.)";

  switch (platform) {
    case "whatsapp":
      window.open(
        buildWhatsAppShareUrl(payload.text),
        "_blank",
        "noopener,noreferrer",
      );
      break;
    case "x":
      window.open(
        buildXShareUrl(payload.text),
        "_blank",
        "noopener,noreferrer",
      );
      break;
    case "linkedin":
      window.open(
        buildLinkedInShareUrl(payload.referralUrl),
        "_blank",
        "noopener,noreferrer",
      );
      break;
    case "email":
      window.open(
        buildEmailShareUrl(payload.title, `${payload.text}${note}`),
        "_self",
      );
      break;
    default:
      break;
  }
}

export const SHARE_PLATFORM_OPTIONS: { id: SharePlatformId; label: string }[] =
  [
    { id: "whatsapp", label: "WhatsApp" },
    { id: "x", label: "X" },
    { id: "linkedin", label: "LinkedIn" },
    { id: "email", label: "Email" },
  ];
