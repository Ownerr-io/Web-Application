import type { VercelRequest, VercelResponse } from "@vercel/node";

/** No workspace imports — must not crash on cold start. */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }
  res.status(200).json({ ok: true });
}
