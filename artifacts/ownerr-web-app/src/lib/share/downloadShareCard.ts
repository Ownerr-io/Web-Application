import {
  OWNERR_OS_SHARE_CARD_FILE_NAME,
  OWNERR_OS_SHARE_CARD_PATH,
} from "@/lib/ownerrOsShareAssets";
import { getShareCardPngBlob } from "@/lib/share/nativeShare";

/** Manual download only — never call from automatic share fallbacks. */
export async function downloadShareCard(): Promise<void> {
  const blob = await getShareCardPngBlob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = OWNERR_OS_SHARE_CARD_FILE_NAME.replace(/\.jpg$/i, ".png");
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
}

export function getShareCardPreviewPath(): string {
  return OWNERR_OS_SHARE_CARD_PATH;
}
