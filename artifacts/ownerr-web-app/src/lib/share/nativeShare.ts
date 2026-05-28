import { OWNERR_OS_SHARE_CARD_PATH } from "@/lib/ownerrOsShareAssets";
import type { SharePayload } from "@/lib/share/buildSharePayload";

export type NativeShareOutcome = "shared" | "fallback" | "cancelled";

let cachedPngBlob: Blob | null = null;
let pngLoadPromise: Promise<Blob> | null = null;

async function fetchShareCardBlob(): Promise<Blob> {
  const url = new URL(OWNERR_OS_SHARE_CARD_PATH, window.location.origin).href;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not load share card");
  return res.blob();
}

async function blobToPngBlob(source: Blob): Promise<Blob> {
  if (source.type === "image/png") return source;
  const bitmap = await createImageBitmap(source);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(bitmap, 0, 0);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PNG conversion failed"))),
        "image/png",
      );
    });
  } finally {
    bitmap.close();
  }
}

export async function getShareCardPngBlob(): Promise<Blob> {
  if (cachedPngBlob) return cachedPngBlob;
  if (!pngLoadPromise) {
    pngLoadPromise = fetchShareCardBlob()
      .then(blobToPngBlob)
      .then((png) => {
        cachedPngBlob = png;
        return png;
      });
  }
  return pngLoadPromise;
}

export async function getShareCardPngFile(): Promise<File> {
  const png = await getShareCardPngBlob();
  return new File([png], "ownerr-network-share.png", { type: "image/png" });
}

export function canUseNativeShare(): boolean {
  return (
    typeof navigator !== "undefined" && typeof navigator.share === "function"
  );
}

export async function canShareWithFiles(file: File): Promise<boolean> {
  if (!canUseNativeShare()) return false;
  const data: ShareData = { files: [file] };
  try {
    return navigator.canShare?.(data) ?? true;
  } catch {
    return false;
  }
}

export async function openNativeShare(
  payload: SharePayload,
): Promise<NativeShareOutcome> {
  if (!canUseNativeShare()) return "fallback";

  const file = await getShareCardPngFile();
  const withFiles: ShareData = {
    title: payload.title,
    text: payload.text,
    files: [file],
  };
  const textAndUrl: ShareData = {
    title: payload.title,
    text: payload.text,
    url: payload.primaryUrl,
  };
  const textOnly: ShareData = {
    title: payload.title,
    text: payload.text,
  };

  const attempts: ShareData[] = [];
  if (await canShareWithFiles(file)) attempts.push(withFiles);
  attempts.push(textAndUrl, textOnly);

  for (const data of attempts) {
    try {
      if (navigator.canShare && !navigator.canShare(data)) continue;
      await navigator.share(data);
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError")
        return "cancelled";
    }
  }

  return "fallback";
}
