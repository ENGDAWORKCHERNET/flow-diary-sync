import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * GET /api/vapid-public-key
 * Returns the VAPID public key so the client can subscribe to Web Push.
 * This key is safe to expose publicly.
 */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    return res.status(503).json({ error: "Push notifications not configured." });
  }
  res.setHeader("Cache-Control", "public, max-age=86400");
  return res.status(200).json({ publicKey: key });
}
